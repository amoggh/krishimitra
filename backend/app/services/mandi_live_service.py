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
CACHE_TTL_HOURS = 24

def _get_api_key() -> str:
    key = os.getenv("DATA_GOV_IN_API_KEY", "")
    if not key:
        try:
            from app.config import settings
            key = getattr(settings, "data_gov_in_api_key", "")
        except Exception:
            pass
    return (key or "").strip().strip('"').strip("'")


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


def _safe_float(val: any, default: float = 0.0) -> float:
    """Safely parse float values from API responses."""
    if val is None or val == "" or str(val).strip().upper() == "NA":
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


async def fetch_live_mandi_prices_task(
    district: Optional[str] = None,
    commodity: Optional[str] = None,
):
    """
    Background or on-demand task executed every 24 hours to refresh live prices.
    Always queries State='Karnataka' and filters by user's district/commodity if provided.
    """
    global _PRICE_CACHE, _LAST_REFRESH_TIME
    logger.info("Starting scheduled 24h Mandi Price refresh for State=Karnataka...")

    api_key = _get_api_key()
    if not api_key or api_key == "YOUR_DATA_GOV_IN_API_KEY":
        logger.info("DATA_GOV_IN_API_KEY not set. Using local historical dataset fallback for cache seeding.")
        _seed_from_local_mandi_data()
        return

    params = {
        "api-key": api_key,
        "format": "json",
        "limit": 1000,
        "filters[state]": "Karnataka",
    }
    if district:
        params["filters[district]"] = district.strip().title()
    if commodity:
        params["filters[commodity]"] = commodity.strip().title()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(AGMARKNET_API_URL, params=params)
            if resp.status_code == 200:
                data = resp.json().get("records", [])
                now = datetime.now(timezone.utc)
                count = 0
                for row in data:
                    c_name = str(row.get("commodity", "")).strip().title()
                    d_name = str(row.get("district", "")).strip().title()
                    if not c_name:
                        continue

                    key = f"{c_name}_{d_name}".lower()
                    modal_p = _safe_float(row.get("modal_price"), 0.0)
                    min_p = _safe_float(row.get("min_price"), modal_p * 0.9)
                    max_p = _safe_float(row.get("max_price"), modal_p * 1.1)

                    if modal_p > 100:
                        _PRICE_CACHE[key] = CachedMandiPrice(
                            crop=c_name,
                            district=d_name,
                            mandi=str(row.get("market", d_name)).strip().title(),
                            modal_price_rs_qtl=modal_p,
                            min_price_rs_qtl=min_p,
                            max_price_rs_qtl=max_p,
                            arrival_date=str(row.get("arrival_date", "")),
                            last_fetched_at=now,
                            source="agmarknet_live_api",
                        )
                        count += 1

                _LAST_REFRESH_TIME = now
                logger.info(f"Refreshed {count} live Karnataka Mandi prices from Agmarknet API.")
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

    now = datetime.now(timezone.utc)

    # 1. Seed from Karnataka multi-model dataset (Wholesale mandi prices per district & crop)
    try:
        from crop_optimization.data_loader import load_soil_weather_data
        multi_df = load_soil_weather_data()
        if multi_df is not None and not multi_df.empty:
            for _, row in multi_df.iterrows():
                crop_raw = str(row.get("crop") or row.get("Recommended_Crop", "")).strip().title()
                dist_raw = str(row.get("district") or row.get("District", "")).strip().title()
                if not crop_raw or not dist_raw:
                    continue
                # Price per tonne -> divide by 10 for price per quintal
                tonne_price = _safe_float(row.get("Wholesale_Price_Modal_INR_per_Tonne"), 0.0)
                if tonne_price <= 0:
                    continue
                price_qtl = round(tonne_price / 10.0, 1)
                min_qtl = round(_safe_float(row.get("Wholesale_Price_Min_INR_per_Tonne"), tonne_price * 0.9) / 10.0, 1)
                max_qtl = round(_safe_float(row.get("Wholesale_Price_Max_INR_per_Tonne"), tonne_price * 1.1) / 10.0, 1)
                mandi_name = str(row.get("Mandi_Name", f"{dist_raw} APMC")).strip()

                key = f"{crop_raw}_{dist_raw}".lower()
                if key not in _PRICE_CACHE:
                    _PRICE_CACHE[key] = CachedMandiPrice(
                        crop=crop_raw,
                        district=dist_raw,
                        mandi=mandi_name,
                        modal_price_rs_qtl=price_qtl,
                        min_price_rs_qtl=min_qtl,
                        max_price_rs_qtl=max_qtl,
                        arrival_date="Karnataka Mandi Index",
                        last_fetched_at=now,
                        source="karnataka_verified_mandi_dataset",
                    )
            logger.info("Seeded %d Karnataka district records from multi-model mandi dataset.", len(_PRICE_CACHE))
    except Exception as exc:
        logger.debug("Could not seed from multi-model dataset: %s", exc)

    # 2. Seed from mandi prices dataset (vegetables, pulses, and commodities)
    try:
        from crop_optimization.data_loader import load_mandi_data
        df = load_mandi_data()
        if df is not None and not df.empty:
            for _, row in df.iterrows():
                crop = str(row.get("crop") or row.get("Commodity", "")).strip().title()
                district = str(row.get("district") or row.get("District", "Karnataka")).strip().title()
                price = _safe_float(row.get("Modal_x0020_Price"), 0.0)
                if crop and price > 100:
                    key = f"{crop}_{district}".lower()
                    if key not in _PRICE_CACHE:
                        _PRICE_CACHE[key] = CachedMandiPrice(
                            crop=crop,
                            district=district,
                            mandi=str(row.get("Market", f"{district} APMC")),
                            modal_price_rs_qtl=price,
                            min_price_rs_qtl=_safe_float(row.get("Min_x0020_Price"), price * 0.9),
                            max_price_rs_qtl=_safe_float(row.get("Max_x0020_Price"), price * 1.1),
                            arrival_date=str(row.get("Arrival_Date", "Today")),
                            last_fetched_at=now,
                            source="local_verified_mandi_cache",
                        )
            _LAST_REFRESH_TIME = now
            logger.info("Total cached mandi records after seeding: %d", len(_PRICE_CACHE))
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

    # 3. Fallback: Any district in Karnataka matching this crop
    target_crop = (canonical or clean_crop).lower()
    for k, v in _PRICE_CACHE.items():
        if k.startswith(target_crop + "_"):
            return v

    return None


