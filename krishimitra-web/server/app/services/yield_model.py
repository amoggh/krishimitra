"""District crop-yield predictions from the model trained by ml/train_yield.py."""
from __future__ import annotations

import json
from functools import lru_cache

import joblib
import numpy as np
import pandas as pd

from app.config import settings
from app.services.knowledge import districts

KG_HA_TO_QTL_ACRE = 1 / 100 / 2.47105
MODEL_SEASON = {"rabi": "rabi", "kharif": "kharif", "summer": "summer"}


@lru_cache
def _bundle() -> dict | None:
    path = settings.models_dir / "yield_model.joblib"
    return joblib.load(path) if path.exists() else None


@lru_cache
def metrics() -> dict:
    path = settings.models_dir / "yield_metrics.json"
    return json.loads(path.read_text(encoding="utf8")) if path.exists() else {}


def available() -> bool:
    return _bundle() is not None


def _season_for(crop_id: str, season: str) -> str:
    """Seasons the training data uses for each crop."""
    if crop_id == "sugarcane" or crop_id == "turmeric":
        return "annual" if crop_id == "sugarcane" else "kharif"
    return season


def predict(district: str, crop_ids: list[str], season: str) -> dict[str, dict]:
    """Typical district yield (qtl/acre) for each crop. Missing crops are simply absent."""
    b = _bundle()
    if not b:
        return {}
    model, crops_known = b["model"], set(metrics().get("crops", []))
    prof = districts()[district]
    rows, ids = [], []
    for cid in crop_ids:
        if cid not in crops_known:
            continue
        rows.append({"crop": cid, "season": _season_for(cid, season), "district": district, "zone": prof["zone"], "soil": prof["soil"],
                     "ph": prof["ph"], "n": prof["n"], "p": prof["p"], "k": prof["k"], "oc": prof["oc"], "annual": prof["annual"]})
        ids.append(cid)
    if not rows:
        return {}
    X = pd.DataFrame(rows)[b["cat"] + b["num"]]
    pred = np.exp(model.predict(X))
    w = b.get("blend_weight", 0)
    out = {}
    for cid, row, p in zip(ids, rows, pred):
        hist = b["history"].get(f"{cid}|{row['season']}|{district}")
        val = float(np.exp(w * np.log(hist) + (1 - w) * np.log(p))) if hist and w else float(p)
        out[cid] = {"qtl_per_acre": round(val * KG_HA_TO_QTL_ACRE, 2), "kg_per_ha": round(val), "district_history_kg_ha": round(hist) if hist else None}
    return out
