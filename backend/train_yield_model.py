"""
train_yield_model.py — Train the crop yield prediction machine learning model.

Trains a Scikit-Learn RandomForestRegressor on real Karnataka agricultural records:
  - karnataka_production_multi_model_dataset_soil_and_mandi.csv (10,000 records)
  - karnataka_crop_production_2021_22_yield.csv (3,510 records)

Features:
  - crop (One-Hot Encoded)
  - district (One-Hot Encoded)
  - season (One-Hot Encoded)
  - soil_ph (Numeric)
  - rainfall_mm (Numeric)
  - temperature_c (Numeric)

Target:
  - yield_t_per_ha (Tonnes per Hectare)

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


def main():
    logger.info("=" * 60)
    logger.info("STARTING CROP YIELD ML MODEL TRAINING")
    logger.info("=" * 60)

    try:
        from sklearn.compose import ColumnTransformer
        from sklearn.ensemble import RandomForestRegressor
        from sklearn.impute import SimpleImputer
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
        from sklearn.model_selection import train_test_split
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import OneHotEncoder
        import joblib
    except ImportError:
        logger.error(
            "scikit-learn or joblib is not installed.\n"
            "Please run:\n"
            "    pip install scikit-learn joblib\n"
        )
        return

    # 1. Load Real Datasets
    from crop_optimization.data_loader import (
        load_karnataka_2021_data,
        load_soil_weather_data,
    )

    logger.info("Loading Karnataka agricultural datasets...")
    multi_df = load_soil_weather_data()
    k21_df = load_karnataka_2021_data()

    records = []

    # Process multi-model dataset (10,000 rows)
    if multi_df is not None and not multi_df.empty:
        logger.info("Processing %d multi-model records...", len(multi_df))
        for _, row in multi_df.iterrows():
            crop = row.get("crop")
            dist = row.get("district")
            season = row.get("season", "kharif")
            yield_val = row.get("Yield_Tonnes_per_Hectare")
            ph = row.get("Soil_pH", 6.5)
            rain = row.get("Rainfall_mm", 600.0)
            temp = row.get("Temperature_C", 26.0)

            if pd.notna(crop) and pd.notna(dist) and pd.notna(yield_val) and float(yield_val) > 0:
                records.append({
                    "crop": str(crop),
                    "district": str(dist),
                    "season": str(season),
                    "soil_ph": float(ph) if pd.notna(ph) else 6.5,
                    "rainfall_mm": float(rain) if pd.notna(rain) else 600.0,
                    "temperature_c": float(temp) if pd.notna(temp) else 26.0,
                    "yield_t_per_ha": float(yield_val),
                })

    # Process 2021-22 district dataset (3,510 rows)
    if k21_df is not None and not k21_df.empty:
        logger.info("Processing %d district 2021-22 records...", len(k21_df))
        for _, row in k21_df.iterrows():
            crop = row.get("crop")
            dist = row.get("district")
            season = row.get("season", "kharif")
            yield_val = row.get("yield_t_ha")

            if pd.notna(crop) and pd.notna(dist) and pd.notna(yield_val) and float(yield_val) > 0:
                records.append({
                    "crop": str(crop),
                    "district": str(dist),
                    "season": str(season),
                    "soil_ph": 6.5,
                    "rainfall_mm": 600.0,
                    "temperature_c": 26.0,
                    "yield_t_per_ha": float(yield_val),
                })

    if not records:
        logger.error("No valid yield records found. Training aborted.")
        return

    df = pd.DataFrame(records)
    logger.info("Total clean training records assembled: %d across %d crops and %d districts.",
                len(df), df["crop"].nunique(), df["district"].nunique())

    X = df[["crop", "district", "season", "soil_ph", "rainfall_mm", "temperature_c"]]
    y = df["yield_t_per_ha"]

    # 2. Train / Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # 3. Pipeline: Preprocessing + RandomForest
    cat_features = ["crop", "district", "season"]
    num_features = ["soil_ph", "rainfall_mm", "temperature_c"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_features),
            ("num", SimpleImputer(strategy="median"), num_features),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", RandomForestRegressor(n_estimators=100, max_depth=16, random_state=42, n_jobs=-1)),
        ]
    )

    logger.info("Fitting Random Forest Regressor on training set (%d samples)...", len(X_train))
    model.fit(X_train, y_train)

    # 4. Evaluation on Test Set
    y_pred = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = float(r2_score(y_test, y_pred))

    logger.info("=" * 60)
    logger.info("YIELD MODEL EVALUATION METRICS (Held-Out Test Set)")
    logger.info(f"  MAE  (Mean Absolute Error) : {mae:.4f} tonnes/hectare")
    logger.info(f"  RMSE (Root Mean Sq Error)  : {rmse:.4f} tonnes/hectare")
    logger.info(f"  R2 Score                   : {r2:.4f}")
    logger.info("=" * 60)

    # 5. Save Model and Metadata
    model_path = ARTIFACTS_DIR / "yield_model.joblib"
    joblib.dump(model, model_path)
    logger.info("Saved trained model pipeline to %s", model_path)

    metadata = {
        "training_date": datetime.now().isoformat(),
        "model_type": "RandomForestRegressor (Scikit-Learn Pipeline)",
        "sample_count": len(df),
        "crops_covered": sorted(df["crop"].unique().tolist()),
        "districts_covered": sorted(df["district"].unique().tolist()),
        "metrics": {
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "r2": round(r2, 4),
        },
        "features": list(X.columns),
        "target": "yield_t_per_ha",
        "status": "trained",
    }

    metadata_path = ARTIFACTS_DIR / "metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Saved training metadata to %s", metadata_path)
    logger.info("Yield model training complete successfully!")


if __name__ == "__main__":
    main()
