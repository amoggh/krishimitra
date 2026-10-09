"""
price_model/model.py — Real mandi and market price estimation.

Uses real market price datasets currently available in the project:
1. mandi prices data.csv: recent market arrivals and modal/min/max prices (INR/quintal).
2. karnataka_production_multi_model_dataset_soil_and_mandi.csv: wholesale modal/min/max (INR/tonne → /10 for INR/quintal).

Hierarchy:
- Level A: Karnataka-specific mandi price for the crop (if present).
- Level B: Multi-model dataset wholesale market price for the crop in Karnataka.
- Level C: All-India mandi modal price for the matched commodity.
- Unavailable: If no verified market price is found, returns available=False.
               NEVER invents fake prices.
"""

from __future__ import annotations

import logging
from typing import Optional

import pandas as pd

from crop_optimization.data_loader import load_mandi_data, load_soil_weather_data
from crop_optimization.normalization import normalize_crop, normalize_district
from crop_optimization.schemas import PriceResult

logger = logging.getLogger(__name__)


def predict_price(
    crop: str,
    district: str,
    season: str,
    harvest_month: Optional[int] = None,
    mandi_df: Optional[pd.DataFrame] = None,
    demo_mode: bool = False,
) -> PriceResult:
    """
    Look up real market price for a crop using available datasets.
    """
    canonical_crop = normalize_crop(crop) or crop
    canonical_district = normalize_district(district) or district

    # -----------------------------------------------------------------------
    # Level ML: Trained Scikit-Learn Price Model (if user ran train_price_model.py)
    # -----------------------------------------------------------------------
    from pathlib import Path
    ml_model_path = Path(__file__).parent.parent.parent / "artifacts" / "price_model" / "price_model.joblib"
    if ml_model_path.exists():
        try:
            import joblib
            pipeline = joblib.load(ml_model_path)
            sample = pd.DataFrame([{
                "crop": canonical_crop,
                "district": canonical_district,
                "season": season,
            }])
            pred = float(pipeline.predict(sample)[0])
            if pred > 100:
                logger.info("Using trained ML price model for %s: Rs %.1f/q", canonical_crop, pred)
                return PriceResult(
                    crop=canonical_crop,
                    expected_inr_per_quintal=round(pred, 1),
                    lower_inr_per_quintal=round(pred * 0.85, 1),
                    upper_inr_per_quintal=round(pred * 1.15, 1),
                    unit="INR/quintal",
                    source="trained_random_forest_ml_model",
                    confidence="high",
                    available=True,
                )
        except Exception as exc:
            logger.debug("Could not load ML price model: %s", exc)

    # -----------------------------------------------------------------------
    # 1. Check Karnataka Mandi records
    # -----------------------------------------------------------------------
    if mandi_df is None:
        mandi_df = load_mandi_data()

    if mandi_df is not None and not mandi_df.empty:
        # Match crop
        crop_match = mandi_df[mandi_df["crop"] == canonical_crop]

        # Try Karnataka state records
        kar_records = crop_match[crop_match["State"].astype(str).str.strip().str.lower() == "karnataka"]
        if not kar_records.empty:
            modal_prices = kar_records["Modal_x0020_Price"].dropna()
            if not modal_prices.empty and (modal_prices > 0).any():
                active_prices = modal_prices[modal_prices > 0]
                expected = round(float(active_prices.median()), 0)
                min_p = float(kar_records["Min_x0020_Price"].dropna().min()) if "Min_x0020_Price" in kar_records else expected * 0.9
                max_p = float(kar_records["Max_x0020_Price"].dropna().max()) if "Max_x0020_Price" in kar_records else expected * 1.1

                return PriceResult(
                    crop=canonical_crop,
                    lower_inr_per_quintal=round(min(min_p, expected * 0.9), 0),
                    expected_inr_per_quintal=expected,
                    upper_inr_per_quintal=round(max(max_p, expected * 1.1), 0),
                    unit="INR/quintal",
                    source="karnataka_mandi_recent",
                    confidence="high",
                    available=True,
                )

    # -----------------------------------------------------------------------
    # 2. Check Multi-Model Wholesale Price dataset for Karnataka
    # -----------------------------------------------------------------------
    multi_df = load_soil_weather_data()
    if multi_df is not None and not multi_df.empty and "crop" in multi_df.columns:
        multi_crop = multi_df[multi_df["crop"] == canonical_crop]
        if not multi_crop.empty:
            col_modal = "Wholesale_Price_Modal_INR_per_Tonne"
            col_min = "Wholesale_Price_Min_INR_per_Tonne"
            col_max = "Wholesale_Price_Max_INR_per_Tonne"

            if col_modal in multi_crop.columns:
                modal_series = multi_crop[col_modal].dropna()
                modal_series = modal_series[modal_series > 0]
                if not modal_series.empty:
                    # Convert INR/tonne to INR/quintal (1 tonne = 10 quintals)
                    expected_q = round(float(modal_series.median()) / 10.0, 0)
                    min_q = round(float(multi_crop[col_min].dropna().median()) / 10.0, 0) if col_min in multi_crop else round(expected_q * 0.9, 0)
                    max_q = round(float(multi_crop[col_max].dropna().median()) / 10.0, 0) if col_max in multi_crop else round(expected_q * 1.1, 0)

                    return PriceResult(
                        crop=canonical_crop,
                        lower_inr_per_quintal=min_q,
                        expected_inr_per_quintal=expected_q,
                        upper_inr_per_quintal=max_q,
                        unit="INR/quintal",
                        source="karnataka_wholesale_dataset",
                        confidence="medium",
                        available=True,
                    )

    # -----------------------------------------------------------------------
    # 3. Check All-India Mandi records for recent modal price
    # -----------------------------------------------------------------------
    if mandi_df is not None and not mandi_df.empty:
        all_crop = mandi_df[mandi_df["crop"] == canonical_crop]
        if not all_crop.empty:
            all_modal = all_crop["Modal_x0020_Price"].dropna()
            all_modal = all_modal[all_modal > 0]
            if not all_modal.empty:
                expected = round(float(all_modal.median()), 0)
                lower = round(float(all_modal.quantile(0.10)), 0)
                upper = round(float(all_modal.quantile(0.90)), 0)

                return PriceResult(
                    crop=canonical_crop,
                    lower_inr_per_quintal=lower,
                    expected_inr_per_quintal=expected,
                    upper_inr_per_quintal=upper,
                    unit="INR/quintal",
                    source="mandi_prices_all_india_fallback",
                    confidence="medium",
                    available=True,
                    unavailable_reason="Price derived from broader mandi market records because Karnataka-specific mandi records were sparse.",
                )

    # -----------------------------------------------------------------------
    # Unavailable
    # -----------------------------------------------------------------------
    logger.info("No market price available for '%s'.", canonical_crop)
    return PriceResult(
        crop=canonical_crop,
        available=False,
        unavailable_reason=f"No recent market price observations found for '{canonical_crop}' in current datasets.",
    )
