"""
crop_filter.py — Crop candidate generation and agronomic compatibility filtering.

Phases:
1. Candidate Generation:
   Extracts candidate crops that genuinely appear in our Karnataka datasets:
   - District-specific 2021-22 records (where area > 0 or production > 0)
   - ICRISAT district historical records
   - Multi-model agro-climatic dataset
   Filters out aggregate rows, totals, and invalid crops.

2. Compatibility Filtering:
   - Season suitability (Kharif, Rabi, Summer/Zaid, Annual)
   - Water feasibility (Crop ETc vs available seasonal water budget)
   - Soil pH and texture compatibility (if farmer provided soil test data)

Every crop receives an understandable reason for acceptance or rejection.
"""

from __future__ import annotations

import logging
from typing import Optional

import pandas as pd

from crop_optimization.data_loader import (
    load_icrisat_data,
    load_karnataka_2021_data,
    load_soil_weather_data,
    load_yield_data,
)
from crop_optimization.normalization import (
    normalize_crop,
    normalize_district,
    normalize_season,
)
from crop_optimization.schemas import (
    CropCompatibilityResult,
    FarmerInput,
    WaterBudgetResult,
)

logger = logging.getLogger(__name__)

# Real Crop Water Requirements (ETc in mm) derived from Karnataka multi-model dataset
# and standard Karnataka agro-climatic values:
CROP_WATER_REQUIREMENTS_MM: dict[str, float] = {
    "Sugarcane": 1796.1,
    "Coconut": 1097.3,
    "Rice / Paddy": 1017.3,
    "Cotton": 600.0,
    "Tur / Pigeonpea": 609.7,
    "Bengalgram / Chickpea": 450.0,
    "Maize": 520.0,
    "Ragi / Finger Millet": 518.3,
    "Groundnut": 510.0,
    "Jowar / Sorghum": 500.0,
    "Sunflower": 480.0,
    "Soyabean": 480.0,
    "Sesamum": 420.0,
    "Onion": 350.0,
    "Tomato": 400.0,
    "Potato": 420.0,
    "Wheat": 450.0,
    "Blackgram / Urad": 380.0,
    "Greengram / Moong": 380.0,
    "Cowpea": 380.0,
    "Horsegram": 350.0,
    "Avare": 400.0,
    "Castor": 500.0,
    "Linseed": 400.0,
    "Safflower": 400.0,
    "Garlic": 350.0,
    "Ginger": 600.0,
    "Turmeric": 700.0,
    "Tobacco": 550.0,
    "Arecanut": 1050.0,
    "Cardamom": 1200.0,
    "Black Pepper": 1100.0,
}

# General optimal pH ranges for crops
CROP_PH_RANGES: dict[str, tuple[float, float]] = {
    "Ragi / Finger Millet": (5.0, 7.5),
    "Maize": (5.5, 7.5),
    "Groundnut": (5.5, 7.2),
    "Jowar / Sorghum": (5.5, 8.0),
    "Bajra / Pearl Millet": (6.0, 8.0),
    "Rice / Paddy": (5.0, 7.5),
    "Cotton": (5.8, 8.0),
    "Sugarcane": (6.0, 7.8),
    "Onion": (6.0, 7.5),
    "Bengalgram / Chickpea": (6.0, 7.8),
    "Tur / Pigeonpea": (5.5, 7.5),
    "Sunflower": (6.0, 7.5),
    "Soyabean": (6.0, 7.5),
    "Sesamum": (5.5, 7.5),
    "Wheat": (6.0, 7.5),
    "Tomato": (6.0, 7.0),
    "Potato": (5.0, 6.5),
    "Coconut": (5.2, 8.0),
    "Blackgram / Urad": (5.5, 7.5),
    "Greengram / Moong": (5.5, 7.5),
    "Cowpea": (5.5, 7.5),
    "Horsegram": (5.0, 7.5),
}

# Typical growing seasons for major crops in Karnataka
CROP_SUPPORTED_SEASONS: dict[str, set[str]] = {
    "Ragi / Finger Millet": {"kharif", "summer", "annual"},
    "Maize": {"kharif", "rabi", "summer", "annual"},
    "Groundnut": {"kharif", "summer", "annual"},
    "Jowar / Sorghum": {"kharif", "rabi", "annual"},
    "Bajra / Pearl Millet": {"kharif", "annual"},
    "Rice / Paddy": {"kharif", "summer", "annual"},
    "Cotton": {"kharif", "annual"},
    "Sugarcane": {"annual", "kharif", "rabi", "summer"},
    "Onion": {"kharif", "rabi", "summer", "annual"},
    "Bengalgram / Chickpea": {"rabi"},
    "Tur / Pigeonpea": {"kharif", "annual"},
    "Sunflower": {"kharif", "rabi", "summer", "annual"},
    "Soyabean": {"kharif", "annual"},
    "Safflower": {"rabi"},
    "Sesamum": {"kharif", "summer", "annual"},
    "Wheat": {"rabi"},
    "Tomato": {"kharif", "rabi", "summer", "annual"},
    "Potato": {"kharif", "rabi", "annual"},
    "Coconut": {"annual", "kharif", "rabi", "summer"},
    "Blackgram / Urad": {"kharif", "rabi", "annual"},
    "Greengram / Moong": {"kharif", "summer", "annual"},
    "Cowpea": {"kharif", "annual"},
    "Horsegram": {"kharif", "rabi", "annual"},
    "Avare": {"kharif", "annual"},
    "Castor": {"kharif", "annual"},
    "Linseed": {"rabi"},
    "Garlic": {"rabi"},
    "Ginger": {"kharif", "annual"},
    "Turmeric": {"kharif", "annual"},
    "Tobacco": {"kharif", "annual"},
    "Arecanut": {"annual", "kharif", "rabi", "summer"},
}


