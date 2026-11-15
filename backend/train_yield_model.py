"""
train_yield_model.py — Train the crop yield model with split conformal intervals.

Uses REAL district-level yield records only:
  - ICRISAT-District Level Data - yield.csv          (2011–2017, 17 crops, 19 districts)
  - karnataka_crop_production_2021_22_yield.csv      (2021-22, district × season)

The synthetic multi-model dataset is deliberately excluded: its yields show no
relationship with rainfall, and its years are not real seasons.

Splits are grouped by YEAR, never random — a random split puts the same
district × crop in train and test and inflates accuracy.

  Evaluation run (honest out-of-time metrics):
      train 2011–2015  →  calibrate 2016–2017  →  test 2021-22

  Deployed model:
      train 2011–2017  →  calibrate 2021-22 (most recent season)

Features: crop, district. No weather features are used yet — the previous model
fed constant rainfall/temperature at prediction time. Real rainfall comes with
the IMD ingestion task.

Usage:
    python train_yield_model.py
"""

import json
import logging
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

ARTIFACTS_DIR = Path(__file__).parent / "artifacts" / "yield_model"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

FEATURES = ["crop", "district"]
TARGET = "yield_t_per_ha"

# Crops whose units disagree between sources — excluded rather than mixed.
EXCLUDED_CROPS = {
    "Sugarcane": "Unit mismatch: ICRISAT median ~8.5 t/ha vs 2021-22 median ~0.10 t/ha; "
                 "agronomic cane yields are ~80-100 t/ha, so neither source is usable as-is.",
}


def build_real_yield_records() -> pd.DataFrame:
    """Long-format table: crop, district, year, yield_t_per_ha (real records only)."""
    from crop_optimization.data_loader import load_icrisat_data, load_karnataka_2021_data
    from crop_optimization.yield_model.model import ICRISAT_YIELD_COLUMN_MAP

    frames = []

    icrisat = load_icrisat_data()
    if icrisat is not None and not icrisat.empty:
        for crop, col in ICRISAT_YIELD_COLUMN_MAP.items():
            if col not in icrisat.columns:
                continue
            part = icrisat[["district", "Year", col]].copy()
            part[TARGET] = pd.to_numeric(part[col], errors="coerce") / 1000.0  # kg/ha → t/ha
            part["crop"] = crop
            part = part.rename(columns={"Year": "year"})[["crop", "district", "year", TARGET]]
            frames.append(part)

    k21 = load_karnataka_2021_data()
    if k21 is not None and not k21.empty:
        part = k21[["crop", "district", "yield_t_ha"]].rename(columns={"yield_t_ha": TARGET})
        part["year"] = 2021
        frames.append(part)

    df = pd.concat(frames, ignore_index=True)
    df = df.dropna(subset=["crop", "district", TARGET])
    df = df[(df[TARGET] > 0) & ~df["crop"].isin(EXCLUDED_CROPS)].copy()
    df["year"] = df["year"].astype(int)
    return df


def make_model():
    from sklearn.compose import ColumnTransformer
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder

    preprocessor = ColumnTransformer(
        transformers=[("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), FEATURES)]
    )
    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            # Fit on log-yield so errors are relative (a 1 t/ha miss matters more for pulses than sugarcane)
            ("regressor", RandomForestRegressor(n_estimators=300, min_samples_leaf=2, random_state=42, n_jobs=-1)),
        ]
    )


def fit_predict(train: pd.DataFrame, other: pd.DataFrame) -> np.ndarray:
    model = make_model()
    model.fit(train[FEATURES], np.log(train[TARGET]))
    return model, np.exp(model.predict(other[FEATURES]))


def metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    from sklearn.metrics import mean_absolute_error, r2_score

    return {
        "mae_t_ha": round(float(mean_absolute_error(y_true, y_pred)), 4),
        "median_abs_pct_error": round(float(np.median(np.abs(y_pred - y_true) / y_true) * 100), 1),
        "r2": round(float(r2_score(y_true, y_pred)), 4),
        "r2_log": round(float(r2_score(np.log(y_true), np.log(y_pred))), 4),
        "n": int(len(y_true)),
    }


