from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from pydantic import BaseModel

logger = logging.getLogger(__name__)

AGMARKNET_API_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
def _get_api_key() -> str:
    key = os.getenv("DATA_GOV_IN_API_KEY", "")
    if not key:
        try:
            from app.config import settings
            key = getattr(settings, "data_gov_in_api_key", "")
        except Exception:
            pass
    return key


class CachedMandiPrice(BaseModel):
    crop: str
    district: str
    mandi: str
    modal_price_rs_qtl: float
    min_price_rs_qtl: float
    max_price_rs_qtl: float
    arrival_date: str
    last_fetched_at: datetime
    source: str = "agmarknet_live_api"

# In-memory fast cache (or swap with SQLite / Redis)
_PRICE_CACHE: dict[str, CachedMandiPrice] = {}
_LAST_REFRESH_TIME: datetime | None = None
CACHE_TTL_HOURS = 6


def _safe_float(val: any, default: float = 0.0) -> float:
    """Safely parse float values from API responses."""
    if val is None or val == "" or str(val).strip().upper() == "NA":
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


async def fetch_live_mandi_prices_task():
    """Background task executed every 6-8 hours to refresh live prices."""
    global _PRICE_CACHE, _LAST_REFRESH_TIME
    logger.info("Starting scheduled 6-8h Mandi Price refresh...")

    api_key = _get_api_key()
    if not api_key or api_key == "YOUR_DATA_GOV_IN_API_KEY":
        logger.info("DATA_GOV_IN_API_KEY not set. Using local mandi dataset fallback for cache seeding.")
        _seed_from_local_mandi_data()
        return

    params = {
        "api-key": api_key,
        "format": "json",
        "limit": 1000,
        "filters[state]": "Karnataka",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(AGMARKNET_API_URL, params=params)
            if resp.status_code == 200:
                data = resp.json().get("records", [])
                now = datetime.now(timezone.utc)
                count = 0
                for row in data:
                    commodity = str(row.get("commodity", "")).strip().title()
                    district = str(row.get("district", "")).strip().title()
                    if not commodity:
                        continue

                    key = f"{commodity}_{district}".lower()
                    modal_p = _safe_float(row.get("modal_price"), 0.0)
                    min_p = _safe_float(row.get("min_price"), modal_p * 0.9)
                    max_p = _safe_float(row.get("max_price"), modal_p * 1.1)

                    if modal_p > 100:
                        _PRICE_CACHE[key] = CachedMandiPrice(
                            crop=commodity,
                            district=district,
                            mandi=str(row.get("market", district)).strip().title(),
                            modal_price_rs_qtl=modal_p,
                            min_price_rs_qtl=min_p,
                            max_price_rs_qtl=max_p,
                            arrival_date=str(row.get("arrival_date", "")),
                            last_fetched_at=now,
                            source="agmarknet_live_api",
                        )
                        count += 1

                _LAST_REFRESH_TIME = now
                logger.info(f"Refreshed {count} live Mandi prices from Agmarknet API.")
            else:
                logger.warning("Agmarknet API returned status %s. Falling back to cached data.", resp.status_code)
                _seed_from_local_mandi_data()
    except Exception as exc:
        logger.error(f"Failed to fetch live Mandi prices: {exc}. Retaining cache.")
        _seed_from_local_mandi_data()


def _seed_from_local_mandi_data():
    """Populates cache from local CSV data if live fetch is unavailable."""
    global _PRICE_CACHE, _LAST_REFRESH_TIME
    if _PRICE_CACHE:
        return  # Cache already has entries

    try:
        from crop_optimization.data_loader import load_mandi_data
        df = load_mandi_data()
        if df is not None and not df.empty:
            now = datetime.now(timezone.utc)
            for _, row in df.iterrows():
                crop = str(row.get("crop", "")).strip().title()
                district = str(row.get("district", "Karnataka")).strip().title()
                price = _safe_float(row.get("Modal_x0020_Price"), 0.0)
                if crop and price > 100:
                    key = f"{crop}_{district}".lower()
                    if key not in _PRICE_CACHE:
                        _PRICE_CACHE[key] = CachedMandiPrice(
                            crop=crop,
                            district=district,
                            mandi=str(row.get("Market", district)),
                            modal_price_rs_qtl=price,
                            min_price_rs_qtl=_safe_float(row.get("Min_x0020_Price"), price * 0.9),
                            max_price_rs_qtl=_safe_float(row.get("Max_x0020_Price"), price * 1.1),
                            arrival_date=str(row.get("Arrival_Date", "")),
                            last_fetched_at=now,
                            source="local_verified_mandi_cache",
                        )
            _LAST_REFRESH_TIME = now
            logger.info("Seeded %d mandi records from local dataset into cache.", len(_PRICE_CACHE))
    except Exception as exc:
        logger.debug("Could not seed from local mandi data: %s", exc)


def get_current_mandi_price(crop: str, district: str = "Mandya") -> Optional[CachedMandiPrice]:
    """
    Retrieve the current price per quintal for a given crop and district.
    Falls back to state-level matching if the exact district isn't found.
    """
    clean_crop = crop.strip().lower()
    clean_dist = district.strip().lower()

    # 1. Exact match crop_district
    key = f"{clean_crop}_{clean_dist}"
    if key in _PRICE_CACHE:
        return _PRICE_CACHE[key]

    # 2. Match canonical crop name
    try:
        from crop_optimization.normalization import normalize_crop
        canonical = normalize_crop(crop)
        if canonical:
            c_key = f"{canonical.lower()}_{clean_dist}"
            if c_key in _PRICE_CACHE:
                return _PRICE_CACHE[c_key]
    except Exception:
        canonical = None

    # 3. Fallback: Any district matching this crop
    target_crop = (canonical or clean_crop).lower()
    for k, v in _PRICE_CACHE.items():
        if k.startswith(target_crop + "_"):
            return v

    return None


async def run_mandi_price_scheduler(interval_hours: int = 6):
    """Infinite loop background worker that refreshes prices every 6-8 hours."""
    while True:
        try:
            await fetch_live_mandi_prices_task()
        except Exception as exc:
            logger.error("Exception during Mandi price refresh loop: %s", exc)
        await asyncio.sleep(interval_hours * 3600)