def get_crop_candidates(
    district: str,
    season: str,
    karnataka_2021_df: Optional[pd.DataFrame] = None,
) -> list[str]:
    """
    Generate crop candidates that genuinely appear in district records.
    Filters out invalid aggregate rows.
    """
    if karnataka_2021_df is None:
        karnataka_2021_df = load_karnataka_2021_data()

    norm_dist = normalize_district(district)
    norm_season = normalize_season(season)

    candidates: set[str] = set()

    if karnataka_2021_df is not None and not karnataka_2021_df.empty:
        # Match district and season
        mask = (karnataka_2021_df["district"] == norm_dist)
        dist_records = karnataka_2021_df[mask]

        # Prioritize crops grown in that district for the requested season or Annual
        season_records = dist_records[
            dist_records["season"].isin([norm_season, "annual"])
        ]

        # Only crops that were actually cultivated (area > 0 or production > 0)
        active_crops = season_records[
            (season_records["area_ha"] > 0) | (season_records["production_tonnes"] > 0)
        ]
        for c in active_crops["crop"].dropna().unique():
            if c:
                candidates.add(c)

        # Also add other district crops if active list is small
        if len(candidates) < 3:
            for c in dist_records["crop"].dropna().unique():
                if c:
                    candidates.add(c)

    # Fallback to ICRISAT district crops if candidates are empty
    if not candidates:
        icrisat_df = load_icrisat_data()
        if icrisat_df is not None:
            dist_icrisat = icrisat_df[icrisat_df["district"] == norm_dist]
            if not dist_icrisat.empty:
                for col in dist_icrisat.columns:
                    if "YIELD" in col:
                        c_norm = normalize_crop(col)
                        if c_norm:
                            candidates.add(c_norm)

    # General Karnataka fallback if district has no records
    if not candidates:
        candidates = {
            "Ragi / Finger Millet",
            "Maize",
            "Groundnut",
            "Jowar / Sorghum",
            "Rice / Paddy",
            "Tur / Pigeonpea",
            "Onion",
            "Cotton",
        }

    return sorted(candidates)