def main():
    logger.info("=" * 60)
    logger.info("TRAINING YIELD MODEL WITH SPLIT CONFORMAL INTERVALS")
    logger.info("=" * 60)

    try:
        import joblib  # noqa: F401
        import sklearn  # noqa: F401
    except ImportError:
        logger.error("scikit-learn or joblib is not installed. Run: pip install scikit-learn joblib")
        return

    from crop_optimization.yield_model.conformal import (
        DEFAULT_ALPHA,
        empirical_coverage,
        fit_conformal,
    )

    df = build_real_yield_records()
    logger.info("Real yield records: %d rows, %d crops, %d districts, years %s",
                len(df), df["crop"].nunique(), df["district"].nunique(), sorted(df["year"].unique()))

    trained_crops = set(df.loc[df["year"] <= 2017, "crop"])

    # -----------------------------------------------------------------------
    # 1. Evaluation run: train ≤2015, calibrate 2016–17, test 2021-22
    # -----------------------------------------------------------------------
    ev_train = df[df["year"] <= 2015]
    ev_cal = df[df["year"].isin([2016, 2017])]
    ev_test = df[(df["year"] == 2021) & df["crop"].isin(trained_crops)]

    _, cal_pred = fit_predict(ev_train, ev_cal)
    ev_calibration = fit_conformal(ev_cal[TARGET].values, cal_pred, ev_cal["crop"].values, alpha=DEFAULT_ALPHA)
    _, test_pred = fit_predict(ev_train, ev_test)
    ev_coverage = empirical_coverage(ev_test[TARGET].values, test_pred, ev_test["crop"].values, ev_calibration)
    ev_metrics = metrics(ev_test[TARGET].values, test_pred)

    per_crop_cov = {}
    for crop, grp in ev_test.assign(pred=test_pred).groupby("crop"):
        per_crop_cov[crop] = round(
            empirical_coverage(grp[TARGET].values, grp["pred"].values, grp["crop"].values, ev_calibration), 3
        )

    logger.info("-" * 60)
    logger.info("EVALUATION (train 2011-15, calibrate 2016-17, test 2021-22 — unseen years)")
    logger.info("  MAE                 : %.3f t/ha", ev_metrics["mae_t_ha"])
    logger.info("  Median abs %% error  : %.1f%%", ev_metrics["median_abs_pct_error"])
    logger.info("  R2 (t/ha) / R2 (log): %.3f / %.3f", ev_metrics["r2"], ev_metrics["r2_log"])
    logger.info("  Interval coverage   : %.1f%% (target %.0f%%) on %d test rows",
                ev_coverage * 100, (1 - DEFAULT_ALPHA) * 100, ev_metrics["n"])
    logger.info("-" * 60)

    # -----------------------------------------------------------------------
    # 2. Deployed model: train 2011–17, calibrate on 2021-22
    # -----------------------------------------------------------------------
    dep_train = df[df["year"] <= 2017]
    dep_cal = df[(df["year"] == 2021) & df["crop"].isin(trained_crops)]
    model, dep_cal_pred = fit_predict(dep_train, dep_cal)
    calibration = fit_conformal(dep_cal[TARGET].values, dep_cal_pred, dep_cal["crop"].values, alpha=DEFAULT_ALPHA)
    logger.info("Deployed calibration: global q=%.3f (±%.0f%% band) on %d rows; %d crops with own band",
                calibration["global"]["q"], (np.exp(calibration["global"]["q"]) - 1) * 100,
                calibration["global"]["n"], len(calibration["per_group"]))

    import joblib

    joblib.dump(model, ARTIFACTS_DIR / "yield_model.joblib")
    with open(ARTIFACTS_DIR / "conformal.json", "w", encoding="utf-8") as f:
        json.dump(calibration, f, indent=2)

    metadata = {
        "training_date": datetime.now().isoformat(),
        "model_type": "RandomForestRegressor on log-yield (Scikit-Learn Pipeline) + split conformal",
        "target_transform": "log",
        "features": FEATURES,
        "target": TARGET,
        "training_years": sorted(int(y) for y in dep_train["year"].unique()),
        "calibration_years": [2021],
        "sample_count": int(len(dep_train)),
        "crops_covered": sorted(trained_crops),
        "crops_excluded": EXCLUDED_CROPS,
        "districts_covered": sorted(dep_train["district"].unique().tolist()),
        "evaluation": {
            "protocol": "train 2011-2015, calibrate 2016-2017, test 2021-22 (year-grouped)",
            "metrics": ev_metrics,
            "interval_coverage": round(ev_coverage, 4),
            "coverage_target": 1 - DEFAULT_ALPHA,
            "per_crop_coverage": per_crop_cov,
        },
        "data_sources": [
            "ICRISAT-District Level Data - yield.csv",
            "karnataka_crop_production_2021_22_yield.csv",
        ],
        "status": "trained",
    }
    with open(ARTIFACTS_DIR / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Saved model, conformal.json and metadata.json to %s", ARTIFACTS_DIR)


if __name__ == "__main__":
    main()
