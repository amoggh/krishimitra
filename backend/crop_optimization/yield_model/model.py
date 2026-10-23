"""
yield_model/model.py — Real data-driven crop yield estimation interface.

Hierarchy:
  Level ML: Random Forest (crop × district, trained 2011–2017) with a split conformal
           80% interval calibrated on 2021-22. Only for crops the model was trained on.
           Source: "conformal_rf_model". See train_yield_model.py and conformal.py.
  Level A: Karnataka Government 2021-22 recent district-level observed yield.
           Confidence: "high", Source: "district_2021_22".
  Level B: ICRISAT district-level historical observations (quantiles: P10, median, P90).
           Confidence: "medium", Source: "district_icrisat_historical".
  Level C: Karnataka-wide historical yield dataset 1997-2020 (quantiles: P10, median, P90).
           Confidence: "low", Source: "karnataka_historical_fallback".
           Notes: Yield estimate based on Karnataka-level historical data because
                  sufficient district-level observations were unavailable.

Levels A–C and the benchmark still use heuristic bands (not conformal).
"""

from __future__ import annotations

import logging
import math
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
from crop_optimization.yield_model.conformal import interval as conformal_interval
from crop_optimization.yield_model.conformal import quantile_for as conformal_quantile_for

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


import warnings
from pathlib import Path

YIELD_MODEL_SOURCE = "conformal_rf_model"

_CACHED_YIELD_MODEL: Optional[dict] = None
_YIELD_MODEL_LOADED = False


def _get_yield_model() -> Optional[dict]:
    """
    Load the trained model with its conformal calibration and metadata.

    Returns None unless all three artifacts exist (written by train_yield_model.py),
    so a model without calibrated intervals is never used.
    """
    global _CACHED_YIELD_MODEL, _YIELD_MODEL_LOADED
    if not _YIELD_MODEL_LOADED:
        _YIELD_MODEL_LOADED = True
        model_dir = Path(__file__).parent.parent.parent / "artifacts" / "yield_model"
        paths = {
            "pipeline": model_dir / "yield_model.joblib",
            "conformal": model_dir / "conformal.json",
            "metadata": model_dir / "metadata.json",
        }
        if all(p.exists() for p in paths.values()):
            try:
                import json

                import joblib
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    pipeline = joblib.load(paths["pipeline"])
                # Single-row predictions: parallel workers only add overhead and warnings
                regressor = getattr(pipeline, "named_steps", {}).get("regressor")
                if regressor is not None and hasattr(regressor, "n_jobs"):
                    regressor.n_jobs = 1
                conformal = json.loads(paths["conformal"].read_text(encoding="utf-8"))
                metadata = json.loads(paths["metadata"].read_text(encoding="utf-8"))
                _CACHED_YIELD_MODEL = {
                    "pipeline": pipeline,
                    "conformal": conformal,
                    "crops": set(metadata.get("crops_covered", [])),
                    "features": metadata.get("features", ["crop", "district"]),
                    "log_target": metadata.get("target_transform") == "log",
                }
            except Exception as exc:
                logger.warning("Could not load yield model artifacts: %s", exc)
        else:
            logger.info("Yield model artifacts incomplete; using data hierarchy only.")
    return _CACHED_YIELD_MODEL


FALLBACK_BAND_FRACTION = 0.15


def _single_estimate_band(value: float) -> tuple[float, float, str]:
    """
    Uncertainty band for a single-number estimate (one observation or a benchmark).

    Uses the calibrated all-crop conformal band when available, so these estimates
    are not artificially narrower than model predictions; otherwise ±15%.
    """
    ml = _get_yield_model()
    if ml is not None:
        q = float(ml["conformal"]["global"]["q"])
        if math.isfinite(q):
            lower, upper = conformal_interval(value, q)
            return round(lower, 2), round(upper, 2), "conformal_global_band"
    return (
        max(0.1, round(value * (1 - FALLBACK_BAND_FRACTION), 2)),
        round(value * (1 + FALLBACK_BAND_FRACTION), 2),
        "fixed_15pct",
    )


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
    # Level ML: Random Forest + split conformal interval (only for crops it was trained on)
    # -----------------------------------------------------------------------
    ml = _get_yield_model()
    if ml is not None and canonical_crop in ml["crops"]:
        try:
            sample = pd.DataFrame([{"crop": canonical_crop, "district": canonical_district}])[ml["features"]]
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                raw = float(ml["pipeline"].predict(sample)[0])
            pred = math.exp(raw) if ml["log_target"] else raw
            if pred > 0:
                q, scope = conformal_quantile_for(ml["conformal"], canonical_crop)
                if math.isfinite(q):
                    lower, upper = conformal_interval(pred, q)
                    coverage = ml["conformal"].get("coverage_target", 0.8)
                    note = None if scope == "crop" else (
                        f"Interval uses the all-crop calibration band because {canonical_crop} "
                        "had too few calibration records of its own."
                    )
                    logger.info("Conformal yield for %s: %.2f t/ha [%.2f, %.2f] (%s band)",
                                canonical_crop, pred, lower, upper, scope)
                    return YieldResult(
                        crop=canonical_crop,
                        lower_t_per_ha=round(lower, 2),
                        expected_t_per_ha=round(pred, 2),
                        upper_t_per_ha=round(upper, 2),
                        unit="tonnes/hectare",
                        source=YIELD_MODEL_SOURCE,
                        confidence="medium",
                        available=True,
                        interval_method=f"split_conformal_{scope}",
                        coverage_target=coverage,
                        unavailable_reason=note,
                    )
        except Exception as exc:
            logger.warning("Yield model prediction failed for %s: %s", canonical_crop, exc)

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
            expected = round(obs_yield, 2)
            lower, upper, method = _single_estimate_band(obs_yield)

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
                confidence="medium",
                available=True,
                interval_method=method,
                unavailable_reason="Single-season (2021-22) observation; range uses the calibrated all-crop band.",
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
    # Fallback: Regional baseline yield (ensures model never breaks)
    # -----------------------------------------------------------------------
    benchmark_yields = {
        "Ragi / Finger Millet": 2.6,
        "Maize": 3.4,
        "Groundnut": 1.7,
        "Jowar / Sorghum": 1.9,
        "Rice / Paddy": 3.8,
        "Bengalgram / Chickpea": 1.4,
        "Tur / Pigeonpea": 1.3,
        "Cotton": 1.8,
        "Sugarcane": 85.0,
        "Sunflower": 1.2,
        "Soyabean": 1.8,
        "Greengram / Moong": 0.9,
        "Blackgram / Urad": 0.8,
        "Wheat": 2.2,
        "Onion": 14.5,
        "Tomato": 18.0,
    }
    exp_y = benchmark_yields.get(canonical_crop, 2.2)
    logger.info("Using regional baseline yield for '%s': %.2f t/ha", canonical_crop, exp_y)
    lower, upper, method = _single_estimate_band(exp_y)
    return YieldResult(
        crop=canonical_crop,
        lower_t_per_ha=lower,
        expected_t_per_ha=round(exp_y, 2),
        upper_t_per_ha=upper,
        unit="tonnes/hectare",
        source="karnataka_state_benchmark",
        confidence="low",
        available=True,
        interval_method=method,
        unavailable_reason=f"Yield estimate based on regional agro-climatic baseline for '{canonical_crop}'.",
    )

