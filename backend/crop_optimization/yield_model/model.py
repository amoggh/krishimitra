"""
yield_model/model.py — Real data-driven crop yield estimation interface.

Hierarchy:
  Level A: Karnataka Government 2021-22 recent district-level observed yield.
           Confidence: "high", Source: "district_2021_22".
  Level B: ICRISAT district-level historical observations (quantiles: P10, median, P90).
           Confidence: "medium", Source: "district_icrisat_historical".
  Level C: Karnataka-wide historical yield dataset 1997-2020 (quantiles: P10, median, P90).
           Confidence: "low", Source: "karnataka_historical_fallback".
           Notes: Yield estimate based on Karnataka-level historical data because
                  sufficient district-level observations were unavailable.

Interface is modular: later can be replaced with XGBoost + Conformal Prediction
without altering the optimizer.
"""

from __future__ import annotations

import logging
from typing import Optional

import pandas as pd

from crop_optimization.data_loader import (
    load_icrisat_data,
    load_karnataka_2021_data,
    load_yield_data,
)
from crop_optimization.normalization import (
    normalize_crop,
    normalize_district,
    normalize_season,
)
from crop_optimization.schemas import YieldResult

logger = logging.getLogger(__name__)

# Mapping from canonical crop to ICRISAT yield column
ICRISAT_YIELD_COLUMN_MAP: dict[str, str] = {
    "Rice / Paddy": "RICE YIELD (Kg per ha)",
    "Wheat": "WHEAT YIELD (Kg per ha)",
    "Jowar / Sorghum": "KHARIF SORGHUM YIELD (Kg per ha)",
    "Bajra / Pearl Millet": "PEARL MILLET YIELD (Kg per ha)",
    "Maize": "MAIZE YIELD (Kg per ha)",
    "Ragi / Finger Millet": "FINGER MILLET YIELD (Kg per ha)",
    "Bengalgram / Chickpea": "CHICKPEA YIELD (Kg per ha)",
    "Tur / Pigeonpea": "PIGEONPEA YIELD (Kg per ha)",
    "Groundnut": "GROUNDNUT YIELD (Kg per ha)",
    "Sesamum": "SESAMUM YIELD (Kg per ha)",
    "Safflower": "SAFFLOWER YIELD (Kg per ha)",
    "Castor": "CASTOR YIELD (Kg per ha)",
    "Linseed": "LINSEED YIELD (Kg per ha)",
    "Sunflower": "SUNFLOWER YIELD (Kg per ha)",
    "Soyabean": "SOYABEAN YIELD (Kg per ha)",
    "Sugarcane": "SUGARCANE YIELD (Kg per ha)",
    "Cotton": "COTTON YIELD (Kg per ha)",
}


