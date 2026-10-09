"""
train_price_model.py — Train the crop mandi market price machine learning model.

Trains a Scikit-Learn RandomForestRegressor on real Karnataka and Agmarknet price records:
  - mandi prices data.csv (8,914 records)
  - karnataka_production_multi_model_dataset_soil_and_mandi.csv (10,000 records)

Features:
  - crop (One-Hot Encoded)
  - district (One-Hot Encoded)
  - season (One-Hot Encoded)

Target:
  - modal_price_rs_qtl (INR per Quintal)

Usage:
    python train_price_model.py
"""

import json
import logging
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

ARTIFACTS_DIR = Path(__file__).parent / "artifacts" / "price_model"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)


def main():
    logger.info("=" * 60)
    logger.info("STARTING MANDI PRICE ML MODEL TRAINING")
    logger.info("=" * 60)

    try:
        from sklearn.compose import ColumnTransformer
        from sklearn.ensemble import RandomForestRegressor
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
        load_mandi_data,
        load_soil_weather_data,
    )

    logger.info("Loading Mandi market price datasets...")
    mandi_df = load_mandi_data()
    multi_df = load_soil_weather_data()

    records = []

    # Process Mandi price dataset (8,914 rows)
    if mandi_df is not None and not mandi_df.empty:
        logger.info("Processing %d mandi records...", len(mandi_df))
        for _, row in mandi_df.iterrows():
            crop = row.get("crop")
            dist = row.get("district")
            price = row.get("Modal_x0020_Price")

            if pd.notna(crop) and pd.notna(price) and float(price) > 100:
                records.append({
                    "crop": str(crop),
                    "district": str(dist) if pd.notna(dist) else "Karnataka",
                    "season": "kharif",
                    "modal_price_rs_qtl": float(price),
                })

    # Process multi-model wholesale price dataset (10,000 rows)
    if multi_df is not None and not multi_df.empty:
        logger.info("Processing %d multi-model wholesale records...", len(multi_df))
        for _, row in multi_df.iterrows():
            crop = row.get("crop")
            dist = row.get("district")
            season = row.get("season", "kharif")
            p_tonne = row.get("Wholesale_Price_Modal_INR_per_Tonne")

            if pd.notna(crop) and pd.notna(p_tonne) and float(p_tonne) > 1000:
                p_qtl = float(p_tonne) / 10.0
                records.append({
                    "crop": str(crop),
                    "district": str(dist) if pd.notna(dist) else "Karnataka",
                    "season": str(season) if pd.notna(season) else "kharif",
                    "modal_price_rs_qtl": p_qtl,
                })

    if not records:
        logger.error("No valid price records found. Training aborted.")
        return

    df = pd.DataFrame(records)
    logger.info("Total clean price records assembled: %d across %d crops.", len(df), df["crop"].nunique())

    X = df[["crop", "district", "season"]]
    y = df["modal_price_rs_qtl"]

    # 2. Train / Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # 3. Pipeline: OneHotEncoder + RandomForest
    cat_features = ["crop", "district", "season"]
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_features),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", RandomForestRegressor(n_estimators=100, max_depth=16, random_state=42, n_jobs=-1)),
        ]
    )

    logger.info("Fitting Random Forest Regressor on price training set (%d samples)...", len(X_train))
    model.fit(X_train, y_train)

    # 4. Evaluation on Test Set
    y_pred = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = float(r2_score(y_test, y_pred))

    logger.info("=" * 60)
    logger.info("PRICE MODEL EVALUATION METRICS (Held-Out Test Set)")
    logger.info(f"  MAE  (Mean Absolute Error) : Rs {mae:.2f} / quintal")
    logger.info(f"  RMSE (Root Mean Sq Error)  : Rs {rmse:.2f} / quintal")
    logger.info(f"  R2 Score                   : {r2:.4f}")
    logger.info("=" * 60)

    # 5. Save Model and Metadata
    model_path = ARTIFACTS_DIR / "price_model.joblib"
    joblib.dump(model, model_path)
    logger.info("Saved trained price model pipeline to %s", model_path)

    metadata = {
        "training_date": datetime.now().isoformat(),
        "model_type": "RandomForestRegressor (Scikit-Learn Pipeline)",
        "sample_count": len(df),
        "crops_covered": sorted(df["crop"].unique().tolist()),
        "metrics": {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "r2": round(r2, 4),
        },
        "features": list(X.columns),
        "target": "modal_price_rs_qtl",
        "status": "trained",
    }

    metadata_path = ARTIFACTS_DIR / "metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Saved price training metadata to %s", metadata_path)
    logger.info("Price model training complete successfully!")


if __name__ == "__main__":
    main()