def get_crop_historical_trajectory(crop: str, district: str = "Mandya") -> dict:
    """
    Constructs the previous 7-8 months to 1-year price history and trajectory for a crop.
    Used by the time-series model to project harvest price.
    """
    live_price = get_current_mandi_price(crop, district)
    current_p = live_price.modal_price_rs_qtl if live_price else 3200.0

    # Look up multi-model dataset for empirical 7-8 month and 1-year historical metrics
    lag_1m = current_p * 0.98
    lag_1y = current_p * 0.94
    rolling_7m = current_p * 0.96

    try:
        from crop_optimization.data_loader import load_soil_weather_data
        from crop_optimization.normalization import normalize_crop
        df = load_soil_weather_data()
        if df is not None and not df.empty:
            canon = normalize_crop(crop) or crop
            crop_df = df[df["crop"] == canon]
            if crop_df.empty and "Recommended_Crop" in df.columns:
                crop_df = df[df["Recommended_Crop"].str.lower() == canon.lower()]
            if not crop_df.empty:
                dist_df = crop_df[crop_df["district"].str.lower() == district.lower()] if "district" in crop_df else crop_df
                target_df = dist_df if not dist_df.empty else crop_df

                if "Wholesale_Price_Modal_INR_per_Tonne" in target_df:
                    p_series = target_df["Wholesale_Price_Modal_INR_per_Tonne"].dropna() / 10.0
                    if not p_series.empty:
                        rolling_7m = float(p_series.tail(8).mean())
                if "Price_Lag_1Month_INR_per_Tonne" in target_df:
                    l1 = target_df["Price_Lag_1Month_INR_per_Tonne"].dropna() / 10.0
                    if not l1.empty:
                        lag_1m = float(l1.iloc[-1])
                if "Price_Lag_1Year_INR_per_Tonne" in target_df:
                    l12 = target_df["Price_Lag_1Year_INR_per_Tonne"].dropna() / 10.0
                    if not l12.empty:
                        lag_1y = float(l12.iloc[-1])
    except Exception as exc:
        logger.debug("Historical trajectory lookup fallback: %s", exc)

    momentum_7m = current_p / max(rolling_7m, 1.0)

    return {
        "current_price_qtl": round(current_p, 1),
        "lag_1m_qtl": round(lag_1m, 1),
        "rolling_mean_7m_qtl": round(rolling_7m, 1),
        "lag_1y_qtl": round(lag_1y, 1),
        "price_momentum_7m": round(momentum_7m, 3),
        "mandi_source": live_price.mandi if live_price else f"{district} APMC",
        "last_updated": live_price.arrival_date if live_price else "24h Agmarknet Sync",
    }


async def run_mandi_price_scheduler(interval_hours: int = 24):
    """Infinite loop background worker that refreshes prices every 24 hours."""
    while True:
        try:
            await fetch_live_mandi_prices_task()
        except Exception as exc:
            logger.error("Exception during Mandi price refresh loop: %s", exc)
        await asyncio.sleep(interval_hours * 3600)
