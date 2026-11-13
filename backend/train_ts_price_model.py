"""
train_ts_price_model.py — Train the crop Mandi Time-Series Price Forecasting ML model.

Trains an auto-regressive time-series pipeline incorporating:
  1. Current Mandi market price (live 24h Agmarknet Karnataka baseline)
  2. 7-8 months historical rolling mean & momentum
  3. 1-year historical price lag
  4. Forward-looking harvest timing (months to harvest, cyclical seasonal sin/cos)
  5. Exogenous allocation & supply metrics (area sown, mandi arrivals)
  6. Categorical crop & district embeddings

Target:
  - harvest_price_qtl: Realized modal price at harvest month (INR per Quintal)

Usage:
    python train_ts_price_model.py
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

ARTIFACTS_DIR = Path(__file__).parent / "artifacts" / "price_ts_model"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

# Standard Karnataka crop durations in days and average maturity months
CROP_DURATIONS_MONTHS: dict[str, int] = {
    "tomato": 3,
    "bengalgram": 3,
    "chickpea": 3,
    "maize": 4,
    "ragi": 4,
    "finger millet": 4,
    "jowar": 4,
    "sorghum": 4,
    "groundnut": 4,
    "onion": 4,
    "rice": 5,
    "paddy": 5,
    "tur": 5,
    "pigeonpea": 5,
    "cotton": 6,
    "sugarcane": 12,
}


def get_crop_duration_months(crop_name: str) -> int:
    clean = crop_name.lower().strip()
    for k, dur in CROP_DURATIONS_MONTHS.items():
        if k in clean:
            return dur
    return 4  # Default 4 months (120 days)


def main():
    logger.info("=" * 60)
    logger.info("STARTING MANDI TIME-SERIES PRICE FORECASTING MODEL TRAINING")
    logger.info("State Target: Karnataka | Window: Previous 7-8 Months to 1 Year")
    logger.info("=" * 60)

    try:
        from sklearn.compose import ColumnTransformer
        from sklearn.ensemble import RandomForestRegressor
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
        from sklearn.model_selection import train_test_split
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import OneHotEncoder, StandardScaler
        import joblib
    except ImportError:
        logger.error("scikit-learn or joblib is not installed. Please run: pip install scikit-learn joblib")
        return

    # 1. Load Real Karnataka Production & Mandi Datasets
    from crop_optimization.data_loader import load_soil_weather_data
    from crop_optimization.normalization import normalize_crop, normalize_district

    multi_df = load_soil_weather_data()
    if multi_df is None or multi_df.empty:
        logger.error("Karnataka multi-model dataset could not be loaded.")
        return

    logger.info("Loaded %d multi-model records. Sorting by crop, district, and time...", len(multi_df))
    df = multi_df.copy()

    # Normalize column names
    crop_col = "Recommended_Crop" if "Recommended_Crop" in df.columns else "crop"
    dist_col = "District" if "District" in df.columns else "district"
    df["crop_canon"] = df[crop_col].apply(lambda c: normalize_crop(str(c)) or str(c))
    df["district_canon"] = df[dist_col].apply(lambda d: normalize_district(str(d)) or str(d))
    df["season_clean"] = df.get("Season", df.get("season", "kharif")).astype(str).str.lower()

    # Ensure chronologically sorted for rolling temporal window
    sort_cols = [c for c in ["crop_canon", "district_canon", "Year", "Month"] if c in df.columns]
    df = df.sort_values(by=sort_cols).reset_index(drop=True)

    # 2. Compute 7-8 Months Rolling History & Lags (converted from INR/Tonne to INR/Quintal)
    df["price_qtl"] = df["Wholesale_Price_Modal_INR_per_Tonne"] / 10.0
    df["lag_1m_qtl"] = (
        df["Price_Lag_1Month_INR_per_Tonne"] / 10.0
        if "Price_Lag_1Month_INR_per_Tonne" in df.columns
        else df["price_qtl"] * 0.98
    )
    df["lag_1y_qtl"] = (
        df["Price_Lag_1Year_INR_per_Tonne"] / 10.0
        if "Price_Lag_1Year_INR_per_Tonne" in df.columns
        else df["price_qtl"] * 0.95
    )

    # Rolling 7-8 months historical mean price per crop & district
    df["rolling_mean_7m_qtl"] = (
        df.groupby(["crop_canon", "district_canon"])["price_qtl"]
        .transform(lambda s: s.rolling(window=7, min_periods=1).mean())
    )
    df["price_momentum_7m"] = (df["price_qtl"] / df["rolling_mean_7m_qtl"].replace(0, np.nan)).fillna(1.0)

    # 3. Target: Realized Price at Harvest Month
    records = []
    grouped = df.groupby(["crop_canon", "district_canon"])

    for (c, d), group in grouped:
        dur_m = get_crop_duration_months(c)
        group_len = len(group)
        group_prices = group["price_qtl"].values

        for idx in range(group_len):
            row = group.iloc[idx]
            sowing_m = int(row.get("Month", 7))
            harvest_m = ((sowing_m - 1 + dur_m) % 12) + 1

            # Target harvest price is the actual market price shifted by duration months
            future_idx = idx + dur_m
            if future_idx < group_len:
                target_p = group_prices[future_idx]
            else:
                # If forward horizon exceeds historical series, adjust by seasonal delta
                seasonal_factor = 1.0 + (0.05 * np.sin(2 * np.pi * harvest_m / 12))
                target_p = row["price_qtl"] * seasonal_factor

            if target_p > 100 and row["price_qtl"] > 100:
                records.append({
                    "crop": c,
                    "district": d,
                    "season": row["season_clean"],
                    "current_mandi_price_qtl": row["price_qtl"],
                    "lag_1m_qtl": row["lag_1m_qtl"],
                    "rolling_mean_7m_qtl": row["rolling_mean_7m_qtl"],
                    "lag_1y_qtl": row["lag_1y_qtl"],
                    "price_momentum_7m": row["price_momentum_7m"],
                    "harvest_month": harvest_m,
                    "month_sin": np.sin(2 * np.pi * harvest_m / 12),
                    "month_cos": np.cos(2 * np.pi * harvest_m / 12),
                    "months_to_harvest": dur_m,
                    "area_sown_ha": float(row.get("Area_Sown_Hectares", 500.0)),
                    "mandi_arrivals_t": float(row.get("Mandi_Arrivals_Tonnes", 1000.0)),
                    "rainfall_mm": float(row.get("Rainfall_mm", 120.0)),
                    "temperature_c": float(row.get("Temperature_C", 26.0)),
                    "harvest_price_qtl": target_p,
                })

    train_df = pd.DataFrame(records)
    logger.info("Compiled %d harvest-paired time-series records for training.", len(train_df))

    cat_features = ["crop", "district", "season"]
    num_features = [
        "current_mandi_price_qtl",
        "lag_1m_qtl",
        "rolling_mean_7m_qtl",
        "lag_1y_qtl",
        "price_momentum_7m",
        "harvest_month",
        "month_sin",
        "month_cos",
        "months_to_harvest",
        "area_sown_ha",
        "mandi_arrivals_t",
        "rainfall_mm",
        "temperature_c",
    ]

    X = train_df[cat_features + num_features]
    y = train_df["harvest_price_qtl"]

    # 4. Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), num_features),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_features),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=120,
                    max_depth=16,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )

    logger.info("Fitting Time-Series Harvest Price Predictor on %d samples...", len(X_train))
    model.fit(X_train, y_train)

    # 5. Evaluate
    y_pred = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = float(r2_score(y_test, y_pred))

    logger.info("=" * 60)
    logger.info("TIME-SERIES HARVEST PRICE MODEL EVALUATION")
    logger.info(f"  MAE  (Mean Absolute Error) : Rs {mae:.2f} / quintal")
    logger.info(f"  RMSE (Root Mean Sq Error)  : Rs {rmse:.2f} / quintal")
    logger.info(f"  R2 Score                   : {r2:.4f}")
    logger.info("=" * 60)

    # 6. Save Model Artifact
    model_path = ARTIFACTS_DIR / "price_ts_model.joblib"
    joblib.dump(model, model_path)
    logger.info("Saved trained time-series price model to %s", model_path)

    metadata = {
        "training_date": datetime.now().isoformat(),
        "state": "Karnataka",
        "historical_window": "7-8 months rolling mean + 1-year lag",
        "refresh_cadence": "24 hours (Agmarknet Daily Update)",
        "model_type": "Auto-Regressive Forward Harvest Price Pipeline (RandomForestRegressor)",
        "sample_count": len(train_df),
        "crops_covered": sorted(train_df["crop"].unique().tolist()),
        "metrics": {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "r2": round(r2, 4),
        },
        "features": {
            "numerical": num_features,
            "categorical": cat_features,
        },
        "target": "harvest_price_qtl",
        "status": "trained",
    }

    metadata_path = ARTIFACTS_DIR / "metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Saved time-series price metadata to %s", metadata_path)
    logger.info("Time-series harvest price model training completed successfully!")


if __name__ == "__main__":
    main()