def predict_yield(
    crop: str,
    district: str,
    season: str,
    farmer_input: Optional[object] = None,
    weather_df=None,
    soil_df=None,
    demo_mode: bool = False,
) -> YieldResult:
    """
    Estimate crop yield using real dataset hierarchy.
    """
    canonical_crop = normalize_crop(crop) or crop
    canonical_district = normalize_district(district) or district
    canonical_season = normalize_season(season)

    # -----------------------------------------------------------------------
    # Level ML: Trained Scikit-Learn Model (if user ran train_yield_model.py)
    # -----------------------------------------------------------------------
    from pathlib import Path
    ml_model_path = Path(__file__).parent.parent.parent / "artifacts" / "yield_model" / "yield_model.joblib"
    if ml_model_path.exists():
        try:
            import joblib
            pipeline = joblib.load(ml_model_path)
            ph = getattr(farmer_input, "soil", None)
            ph_val = ph.ph if ph and ph.ph else 6.5
            sample = pd.DataFrame([{
                "crop": canonical_crop,
                "district": canonical_district,
                "season": canonical_season,
                "soil_ph": ph_val,
                "rainfall_mm": 600.0,
                "temperature_c": 26.0,
            }])
            pred = float(pipeline.predict(sample)[0])
            if pred > 0:
                logger.info("Using trained ML yield model for %s: %.2f t/ha", canonical_crop, pred)
                return YieldResult(
                    crop=canonical_crop,
                    lower_t_per_ha=round(pred * 0.85, 2),
                    expected_t_per_ha=round(pred, 2),
                    upper_t_per_ha=round(pred * 1.15, 2),
                    unit="tonnes/hectare",
                    source="trained_random_forest_ml_model",
                    confidence="high",
                    available=True,
                )
        except Exception as exc:
            logger.debug("Could not load ML yield model: %s", exc)

    # -----------------------------------------------------------------------
    # Level A: District 2021-22 recent observed yield
    # -----------------------------------------------------------------------
    karnataka_2021_df = load_karnataka_2021_data()
    if karnataka_2021_df is not None and not karnataka_2021_df.empty:
        # Match district and crop
        dist_crop_mask = (
            (karnataka_2021_df["district"] == canonical_district)
            & (karnataka_2021_df["crop"] == canonical_crop)
        )
        matched = karnataka_2021_df[dist_crop_mask]

        # Filter by season if available
        season_matched = matched[matched["season"].isin([canonical_season, "annual"])]
        use_df = season_matched if not season_matched.empty else matched

        active = use_df[use_df["yield_t_ha"] > 0]
        if not active.empty:
            obs_yield = float(active["yield_t_ha"].iloc[0])
            lower = max(0.1, round(obs_yield * 0.85, 2))
            expected = round(obs_yield, 2)
            upper = round(obs_yield * 1.15, 2)

            logger.debug(
                "Level A yield for %s in %s: %.2f t/ha",
                canonical_crop, canonical_district, expected
            )
            return YieldResult(
                crop=canonical_crop,
                lower_t_per_ha=lower,
                expected_t_per_ha=expected,
                upper_t_per_ha=upper,
                unit="tonnes/hectare",
                source="district_2021_22",
                confidence="high",
                available=True,
            )

    # -----------------------------------------------------------------------
    # Level B: ICRISAT district-level historical baseline
    # -----------------------------------------------------------------------
    col_name = ICRISAT_YIELD_COLUMN_MAP.get(canonical_crop)
    if col_name:
        icrisat_df = load_icrisat_data()
        if icrisat_df is not None and not icrisat_df.empty and col_name in icrisat_df.columns:
            dist_icrisat = icrisat_df[icrisat_df["district"] == canonical_district]
            if not dist_icrisat.empty:
                series = pd.to_numeric(dist_icrisat[col_name], errors="coerce").dropna()
                series = series[series > 0] / 1000.0  # kg/ha to t/ha
                if len(series) >= 2:
                    expected = round(float(series.median()), 2)
                    lower = round(float(series.quantile(0.10)), 2)
                    upper = round(float(series.quantile(0.90)), 2)

                    logger.debug(
                        "Level B yield for %s in %s: %.2f t/ha (n=%d)",
                        canonical_crop, canonical_district, expected, len(series)
                    )
                    return YieldResult(
                        crop=canonical_crop,
                        lower_t_per_ha=lower,
                        expected_t_per_ha=expected,
                        upper_t_per_ha=upper,
                        unit="tonnes/hectare",
                        source="district_icrisat_historical",
                        confidence="medium",
                        available=True,
                    )

    # -----------------------------------------------------------------------
    # Level C: Karnataka state historical fallback (1997-2020)
    # -----------------------------------------------------------------------
    hist_df = load_yield_data()
    if hist_df is not None and not hist_df.empty:
        # Match crop
        crop_mask = hist_df["crop"] == canonical_crop
        matched_hist = hist_df[crop_mask]

        # Match season
        season_hist = matched_hist[matched_hist["season"].isin([canonical_season, "annual"])]
        use_hist = season_hist if not season_hist.empty else matched_hist

        series = use_hist["yield_t_ha"].dropna()
        series = series[series > 0]
        if not series.empty:
            expected = round(float(series.median()), 2)
            lower = round(float(series.quantile(0.10)), 2)
            upper = round(float(series.quantile(0.90)), 2)

            # Ensure lower < upper
            if lower == upper:
                lower = round(expected * 0.85, 2)
                upper = round(expected * 1.15, 2)

            note = (
                f"Yield estimate for {canonical_crop} is based on Karnataka-level historical data "
                f"because sufficient district-level observations were unavailable."
            )
            logger.debug(
                "Level C yield for %s: %.2f t/ha (n=%d)",
                canonical_crop, expected, len(series)
            )
            return YieldResult(
                crop=canonical_crop,
                lower_t_per_ha=lower,
                expected_t_per_ha=expected,
                upper_t_per_ha=upper,
                unit="tonnes/hectare",
                source="karnataka_historical_fallback",
                confidence="low",
                available=True,
                unavailable_reason=note,
            )

    # -----------------------------------------------------------------------
    # Fallback: unavailable
    # -----------------------------------------------------------------------
    logger.info("No yield records found for '%s' in district '%s'.", canonical_crop, canonical_district)
    return YieldResult(
        crop=canonical_crop,
        available=False,
        unavailable_reason=f"No verified yield observations found for '{canonical_crop}' in current datasets.",
    )
