"""
data_pipeline/live_mandi.py — Daily Agmarknet mandi price ingestion, history and volatility.

Source: data.gov.in "Current Daily Price of Various Commodities from Various Markets (Mandi)"
        (Agmarknet), resource 9ef84268-d588-465a-a308-a864a43d0070.
        Requires a free API key from https://data.gov.in (set DATA_GOV_IN_API_KEY).

The API only returns *today's* prices, so history is built by running `fetch`
once a day (Task Scheduler / cron) and storing every snapshot in SQLite.

Provides:
  - fetch_daily_prices()       : pull today's Karnataka prices from the API
  - MandiStore                 : SQLite history (data/mandi_history.sqlite), idempotent upserts
  - price_volatility_index()   : PVI = std-dev of daily log price changes (%), 7- and 30-day windows
  - price_alerts()             : drop below 80% of expected harvest price, or a 90-day high
  - history_stats()            : median / P10 / P90 over a window, used by the price model

Usage (from backend/):
    python -m crop_optimization.data_pipeline.live_mandi fetch            # needs DATA_GOV_IN_API_KEY
    python -m crop_optimization.data_pipeline.live_mandi import-csv       # seed from data/mandi prices data.csv
    python -m crop_optimization.data_pipeline.live_mandi report --crop Onion
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import os
import sqlite3
import urllib.parse
import urllib.request
from contextlib import closing
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from crop_optimization.config import (
    DATA_DIR,
    MANDI_HISTORY_DB,
    MANDI_PRICES_CSV,
    PRICE_DROP_ALERT_FRACTION,
)
from crop_optimization.normalization import normalize_crop, normalize_district

logger = logging.getLogger(__name__)

API_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
API_KEY_ENV = "DATA_GOV_IN_API_KEY"
PAGE_SIZE = 1000
DEFAULT_STATE = "Karnataka"

SCHEMA = """
CREATE TABLE IF NOT EXISTS mandi_prices (
    arrival_date TEXT NOT NULL,      -- ISO yyyy-mm-dd
    state        TEXT NOT NULL,
    district     TEXT,
    market       TEXT NOT NULL,
    commodity    TEXT NOT NULL,
    crop         TEXT,               -- canonical crop name
    variety      TEXT NOT NULL DEFAULT '',
    grade        TEXT NOT NULL DEFAULT '',
    min_price    REAL,
    max_price    REAL,
    modal_price  REAL,
    fetched_at   TEXT NOT NULL,
    PRIMARY KEY (arrival_date, state, market, commodity, variety, grade)
);
CREATE INDEX IF NOT EXISTS idx_mandi_crop_date ON mandi_prices (crop, arrival_date);
"""


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------

def _parse_date(value: str) -> Optional[str]:
    """Agmarknet dates are dd/mm/yyyy; return ISO yyyy-mm-dd."""
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(str(value).strip(), fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _to_float(value) -> Optional[float]:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    return v if v > 0 else None


def normalize_record(rec: dict) -> Optional[dict]:
    """Map an API/CSV record (any key casing) to a mandi_prices row."""
    get = {k.lower().replace("_x0020_", "_"): v for k, v in rec.items()}.get
    arrival = _parse_date(get("arrival_date", ""))
    commodity = str(get("commodity", "") or "").strip()
    market = str(get("market", "") or "").strip()
    if not arrival or not commodity or not market:
        return None
    district = str(get("district", "") or "").strip()
    return {
        "arrival_date": arrival,
        "state": str(get("state", "") or "").strip(),
        "district": normalize_district(district) or district,
        "market": market,
        "commodity": commodity,
        "crop": normalize_crop(commodity),
        "variety": str(get("variety", "") or "").strip(),
        "grade": str(get("grade", "") or "").strip(),
        "min_price": _to_float(get("min_price")),
        "max_price": _to_float(get("max_price")),
        "modal_price": _to_float(get("modal_price")),
    }


def fetch_daily_prices(api_key: str, state: str = DEFAULT_STATE, timeout: int = 60) -> list[dict]:
    """Fetch all of today's records for a state from the data.gov.in API (paginated)."""
    records: list[dict] = []
    offset = 0
    while True:
        params = {
            "api-key": api_key,
            "format": "json",
            "limit": PAGE_SIZE,
            "offset": offset,
            "filters[state.keyword]": state,
        }
        url = f"{API_URL}?{urllib.parse.urlencode(params)}"
        with urllib.request.urlopen(url, timeout=timeout) as resp:  # noqa: S310 (fixed https URL)
            payload = json.loads(resp.read().decode("utf-8"))
        batch = payload.get("records", [])
        records.extend(batch)
        total = int(payload.get("total", len(records)) or 0)
        offset += len(batch)
        if not batch or offset >= total:
            break
    logger.info("Fetched %d mandi records for %s.", len(records), state)
    return records


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------

