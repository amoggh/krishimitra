"""
Download the FULL Karnataka mandi price history from data.gov.in (AGMARKNET resource
"Variety-wise Daily Market Prices Data of Commodity") and build a monthly series per crop.

With your own DATA_GOV_API_KEY the API returns 1,000 rows per call, so instead of sampling a few
days per month we page through every record for each commodity: every market, every trading day,
back to 2006 (about 800,000 rows, roughly 15 minutes).

Usage (from server/):
    python ml/fetch_price_history.py            # resumes from cache
Env:
    DATA_GOV_API_KEY   your key (required: the public demo key returns only 10 rows per call)
"""
from __future__ import annotations

import json
import shutil
import socket
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import pandas as pd
import requests
import urllib3.util.connection as _conn

_conn.allowed_gai_family = lambda: socket.AF_INET   # the API only has an IPv4 address; skip slow IPv6 attempts
_local = threading.local()

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.config import HTTP_HEADERS, settings  # noqa: E402

RESOURCE = "35985678-0d79-46b4-9ed6-6f13308a1d24"
URL = f"https://api.data.gov.in/resource/{RESOURCE}"
CACHE = ROOT / "data" / "price_full_cache.jsonl"
OUT_RAW = ROOT / "data" / "price_history_raw.csv.gz"
OUT_MONTHLY = ROOT / "data" / "price_monthly.csv"
PAGE = 1000
WORKERS = 6

# AGMARKNET has renamed some commodities over the years, so each crop lists every name it has used.
COMMODITIES = {
    "paddy": ["Paddy(Dhan)(Common)", "Paddy(Common)"],
    "maize": ["Maize"],
    "ragi": ["Ragi (Finger Millet)", "Ragi(Finger Millet)"],
    "jowar": ["Jowar(Sorghum)"],
    "chickpea": ["Bengal Gram(Gram)(Whole)"],
    "tur": ["Arhar (Tur/Red Gram)(Whole)", "Red gram/Arhar/Tur(whole)"],
    "greengram": ["Green Gram (Moong)(Whole)", "Green Gram(Moong)(Whole)"],
    "groundnut": ["Groundnut"],
    "sunflower": ["Sunflower", "Sunflower/Sunflower Seed"],
    "cotton": ["Cotton"],
    "onion": ["Onion"],
    "tomato": ["Tomato"],
    "turmeric": ["Turmeric"],
}


def _session() -> requests.Session:
    """One kept-alive connection per worker thread: about 20x faster than a fresh TLS handshake per call."""
    if not hasattr(_local, "s"):
        _local.s = requests.Session()
        _local.s.headers.update(HTTP_HEADERS)
    return _local.s


def _short(e: Exception) -> str:
    if isinstance(e, requests.HTTPError) and e.response is not None:
        body = (e.response.text or "").strip().replace("\n", " ")[:120]
        return f"HTTP {e.response.status_code} {body}".strip()
    if isinstance(e, requests.Timeout):
        return "timeout (server slow or throttling)"
    if isinstance(e, requests.ConnectionError):
        return "connection error (network or server down)"
    return f"{type(e).__name__}: {str(e)[:120]}"


def get_page(name: str, offset: int, limit: int = PAGE):
    """Returns (total, rows, None) or (None, None, last_error) after 5 attempts."""
    params = {"api-key": settings.data_gov_api_key, "format": "json", "limit": limit, "offset": offset,
              "filters[State]": "Karnataka", "filters[Commodity]": name}
    err = None
    for attempt in range(5):
        try:
            r = _session().get(URL, params=params, timeout=(6, 40))
            if r.status_code == 429:
                err = "HTTP 429 rate limited"
                time.sleep(3 * (attempt + 1)); continue
            r.raise_for_status()
            j = r.json()
            rows = [[x.get("Arrival_Date"), x.get("Market"), x.get("District"), x.get("Variety"), x.get("Modal_Price")]
                    for x in j.get("records", [])]
            return int(j.get("total") or 0), rows, None
        except Exception as e:
            err = _short(e)
            _local.__dict__.pop("s", None)   # drop a broken connection
            time.sleep(1.5 * (attempt + 1))
    return None, None, err


def load_cache() -> dict:
    """{(name, offset): rows} plus totals under key (name, None)."""
    done = {}
    if CACHE.exists():
        for line in CACHE.read_text(encoding="utf8").splitlines():
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue   # a line cut off by Ctrl+C
            done[(r["name"], r["offset"])] = r["rows"]
            done[(r["name"], None)] = r["total"]
    return done


SPIN = "|/-\\"


def _bar(done, total, width=28):
    f = int(width * done / max(total, 1))
    return "#" * f + "-" * (width - f)


def _fmt(sec):
    if sec is None or sec != sec or sec == float("inf"):
        return "--:--"
    m, s = divmod(int(sec), 60)
    h, m = divmod(m, 60)
    return f"{h}h{m:02d}m" if h else f"{m:02d}:{s:02d}"


