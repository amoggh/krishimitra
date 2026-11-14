"""
Train the district crop-yield model on real Karnataka production statistics.

Data
  * ICRISAT District Level Database, Karnataka, 2011-2017 (district x crop yield, kg/ha)
  * Karnataka crop production 2021-22 (district x crop x season, kg/ha)
Features
  crop, season, district, and the district's soil/climate profile (zone, soil type, pH, N, P, K,
  organic carbon, normal annual rainfall). Year is deliberately NOT a feature: with only 2011-2017
  and 2021 it made the model chase single-season weather noise (2017 holdout R2 fell to 0.46).
Target
  log(yield in kg/ha). Rice from ICRISAT is milled rice, converted to paddy (x1.5).

Prediction = blend of the model and the district's own recorded median for that crop/season.
The blend weight is tuned on a 2016 holdout (train <= 2015) and then reported on 2017.

Validation (written to models/yield_metrics.json)
  1. Time split: train on 2011-2016, test on 2017 (model, blend, and baselines).
  2. Unseen-district split: GroupKFold by district (no district history, so the model alone).

Usage (from server/):  python ml/train_yield.py
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SHARED = ROOT.parent / "shared"
OUT = ROOT / "models"

DISTRICTS = json.loads((SHARED / "districts.json").read_text(encoding="utf8"))
CROPS = {c["id"]: c for c in json.loads((SHARED / "crops.json").read_text(encoding="utf8"))}

# --- name harmonisation -----------------------------------------------------
def norm_district(name: str) -> str | None:
    s = re.sub(r"[^a-z]", "", str(name).lower())
    table = {
        "bangalore": "Bengaluru Urban", "bengalururural": "Bengaluru Rural", "bengaluruurban": "Bengaluru Urban", "bengalururban": "Bengaluru Urban",
        "mysore": "Mysuru", "mysuru": "Mysuru", "shimoge": "Shimoga", "shivamogga": "Shimoga", "chickmagalur": "Chikkamagaluru", "chikmagalur": "Chikkamagaluru",
        "bellary": "Ballari", "ballari": "Ballari", "belgaum": "Belagavi", "belagavi": "Belagavi", "bijapurvijayapura": "Vijayapura", "vijayapura": "Vijayapura",
        "tumkur": "Tumakuru", "tumakuru": "Tumakuru", "kodagucoorg": "Kodagu", "kodagu": "Kodagu", "chickballapur": "Chikkaballapur",
        "ramanagaram": "Ramanagara", "bagalkote": "Bagalkote", "dakshinakannada": "Dakshina Kannada", "uttarakannada": "Uttara Kannada",
    }
    if s in table:
        return table[s]
    for d in DISTRICTS:
        if re.sub(r"[^a-z]", "", d.lower()) == s:
            return d
    return None  # districts without a soil profile (e.g. Bidar, Raichur) are left out


ICRISAT_CROPS = {  # column prefix -> (crop id, season, factor to convert to our unit)
    "RICE": ("paddy", "kharif", 1.5), "KHARIF SORGHUM": ("jowar", "kharif", 1), "RABI SORGHUM": ("jowar", "rabi", 1),
    "MAIZE": ("maize", "kharif", 1), "FINGER MILLET": ("ragi", "kharif", 1), "CHICKPEA": ("chickpea", "rabi", 1),
    "PIGEONPEA": ("tur", "kharif", 1), "GROUNDNUT": ("groundnut", "kharif", 1), "SUNFLOWER": ("sunflower", "kharif", 1),
    "SUGARCANE": ("sugarcane", "annual", 1),
}
APY_CROPS = {"Paddy": "paddy", "Jowar": "jowar", "Maize": "maize", "Ragi": "ragi", "Bengalgram": "chickpea", "Tur": "tur",
             "Groundnut": "groundnut", "Sunflower": "sunflower", "Greengram": "greengram", "Onion": "onion", "Tomato": "tomato",
             "Sugarcane Harvested": "sugarcane", "Turmericprocessed": "turmeric"}


def load_rows() -> pd.DataFrame:
    rows = []
    ic = pd.read_csv(DATA / "icrisat_district_yield.csv")
    for _, r in ic.iterrows():
        d = norm_district(r["Dist Name"])
        if not d:
            continue
        for col, (crop, season, f) in ICRISAT_CROPS.items():
            y, a = r.get(f"{col} YIELD (Kg per ha)"), r.get(f"{col} AREA (1000 ha)")
            if pd.notna(y) and pd.notna(a) and y > 0 and a >= 0.5:      # at least 500 ha grown
                rows.append(dict(source="ICRISAT", year=int(r["Year"]), district=d, crop=crop, season=season, yield_kg_ha=float(y) * f, area_ha=float(a) * 1000))
    apy = pd.read_csv(DATA / "karnataka_apy_2021_22.csv")
    for _, r in apy.iterrows():
        crop, d = APY_CROPS.get(r["Crop"]), norm_district(r["District"])
        if not crop or not d or r["Area_Hectares"] < 100 or r["Yield_Kg_Hectare"] <= 0:
            continue
        season = str(r["Season"]).lower()
        season = "annual" if season in ("annual", "whole year") else season
        rows.append(dict(source="APY 2021-22", year=2021, district=d, crop=crop, season=season, yield_kg_ha=float(r["Yield_Kg_Hectare"]), area_ha=float(r["Area_Hectares"])))
    df = pd.DataFrame(rows)
    # Area-weighted merge of duplicate district spellings in the APY file.
    df = (df.assign(w=df.yield_kg_ha * df.area_ha)
            .groupby(["source", "year", "district", "crop", "season"], as_index=False)
            .agg(w=("w", "sum"), area_ha=("area_ha", "sum")))
    df["yield_kg_ha"] = df.w / df.area_ha
    return df.drop(columns="w")


PROFILE = ["zone", "soil", "ph", "n", "p", "k", "oc", "annual"]
CAT = ["crop", "season", "district", "zone", "soil"]
NUM = ["ph", "n", "p", "k", "oc", "annual"]


def features(df: pd.DataFrame) -> pd.DataFrame:
    prof = pd.DataFrame([{**{k: v[k] for k in PROFILE}, "district": n} for n, v in DISTRICTS.items()])
    return df.merge(prof, on="district", how="left")


def make_model() -> Pipeline:
    pre = ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CAT)], remainder="passthrough")
    reg = RandomForestRegressor(n_estimators=400, min_samples_leaf=3, random_state=7, n_jobs=-1)
    return Pipeline([("pre", pre), ("reg", reg)])


def score(y_true, y_pred) -> dict:
    y_true, y_pred = np.asarray(y_true), np.asarray(y_pred)
    ape = np.abs(y_pred - y_true) / y_true
    ss = ((np.log(y_true) - np.log(y_pred)) ** 2).sum() / ((np.log(y_true) - np.log(y_true).mean()) ** 2).sum()
    return {"mape_pct": round(float(np.median(ape) * 100), 1), "mean_ape_pct": round(float(ape.mean() * 100), 1), "r2_log": round(float(1 - ss), 3), "n": int(len(y_true))}


def main():
    df = features(load_rows())
    X, y = df[CAT + NUM], np.log(df.yield_kg_ha)
    metrics = {"trained_at": datetime.now().isoformat(timespec="seconds"), "rows": int(len(df)), "districts": int(df.district.nunique()),
               "crops": sorted(df.crop.unique().tolist()), "sources": df.source.value_counts().to_dict(), "model": "RandomForestRegressor on log(kg/ha), blended with district history"}

    def history(train: pd.DataFrame) -> pd.Series:
        return train.groupby(["crop", "season", "district"]).yield_kg_ha.median()

    def blend(model_pred, rows, hist, w):
        h = np.array([hist.get((c, se, d), np.nan) for c, se, d in zip(rows.crop, rows.season, rows.district)])
        return np.where(np.isnan(h), model_pred, np.exp(w * np.log(np.where(np.isnan(h), 1, h)) + (1 - w) * np.log(model_pred)))

    # tune the blend weight on 2016 (train <= 2015) so 2017 stays untouched
    t_tr, t_va = df.year <= 2015, df.year == 2016
    mv = np.exp(make_model().fit(X[t_tr], y[t_tr]).predict(X[t_va]))
    hv = history(df[t_tr])
    weights = [round(w, 1) for w in np.arange(0, 1.01, .1)]
    tune = {w: score(df[t_va].yield_kg_ha, blend(mv, df[t_va], hv, w))["mape_pct"] for w in weights}
    W = min(tune, key=tune.get)
    metrics["blend_weight_on_history"] = W
    metrics["blend_tuning_2016_mape"] = tune

    # 1) time split
    tr, te = df.year <= 2016, df.year == 2017
    m = make_model().fit(X[tr], y[tr])
    pred = np.exp(m.predict(X[te]))
    base_crop = df[tr].groupby("crop").yield_kg_ha.median()
    base_cd = df[tr].groupby(["crop", "district"]).yield_kg_ha.median()
    b1 = df[te].crop.map(base_crop)
    b2 = pd.Series([base_cd.get((c, d), base_crop.get(c)) for c, d in zip(df[te].crop, df[te].district)], index=df[te].index)
    metrics["time_split_2017"] = {"model_only": score(df[te].yield_kg_ha, pred), "model_blended_with_history": score(df[te].yield_kg_ha, blend(pred, df[te], history(df[tr]), W)),
                                  "baseline_crop_median": score(df[te].yield_kg_ha, b1), "baseline_crop_district_median": score(df[te].yield_kg_ha, b2)}

    # 2) unseen districts
    preds, base = np.zeros(len(df)), np.zeros(len(df))
    for a, b in GroupKFold(n_splits=5).split(X, y, df.district):
        preds[b] = np.exp(make_model().fit(X.iloc[a], y.iloc[a]).predict(X.iloc[b]))
        base[b] = df.iloc[b].crop.map(df.iloc[a].groupby("crop").yield_kg_ha.median()).fillna(df.iloc[a].yield_kg_ha.median()).values
    metrics["unseen_district_cv"] = {"model": score(df.yield_kg_ha, preds), "baseline_crop_median": score(df.yield_kg_ha, base)}

    # final model on everything
    final = make_model().fit(X, y)
    OUT.mkdir(exist_ok=True)
    hist_all = history(df)
    joblib.dump({"model": final, "cat": CAT, "num": NUM, "blend_weight": W,
                 "history": {f"{c}|{se}|{d}": float(v) for (c, se, d), v in hist_all.items()}}, OUT / "yield_model.joblib")
    (OUT / "yield_metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf8")
    df.to_csv(DATA / "yield_training_rows.csv", index=False)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    sys.exit(main())