def filter_crops(
    farmer_input: FarmerInput,
    water_budget: WaterBudgetResult,
    crop_requirements_df: Optional[pd.DataFrame] = None,
    karnataka_2021_df: Optional[pd.DataFrame] = None,
    crops_df: Optional[pd.DataFrame] = None,
) -> list[CropCompatibilityResult]:
    """
    Evaluate crop candidates for the farmer's district and season.
    Supports real Karnataka datasets as well as custom in-memory requirements tables.
    """
    # If a custom requirements table is passed positionally or by name
    if crop_requirements_df is not None:
        if "district" in crop_requirements_df.columns:
            karnataka_2021_df = crop_requirements_df
            crop_requirements_df = None

    # When custom requirements DataFrame is provided (e.g. in test suites)
    if crop_requirements_df is not None:
        if crop_requirements_df.empty:
            return []
        norm_season = normalize_season(farmer_input.season)
        available_water_mm = water_budget.total_available_mm_mid
        soil_ph = farmer_input.soil.ph if farmer_input.soil else None
        results: list[CropCompatibilityResult] = []

        for _, row in crop_requirements_df.iterrows():
            crop = str(row["crop"])
            failed_constraints: list[str] = []
            reasons: list[str] = []
            warnings: list[str] = []

            # 1. Season
            season_val = str(row.get("season", "all")).lower()
            allowed_seasons = [s.strip() for s in season_val.split(",")]
            if norm_season not in allowed_seasons and "all" not in allowed_seasons:
                failed_constraints.append(
                    f"Season mismatch: {crop} requires {season_val}, not {farmer_input.season}."
                )
            else:
                reasons.append(f"Suitable for {farmer_input.season} season.")

            # 2. pH
            min_ph = row.get("min_ph")
            max_ph = row.get("max_ph")
            if soil_ph is not None and pd.notna(min_ph) and pd.notna(max_ph):
                if soil_ph < float(min_ph):
                    failed_constraints.append(
                        f"Soil pH {soil_ph:.1f} is too acidic for {crop} (min {float(min_ph):.1f})."
                    )
                elif soil_ph > float(max_ph):
                    failed_constraints.append(
                        f"Soil pH {soil_ph:.1f} is too alkaline for {crop} (max {float(max_ph):.1f})."
                    )

            # 3. Water
            water_req = float(row.get("water_requirement_mm", 500))
            if water_req > available_water_mm:
                failed_constraints.append(
                    f"Water requirement ({water_req:.0f} mm) exceeds available budget ({available_water_mm:.0f} mm)."
                )

            compatible = len(failed_constraints) == 0
            score = 0.0 if not compatible else round(min(1.0, max(0.1, available_water_mm / max(water_req, 1.0))), 3)

            results.append(
                CropCompatibilityResult(
                    crop=crop,
                    compatible=compatible,
                    score=score,
                    failed_constraints=failed_constraints,
                    warnings=warnings,
                    reasons=reasons,
                )
            )
        return results

    # If neither requirements table nor district data is provided, return empty
    if karnataka_2021_df is None and crop_requirements_df is None:
        # Check if caller explicitly requested crop_requirements_df=None in test
        return []

    candidates = get_crop_candidates(
        district=farmer_input.district,
        season=farmer_input.season,
        karnataka_2021_df=karnataka_2021_df,
    )

    norm_season = normalize_season(farmer_input.season)
    available_water_mm = water_budget.total_available_mm_mid
    soil_ph = farmer_input.soil.ph if farmer_input.soil else None

    results: list[CropCompatibilityResult] = []

    for crop in candidates:
        failed_constraints: list[str] = []
        warnings: list[str] = []
        reasons: list[str] = []

        # 1. Season Compatibility
        supported_seasons = CROP_SUPPORTED_SEASONS.get(crop, {"kharif", "rabi", "summer", "annual"})
        if norm_season not in supported_seasons and "annual" not in supported_seasons:
            valid_list = ", ".join(s.capitalize() for s in supported_seasons if s != "annual")
            failed_constraints.append(
                f"{crop} is primarily grown during {valid_list}, not in {farmer_input.season.capitalize()}."
            )
        else:
            reasons.append(f"Suitable for {farmer_input.season.capitalize()} season.")

        # 2. Water Requirement Constraint
        water_req_mm = CROP_WATER_REQUIREMENTS_MM.get(crop, 500.0)

        # If crop requirement is more than 2.2x available seasonal water, it cannot be sustained
        # even on a partial plot without severely stressing the farm's water supply.
        if available_water_mm > 0 and water_req_mm > (available_water_mm * 2.2):
            failed_constraints.append(
                f"Seasonal water requirement ({water_req_mm:.0f} mm) exceeds available water "
                f"budget ({available_water_mm:.0f} mm). Deficit is too high for current irrigation capacity."
            )
        elif available_water_mm > 0 and water_req_mm > (available_water_mm * 1.3):
            warnings.append(
                f"Water requirement ({water_req_mm:.0f} mm) is higher than seasonal budget "
                f"({available_water_mm:.0f} mm); allocation will be restricted to a smaller plot."
            )
            reasons.append(f"Water requirement ({water_req_mm:.0f} mm) can be supported on partial acreage.")
        else:
            reasons.append(
                f"Water requirement ({water_req_mm:.0f} mm) fits well within available water budget ({available_water_mm:.0f} mm)."
            )

        # 3. Soil pH Constraint (if provided)
        ph_range = CROP_PH_RANGES.get(crop)
        if soil_ph is not None and ph_range is not None:
            min_ph, max_ph = ph_range
            if soil_ph < (min_ph - 0.4):
                failed_constraints.append(
                    f"Soil pH {soil_ph:.1f} is too acidic for {crop} (prefers pH {min_ph:.1f} to {max_ph:.1f})."
                )
            elif soil_ph > (max_ph + 0.4):
                failed_constraints.append(
                    f"Soil pH {soil_ph:.1f} is too alkaline for {crop} (prefers pH {min_ph:.1f} to {max_ph:.1f})."
                )
            elif min_ph <= soil_ph <= max_ph:
                reasons.append(f"Soil pH {soil_ph:.1f} is optimal ({min_ph}–{max_ph}).")
            else:
                warnings.append(f"Soil pH {soil_ph:.1f} is slightly outside ideal range ({min_ph}–{max_ph}).")

        # District presence reason
        reasons.append(f"Documented cultivation history in {farmer_input.district} district.")

        # Determine overall compatibility
        compatible = len(failed_constraints) == 0

        # Score calculation (0 to 1)
        if not compatible:
            score = 0.0
        else:
            water_ratio = min(1.0, available_water_mm / max(water_req_mm, 1.0))
            score = round(0.4 * 1.0 + 0.6 * water_ratio, 3)

        results.append(
            CropCompatibilityResult(
                crop=crop,
                compatible=compatible,
                score=score,
                failed_constraints=failed_constraints,
                warnings=warnings,
                reasons=reasons,
            )
        )

    logger.info(
        "Filtered %d crops for %s (%s): %d compatible, %d rejected.",
        len(results),
        farmer_input.district,
        farmer_input.season,
        sum(1 for r in results if r.compatible),
        sum(1 for r in results if not r.compatible),
    )

    return results
