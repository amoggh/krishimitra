"""Live mandi prices from data.gov.in (AGMARKNET daily feed), cached, with a snapshot fallback."""
from __future__ import annotations

import re
import socket
import threading
import time
from datetime import datetime

import pandas as pd
import requests
import urllib3.util.connection as _conn

from app.config import HTTP_HEADERS, settings

_conn.allowed_gai_family = lambda: socket.AF_INET   # api.data.gov.in is IPv4-only
_session = requests.Session()

LIVE_RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070"   # "Current Daily Price of Various Commodities from Various Markets (Mandi)"
URL = f"https://api.data.gov.in/resource/{LIVE_RESOURCE}"

# AGMARKNET commodity names -> planner crop ids
CROP_PATTERNS = {
    "paddy": r"^paddy", "maize": r"^maize$", "ragi": r"^ragi", "jowar": r"^jowar", "chickpea": r"^bengal gram\(gram\)\(whole\)$",
    "tur": r"arhar|red gram", "greengram": r"^green gram ?\(moong\)\(whole\)$", "groundnut": r"^groundnut$", "sunflower": r"^sunflower",
    "cotton": r"^cotton$", "onion": r"^onion$", "tomato": r"^tomato$", "turmeric": r"^turmeric$",
}

_lock = threading.Lock()
_cache: dict[str, tuple[float, dict]] = {}


def crop_for(commodity: str) -> str | None:
    c = commodity.strip().lower()
    for cid, pat in CROP_PATTERNS.items():
        if re.search(pat, c):
            return cid
    return None


def _fetch_all(state: str) -> list[dict]:
    rows, offset, page = [], 0, 1000
    while True:
        params = {"api-key": settings.data_gov_api_key, "format": "json", "limit": page, "offset": offset, "filters[state.keyword]": state}
        r = _session.get(URL, params=params, headers=HTTP_HEADERS, timeout=15)
        r.raise_for_status()
        recs = r.json().get("records", [])
        rows += recs
        total = int(r.json().get("total") or 0)
        offset += len(recs)
        if not recs or offset >= total or offset >= 5000:
            break
    return rows


def live(state: str = "Karnataka") -> dict:
    """Today's arrivals for a state. Never raises: falls back to the bundled snapshot."""
    key = state.lower()
    with _lock:
        hit = _cache.get(key)
        if hit and time.time() - hit[0] < settings.live_cache_seconds:
            return hit[1]
    try:
        recs = _fetch_all(state)
        rows = [{"commodity": x["commodity"], "variety": x.get("variety"), "market": x["market"], "district": x["district"],
                 "date": x.get("arrival_date"), "min": float(x["min_price"]), "max": float(x["max_price"]), "modal": float(x["modal_price"]),
                 "crop": crop_for(x["commodity"])} for x in recs if float(x.get("modal_price") or 0) > 0]
        out = {"source": "live", "state": state, "fetchedAt": datetime.now().isoformat(timespec="seconds"), "rows": rows,
               "date": max((r["date"] for r in rows), key=_date_key, default=None), "keyType": "own" if settings.has_own_data_gov_key else "public demo key"}
    except Exception as e:  # network down, key rejected, quota exceeded...
        out = snapshot(state)
        out["error"] = f"Live feed unavailable ({type(e).__name__}). Showing the saved snapshot."
    with _lock:
        _cache[key] = (time.time(), out)
    return out


def _date_key(d: str | None) -> tuple:
    try:
        return tuple(reversed([int(x) for x in d.split("/")]))
    except Exception:
        return (0,)


def snapshot(state: str) -> dict:
    df = pd.read_csv(settings.data_dir / "agmarknet_snapshot.csv")
    df.columns = ["state", "district", "market", "commodity", "variety", "grade", "date", "min", "max", "modal"]
    df = df[(df.state == state) & (df.modal > 0)]
    rows = [{"commodity": r.commodity, "variety": r.variety, "market": r.market, "district": r.district, "date": r.date,
             "min": float(r["min"]), "max": float(r["max"]), "modal": float(r.modal), "crop": crop_for(r.commodity)} for _, r in df.iterrows()]
    return {"source": "snapshot", "state": state, "fetchedAt": None, "rows": rows, "date": rows[0]["date"] if rows else None}


def latest_crop_prices(state: str = "Karnataka") -> dict[str, dict]:
    """Median modal price per planner crop in today's feed."""
    data = live(state)
    df = pd.DataFrame(data["rows"])
    if df.empty or "crop" not in df:
        return {}
    df = df.dropna(subset=["crop"])
    return {cid: {"modal": float(g.modal.median()), "n": int(len(g)), "date": data["date"], "source": data["source"]} for cid, g in df.groupby("crop")}