class MandiStore:
    """SQLite-backed mandi price history."""

    def __init__(self, path: Optional[Path] = None):
        self.path = Path(path) if path else DATA_DIR / MANDI_HISTORY_DB
        with closing(sqlite3.connect(self.path)) as conn:
            conn.executescript(SCHEMA)

    def upsert(self, raw_records: list[dict]) -> int:
        rows = [r for r in (normalize_record(x) for x in raw_records) if r]
        now = datetime.now().isoformat(timespec="seconds")
        with closing(sqlite3.connect(self.path)) as conn, conn:
            conn.executemany(
                """INSERT OR REPLACE INTO mandi_prices
                   (arrival_date, state, district, market, commodity, crop, variety, grade,
                    min_price, max_price, modal_price, fetched_at)
                   VALUES (:arrival_date, :state, :district, :market, :commodity, :crop, :variety, :grade,
                           :min_price, :max_price, :modal_price, :fetched_at)""",
                [{**r, "fetched_at": now} for r in rows],
            )
        return len(rows)

    def daily_series(self, crop: str, state: str = DEFAULT_STATE, days: Optional[int] = None,
                     today: Optional[date] = None) -> pd.Series:
        """Median modal price across markets for each arrival date (INR/quintal)."""
        query = "SELECT arrival_date, modal_price FROM mandi_prices WHERE crop = ? AND state = ? AND modal_price > 0"
        params: list = [crop, state]
        if days is not None:
            since = ((today or date.today()) - timedelta(days=days)).isoformat()
            query += " AND arrival_date >= ?"
            params.append(since)
        with closing(sqlite3.connect(self.path)) as conn:
            df = pd.read_sql_query(query, conn, params=params)
        if df.empty:
            return pd.Series(dtype=float)
        return df.groupby("arrival_date")["modal_price"].median().sort_index()

    def records(self, crop: str, state: str = DEFAULT_STATE, days: Optional[int] = None,
                today: Optional[date] = None) -> pd.DataFrame:
        query = "SELECT * FROM mandi_prices WHERE crop = ? AND state = ? AND modal_price > 0"
        params: list = [crop, state]
        if days is not None:
            params.append(((today or date.today()) - timedelta(days=days)).isoformat())
            query += " AND arrival_date >= ?"
        with closing(sqlite3.connect(self.path)) as conn:
            return pd.read_sql_query(query, conn, params=params)

    def latest_date(self, crop: str, state: str = DEFAULT_STATE) -> Optional[date]:
        with closing(sqlite3.connect(self.path)) as conn:
            row = conn.execute(
                "SELECT MAX(arrival_date) FROM mandi_prices WHERE crop = ? AND state = ?", (crop, state)
            ).fetchone()
        return date.fromisoformat(row[0]) if row and row[0] else None


_DEFAULT_STORE: Optional[MandiStore] = None


def get_store() -> Optional[MandiStore]:
    """Shared store, or None when no history database has been created yet."""
    global _DEFAULT_STORE
    if _DEFAULT_STORE is None:
        path = DATA_DIR / MANDI_HISTORY_DB
        if not path.exists():
            return None
        _DEFAULT_STORE = MandiStore(path)
    return _DEFAULT_STORE


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