def main():
    if not settings.has_own_data_gov_key:
        sys.exit("DATA_GOV_API_KEY is not set in server/.env. The public demo key returns 10 rows per call, which is too slow for full history.")
    cache = load_cache()
    names = [(crop, n) for crop, ns in COMMODITIES.items() for n in ns]

    # 1. How many records does each commodity have? (one small call each; cached)
    print("Counting records per commodity ...")
    totals = {}
    for crop, n in names:
        if (n, None) in cache:
            totals[n] = cache[(n, None)]
        else:
            t, _, err = get_page(n, 0, 1)
            if t is None:
                sys.exit(f"FAILED on {n}: {err}\nCheck your DATA_GOV_API_KEY and internet, then run again; progress so far is kept.")
            totals[n] = t
        print(f"  {crop:10s} {n:32s} {totals[n]:>8,} rows")
    grand = sum(totals.values())
    todo = [(n, off) for _, n in names for off in range(0, totals[n], PAGE) if (n, off) not in cache]
    have = sum(len(v) for k, v in cache.items() if k[1] is not None)
    print(f"{grand:,} rows in total, {have:,} already downloaded, {len(todo)} pages of {PAGE} to fetch.\n")

    ok = failed = rows_got = 0
    errors: dict[str, int] = {}
    last_err = ""
    t0 = time.time()
    lock = threading.Lock()
    stop = threading.Event()
    done_n = [0]

    def status():
        n = done_n[0]
        el = time.time() - t0
        rate = n / el if el > 0 else 0
        eta = (len(todo) - n) / rate if rate > 0 else None
        line = (f"{SPIN[int(el * 4) % 4]} [{_bar(n, len(todo))}] {n}/{len(todo)} pages "
                f"{100 * n / max(len(todo), 1):5.1f}%  rows {rows_got:,}  failed {failed}  "
                f"{rate * PAGE:5.0f} rows/s  ETA {_fmt(eta)}  elapsed {_fmt(el)}")
        if last_err:
            line += f"  last error: {last_err[:50]}"
        width = shutil.get_terminal_size((120, 20)).columns - 1   # keep it on one line so a carriage return can redraw it
        sys.stdout.write(chr(13) + line[:width].ljust(width))
        sys.stdout.flush()

    def ticker():   # keeps the spinner moving even while every worker is waiting on the server
        while not stop.wait(0.25):
            with lock:
                status()

    if todo:
        threading.Thread(target=ticker, daemon=True).start()
        try:
            with CACHE.open("a", encoding="utf8") as fh, ThreadPoolExecutor(max_workers=WORKERS) as pool:
                futs = {pool.submit(get_page, n, off): (n, off) for n, off in todo}
                for f in as_completed(futs):
                    n, off = futs[f]
                    total, rows, err = f.result()
                    with lock:
                        done_n[0] += 1
                        if rows is None:
                            failed += 1
                            errors[err] = errors.get(err, 0) + 1
                            last_err = f"{n[:18]} @{off}: {err}"
                        else:
                            fh.write(json.dumps({"name": n, "offset": off, "total": total, "rows": rows}) + "\n")
                            fh.flush()
                            cache[(n, off)] = rows
                            ok += 1
                            rows_got += len(rows)
        except KeyboardInterrupt:
            stop.set()
            print(f"\n\nStopped. {ok} pages saved; run again to resume.")
            sys.exit(130)
        stop.set()
        status()
        print(f"\n\nDone in {_fmt(time.time() - t0)}: {ok} pages saved ({rows_got:,} rows), {failed} failed.")
    if errors:
        print("Failures by reason:")
        for e, c in sorted(errors.items(), key=lambda x: -x[1]):
            print(f"  {c:5d}  {e}")
        print("Failed pages are retried automatically next time you run this script.")

    # 2. Build the monthly series.
    print("\nBuilding the monthly price series ...")
    crop_of = {n: crop for crop, n in names}
    recs = []
    for (n, off), rows in cache.items():
        if off is None:
            continue
        for d, market, district, variety, modal in rows:
            recs.append((crop_of.get(n), n, d, market, district, variety, modal))
    raw = pd.DataFrame(recs, columns=["crop", "commodity", "date", "market", "district", "variety", "modal"])
    raw["modal"] = pd.to_numeric(raw.modal, errors="coerce")
    raw["date"] = pd.to_datetime(raw.date, format="%d/%m/%Y", errors="coerce")
    raw = raw.dropna(subset=["crop", "date", "modal"])
    raw = raw[raw.modal > 0]
    before = len(raw)
    raw = raw.drop_duplicates(["commodity", "date", "market", "variety", "modal"])
    print(f"  {before:,} usable rows, {before - len(raw):,} duplicates removed")
    raw["month"] = raw.date.dt.strftime("%Y-%m")
    # Drop obvious entry errors (wrong unit, extra zero): outside 0.2x-5x of that crop's median that month.
    med = raw.groupby(["crop", "month"]).modal.transform("median")
    raw = raw[(raw.modal >= 0.2 * med) & (raw.modal <= 5 * med)]
    raw.drop(columns="month").to_csv(OUT_RAW, index=False, compression="gzip")
    monthly = (raw.groupby(["crop", "month"])
                  .agg(modal=("modal", "median"), n=("modal", "size"), markets=("market", "nunique"), days=("date", "nunique"))
                  .reset_index())
    monthly.to_csv(OUT_MONTHLY, index=False)
    print(f"Wrote {OUT_MONTHLY.name}. Months per crop (the price model needs 36+):")
    print(monthly.groupby("crop").agg(months=("month", "size"), first=("month", "min"), last=("month", "max"),
                                      rows=("n", "sum"), markets_per_month=("markets", "median")).to_string())


if __name__ == "__main__":
    main()
