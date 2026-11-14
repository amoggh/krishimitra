"""Harvest-time price forecasts from the model trained by ml/train_price.py on real AGMARKNET history."""
from __future__ import annotations

import json
from datetime import date
from functools import lru_cache

import joblib
import numpy as np
import pandas as pd

from app.config import settings
from app.services import mandi
from app.services.knowledge import MONTHS


@lru_cache
def _bundle() -> dict | None:
    p = settings.models_dir / "price_model.joblib"
    return joblib.load(p) if p.exists() else None


@lru_cache
def metrics() -> dict:
    p = settings.models_dir / "price_metrics.json"
    return json.loads(p.read_text(encoding="utf8")) if p.exists() else {}


@lru_cache
def history() -> pd.DataFrame:
    p = settings.data_dir / "price_monthly.csv"
    return pd.read_csv(p) if p.exists() else pd.DataFrame(columns=["crop", "month", "modal", "n"])


def status() -> dict:
    m = metrics()
    return {"trained": bool(_bundle()), "crops": m.get("crops_used", []), "model": m.get("model"), "backtest": m.get("backtest_overall")}


def series_for(crop: str) -> pd.Series:
    h = history()
    s = h[h.crop == crop].set_index("month").modal.sort_index()
    s.index = pd.PeriodIndex(s.index, freq="M")
    s = s.reindex(pd.period_range(s.index.min(), s.index.max(), freq="M")).interpolate(limit=2)
    return s.dropna()


def forecast(crop: str, months_ahead: int = 9) -> dict | None:
    b = _bundle()
    if not b or crop not in b["crops"]:
        return None
    from app.services.price_features import FEATURES, METHOD_LABELS, METHODS, h_group, make_dict
    s = series_for(crop)
    if len(s) < 13:
        return None
    last = s.index.max()
    p0 = float(s.iloc[-1])
    max_h = max(b["horizon_error"].get(crop, b["horizon_error_all"]).keys(), default=9)
    out = []
    for h in range(1, months_ahead + 1):
        hh = min(h, int(max_h))                       # beyond the trained horizon, reuse the last one's method and band
        x = make_dict(b["seasonal"], b["crops"], crop, s, h)
        ml = float(b["model"].predict(pd.DataFrame([x])[FEATURES])[0])
        g = h_group(hh)
        method = b["pick"].get(crop, {}).get(g, "no_change")
        logc = METHODS[method](x, ml)
        lo_r, hi_r = b["band"].get(crop, {}).get(g, [-.2, .2])
        mid = p0 * float(np.exp(logc))
        out.append({"month": str(last + h), "label": f"{MONTHS[(last + h).month - 1]} {(last + h).year}", "mid": mid,
                    "lo": min(mid, mid * float(np.exp(lo_r))), "hi": max(mid, mid * float(np.exp(hi_r))),
                    "method": method, "methodLabel": METHOD_LABELS[method], "mlMid": p0 * float(np.exp(ml))})
    err = b["horizon_error"].get(crop, b["horizon_error_all"])
    return {"crop": crop, "lastMonth": str(last), "lastPrice": p0,
            "history": [{"month": str(p), "label": f"{MONTHS[p.month - 1]} {p.year}", "modal": float(v)} for p, v in s.iloc[-36:].items()],
            "forecast": out, "errorByHorizon": err, "model": metrics().get("model"),
            "methods": b["pick"].get(crop, {}), "bandCoverage": metrics().get("band_coverage_10_90")}


def seasonality() -> dict:
    """Real monthly price index per crop (median of price / centred 12-month mean), from AGMARKNET history."""
    b = _bundle()
    return {"source": "AGMARKNET history" if b else None, "index": b["seasonal"] if b else {}, "months": metrics().get("months_by_crop", {})}


def price_at_harvest(crop: dict, harvest_m0: int) -> dict:
    """Expected Karnataka modal price for a crop in its harvest month, with the best source available."""
    cid = crop["id"]
    f = forecast(cid, 12) if cid != "sugarcane" else None
    if f:
        target = next((x for x in f["forecast"] if pd.Period(x["month"]).month - 1 == harvest_m0), None)
        if target:
            h = min(f["forecast"].index(target) + 1, 9)
            mape = f["errorByHorizon"].get(str(h)) or f["errorByHorizon"].get(h) or 20
            return {"expected": target["mid"], "sigma": max(.06, mape / 100 * 1.25), "source": "forecast",
                    "label": f"ML forecast for {target['label']} (backtest error {round(mape)}%)", "month": target["label"]}
    if cid == "sugarcane":
        return {"expected": crop["msp"], "sigma": .03, "source": "frp", "label": f"Government FRP ₹{crop['msp']}/q", "month": MONTHS[harvest_m0]}
    live = mandi.latest_crop_prices().get(cid)
    if live and live["n"] >= 2:
        return {"expected": live["modal"], "sigma": crop["pVol"], "source": live["source"],
                "label": f"Karnataka mandi median today ({live['n']} markets)", "month": MONTHS[harvest_m0]}
    return {"expected": crop["price"], "sigma": crop["pVol"], "source": "curated", "label": "Curated reference price", "month": MONTHS[harvest_m0]}