def price_volatility_index(series: pd.Series, window_days: int) -> Optional[float]:
    """
    PVI (%) = standard deviation of daily log price changes over the last `window_days`
    observations. Needs at least 5 price days; returns None otherwise.
    """
    s = series.dropna()
    s = s[s > 0].tail(window_days + 1)
    if len(s) < 5:
        return None
    returns = np.diff(np.log(s.values))
    return round(float(np.std(returns, ddof=1)) * 100, 2)


def history_stats(store: MandiStore, crop: str, days: int = 90,
                  today: Optional[date] = None) -> Optional[dict]:
    """Price distribution over the window: median / P10 / P90 of modal prices across markets & days."""
    recs = store.records(crop, days=days, today=today)
    if recs.empty:
        return None
    modal = recs["modal_price"].astype(float)
    return {
        "median": float(modal.median()),
        "p10": float(modal.quantile(0.10)),
        "p90": float(modal.quantile(0.90)),
        "n_records": int(len(modal)),
        "n_days": int(recs["arrival_date"].nunique()),
        "latest_date": recs["arrival_date"].max(),
    }


def price_alerts(store: MandiStore, crop: str, expected_price: Optional[float] = None,
                 today: Optional[date] = None) -> list[dict]:
    """
    Alerts for a crop:
      - "price_drop": latest daily price < PRICE_DROP_ALERT_FRACTION × expected harvest price
      - "high_90d"  : latest daily price is the highest of the last 90 days
    """
    series = store.daily_series(crop, days=90, today=today)
    if series.empty:
        return []
    latest_date, latest = series.index[-1], float(series.iloc[-1])
    alerts: list[dict] = []
    if expected_price and latest < PRICE_DROP_ALERT_FRACTION * expected_price:
        alerts.append({
            "type": "price_drop", "crop": crop, "date": latest_date, "price": latest,
            "message": (f"{crop} mandi price (Rs {latest:,.0f}/q) is below "
                        f"{PRICE_DROP_ALERT_FRACTION:.0%} of the expected harvest price (Rs {expected_price:,.0f}/q)."),
        })
    if len(series) >= 5 and latest >= float(series.max()):
        alerts.append({
            "type": "high_90d", "crop": crop, "date": latest_date, "price": latest,
            "message": f"{crop} mandi price (Rs {latest:,.0f}/q) is at a 90-day high.",
        })
    return alerts


def volatility_report(store: MandiStore, crop: str, today: Optional[date] = None) -> dict:
    series = store.daily_series(crop, today=today)
    return {
        "crop": crop,
        "price_days": int(len(series)),
        "latest_date": series.index[-1] if len(series) else None,
        "latest_price": float(series.iloc[-1]) if len(series) else None,
        "pvi_7d": price_volatility_index(series, 7),
        "pvi_30d": price_volatility_index(series, 30),
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    parser = argparse.ArgumentParser(description="Agmarknet mandi price ingestion")
    sub = parser.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("fetch", help=f"Fetch today's prices (needs {API_KEY_ENV})")
    f.add_argument("--state", default=DEFAULT_STATE)
    i = sub.add_parser("import-csv", help="Seed history from a mandi CSV snapshot")
    i.add_argument("--csv", type=Path, default=DATA_DIR / MANDI_PRICES_CSV)
    r = sub.add_parser("report", help="Volatility and alerts for a crop")
    r.add_argument("--crop", required=True)
    args = parser.parse_args()

    store = MandiStore()
    if args.cmd == "fetch":
        key = os.environ.get(API_KEY_ENV)
        if not key:
            parser.error(f"Set {API_KEY_ENV} to your data.gov.in API key.")
        n = store.upsert(fetch_daily_prices(key, state=args.state))
        logger.info("Stored %d records in %s", n, store.path)
    elif args.cmd == "import-csv":
        raw = pd.read_csv(args.csv).to_dict("records")
        n = store.upsert(raw)
        logger.info("Imported %d records from %s into %s", n, args.csv, store.path)
    else:
        crop = normalize_crop(args.crop) or args.crop
        print(json.dumps({**volatility_report(store, crop), "alerts": price_alerts(store, crop)},
                         indent=2, default=str))


if __name__ == "__main__":
    main()
