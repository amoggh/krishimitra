"""
water_budget.py — Engineering-based seasonal water availability estimation.

Approach
--------
1. Estimate pump flow rate from motor HP using a standard engineering lookup.
   Applies a head penalty factor for deep borewells (>300 ft).
   Flow rate is reported with uncertainty (low, mid, high).

2. Calculate daily pumped volume:
   daily_pumped = flow_rate (L/hr) × daily_electricity_hours

3. Apply irrigation method application efficiency:
   - drip:      92% effective (0.90 – 0.95)
   - sprinkler: 80% effective (0.75 – 0.85)
   - furrow:    55% effective (0.50 – 0.65)
   - flood:     55% effective (0.45 – 0.60)

4. Compute seasonal pumped water:
   seasonal_pumped_litres = daily_effective_litres × season_days
   (Kharif: 120 days, Rabi: 120 days, Summer/Zaid: 90 days)

5. Convert pumped litres to mm equivalent over farmer's total land:
   mm = litres / (area_acres × 4046.86 m²/acre)

6. Look up real seasonal effective rainfall from multi-model agro-climatic dataset.
   Falls back to Karnataka seasonal average if district-specific records are absent.

7. Total seasonal water budget = seasonal pumped (mm) + effective rainfall (mm).
   Also returns available_water_liters and available_water_m3.
"""

from __future__ import annotations

import logging
from typing import Optional

import pandas as pd

from crop_optimization.config import (
    BOREWELL_DEPTH_HIGH_THRESHOLD_FT,
    DEEP_BOREWELL_FLOW_PENALTY,
    EFFECTIVE_RAINFALL_FRACTION,
    GROUNDWATER_PUMP_DERATE,
    IRRIGATION_EFFICIENCY,
    PUMP_FLOW_RATE_LPH_PER_HP,
)
from crop_optimization.data_loader import (
    load_groundwater_stress,
    load_imd_rainfall,
    load_soil_weather_data,
)
from crop_optimization.normalization import normalize_district, normalize_season
from crop_optimization.schemas import FarmerInput, WaterBudgetResult

logger = logging.getLogger(__name__)

# Season duration in days
SEASON_DAYS: dict[str, int] = {
    "kharif": 120,
    "rabi": 120,
    "zaid": 90,
    "summer": 90,
}


def _estimate_pump_flow_lph(
    motor_hp: float,
    borewell_depth_ft: Optional[float],
) -> tuple[float, float]:
    """
    Return (low_lph, high_lph) pump discharge estimates.
    Applies head penalty for deep borewells (>300 ft).
    """
    # Find closest supported HP
    if motor_hp in PUMP_FLOW_RATE_LPH_PER_HP:
        low, high = PUMP_FLOW_RATE_LPH_PER_HP[motor_hp]
    else:
        # Interpolate proportionally to HP
        low, high = 500.0 * motor_hp, 800.0 * motor_hp

    if borewell_depth_ft is not None and borewell_depth_ft > BOREWELL_DEPTH_HIGH_THRESHOLD_FT:
        low *= DEEP_BOREWELL_FLOW_PENALTY
        high *= DEEP_BOREWELL_FLOW_PENALTY
        logger.debug(
            "Deep borewell (%.0f ft > %d ft): applied flow penalty %.2f",
            borewell_depth_ft,
            BOREWELL_DEPTH_HIGH_THRESHOLD_FT,
            DEEP_BOREWELL_FLOW_PENALTY,
        )

    return low, high


def _groundwater_stress(district: str) -> tuple[Optional[float], Optional[str]]:
    """(stage_of_extraction_pct, category) for the district from GWRA 2023, or (None, None)."""
    gw = load_groundwater_stress()
    canonical = normalize_district(district) or district
    if gw is None or canonical not in gw.index:
        return None, None
    row = gw.loc[canonical]
    return float(row["stage_of_extraction_pct"]), str(row["category"])


def _imd_row(district: str, season: str) -> Optional[pd.Series]:
    """IMD district × season rainfall row (p25_mm, median_mm, ...), or None."""
    imd = load_imd_rainfall()
    if imd is None or imd.empty:
        return None
    canonical_district = normalize_district(district) or district
    canonical_season = normalize_season(season)
    imd_season = "summer" if canonical_season == "zaid" else canonical_season
    hit = imd[(imd["district"] == canonical_district) & (imd["season"] == imd_season)]
    return None if hit.empty else hit.iloc[0]


def _get_dry_year_rainfall_mm(district: str, season: str) -> Optional[float]:
    """Effective rainfall in a dry year (IMD 25th percentile × effective fraction), or None."""
    row = _imd_row(district, season)
    if row is None:
        return None
    return round(float(row["p25_mm"]) * EFFECTIVE_RAINFALL_FRACTION, 1)


def _get_effective_rainfall_mm(
    district: str,
    season: str,
    multi_model_df: Optional[pd.DataFrame] = None,
) -> tuple[float, list[str]]:
    """
    Effective seasonal rainfall (mm) = EFFECTIVE_RAINFALL_FRACTION × seasonal rainfall.

    Preferred source: IMD gridded rainfall, MEDIAN over 10 years for the district and
    season (a typical year) — plans are sized on this. The dry-year (25th percentile)
    figure is reported separately by _get_dry_year_rainfall_mm for the risk warning.
    Falls back to the multi-model dataset, then a regional baseline.
    Returns (effective_rainfall_mm, warnings).
    """
    warnings: list[str] = []

    row = _imd_row(district, season)
    if row is not None:
        eff_rain = round(float(row["median_mm"]) * EFFECTIVE_RAINFALL_FRACTION, 1)
        logger.debug("IMD median rainfall for %s (%s): %.1f mm (effective %.1f mm)",
                     district, season, row["median_mm"], eff_rain)
        return eff_rain, warnings

    if multi_model_df is None or multi_model_df.empty:
        warnings.append(
            "Agro-climatic weather/rainfall data unavailable. Rainfall contribution set to zero."
        )
        return 0.0, warnings

    canonical_district = normalize_district(district)
    canonical_season = normalize_season(season)

    # Filter district and season
    district_rows = multi_model_df[
        (multi_model_df["district"] == canonical_district)
        & (multi_model_df["season"] == canonical_season)
    ]

    # Prioritize seasonal Rainfall_mm * EFFECTIVE_RAINFALL_FRACTION
    if not district_rows.empty and "Rainfall_mm" in district_rows.columns:
        mean_rain = float(district_rows["Rainfall_mm"].dropna().mean())
        eff_rain = round(mean_rain * EFFECTIVE_RAINFALL_FRACTION, 1)
        logger.debug(
            "District rainfall for %s (%s): %.1f mm (effective=%.1f mm)",
            canonical_district, canonical_season, mean_rain, eff_rain
        )
        return eff_rain, warnings

    # Fallback to Karnataka seasonal average
    season_rows = multi_model_df[multi_model_df["season"] == canonical_season]
    if not season_rows.empty and "Rainfall_mm" in season_rows.columns:
        mean_rain = float(season_rows["Rainfall_mm"].dropna().mean())
        eff_rain = round(mean_rain * EFFECTIVE_RAINFALL_FRACTION, 1)
        warnings.append(
            f"Effective rainfall ({eff_rain:.1f} mm) based on Karnataka state seasonal average; "
            f"district records for '{district}' were not directly aligned."
        )
        return eff_rain, warnings

    # Default conservative seasonal estimates from Karnataka records
    defaults = {"kharif": 230.0, "rabi": 120.0, "summer": 80.0}
    default_val = defaults.get(canonical_season, 150.0)
    warnings.append(
        f"Using regional seasonal baseline rainfall of {default_val:.1f} mm for {season}."
    )
    return default_val, warnings


def calculate_water_budget(
    farmer_input: FarmerInput,
    weather_df: Optional[pd.DataFrame] = None,
) -> WaterBudgetResult:
    """
    Calculate seasonal water availability from pump discharge and effective rainfall.
    """
    warnings: list[str] = []

    # 1. Pump flow rate
    flow_low_lph, flow_high_lph = _estimate_pump_flow_lph(
        farmer_input.motor_hp,
        farmer_input.borewell_depth_ft,
    )
    flow_mid_lph = (flow_low_lph + flow_high_lph) / 2.0

    # 2. Daily pumped volume
    hours = farmer_input.daily_electricity_hours
    daily_pumped_low = flow_low_lph * hours
    daily_pumped_mid = flow_mid_lph * hours
    daily_pumped_high = flow_high_lph * hours

    # 3. Irrigation efficiency
    eff_low, eff_mid, eff_high = IRRIGATION_EFFICIENCY.get(
        farmer_input.irrigation_type.lower(), (0.50, 0.55, 0.65)
    )

    daily_eff_low = daily_pumped_low * eff_low
    daily_eff_mid = daily_pumped_mid * eff_mid
    daily_eff_high = daily_pumped_high * eff_high

    # 3b. Groundwater stress (CGWB GWRA 2023): derate borewell output where the
    #     aquifer is over-drawn, since water tables and well yields are falling.
    gw_stage, gw_category = _groundwater_stress(farmer_input.district)
    derate = GROUNDWATER_PUMP_DERATE.get(gw_category or "", 1.0)
    if derate < 1.0:
        daily_eff_low *= derate
        daily_eff_mid *= derate
        daily_eff_high *= derate
    if gw_category in ("over_exploited", "critical"):
        warnings.append(
            f"Groundwater in {farmer_input.district} is {gw_category.replace('_', '-')} "
            f"(extraction is {gw_stage:.0f}% of the safe annual recharge, CGWB 2023). Borewell output "
            f"is counted at {derate:.0%} because water tables are falling; avoid water-hungry crops "
            "and prefer drip or sprinkler irrigation."
        )
    elif gw_category == "semi_critical":
        warnings.append(
            f"Groundwater in {farmer_input.district} is semi-critical (extraction at {gw_stage:.0f}% "
            "of safe recharge, CGWB 2023). Use water-efficient irrigation to avoid over-drawing the borewell."
        )

    # 4. Seasonal pumped water in mm
    norm_season = normalize_season(farmer_input.season)
    season_days = SEASON_DAYS.get(norm_season, 120)
    area_m2 = farmer_input.area_acres * 4046.86

    def litres_to_mm(daily_litres: float) -> float:
        total_litres = daily_litres * season_days
        return total_litres / area_m2 if area_m2 > 0 else 0.0

    seasonal_pumped_low_mm = litres_to_mm(daily_eff_low)
    seasonal_pumped_mid_mm = litres_to_mm(daily_eff_mid)
    seasonal_pumped_high_mm = litres_to_mm(daily_eff_high)

    # 5. Effective rainfall
    eff_rain_mm, rain_warnings = _get_effective_rainfall_mm(
        farmer_input.district,
        farmer_input.season,
        weather_df,
    )
    warnings.extend(rain_warnings)
    dry_rain_mm = _get_dry_year_rainfall_mm(farmer_input.district, farmer_input.season)

    # 6. Total available water
    total_available_mid_mm = seasonal_pumped_mid_mm + eff_rain_mm

    # 7. Conversions to volume (m³ and Litres)
    # 1 mm over 1 m² = 1 Litre = 0.001 m³
    available_water_liters = total_available_mid_mm * area_m2
    available_water_m3 = available_water_liters / 1000.0

    if farmer_input.daily_electricity_hours < 4:
        warnings.append(
            f"Daily electricity ({farmer_input.daily_electricity_hours:.1f} hrs) is restricted, "
            "limiting pump discharge. High water requirement crops will be constrained."
        )

    if farmer_input.borewell_depth_ft is None:
        warnings.append(
            "Borewell depth not specified. Estimated flow rate assumes moderate head."
        )

    calc_method = (
        f"Pump: {farmer_input.motor_hp} HP motor (~{flow_mid_lph:,.0f} L/hr) x "
        f"{farmer_input.daily_electricity_hours:.1f} hrs/day x {season_days} days x "
        f"{farmer_input.irrigation_type.capitalize()} efficiency ({eff_mid:.0%}) = "
        f"{seasonal_pumped_mid_mm:.1f} mm pumped; + effective rainfall {eff_rain_mm:.1f} mm = "
        f"{total_available_mid_mm:.1f} mm total."
    )
    uncertainty_note = (
        "Motor HP alone does not uniquely fix flow rate. Flow rate uncertainty is estimated at +/- 25%. "
        "Plans are sized on the median (typical-year) season rainfall from 10 years of IMD gridded data, "
        f"of which {EFFECTIVE_RAINFALL_FRACTION:.0%} is counted as effective. The dry-year (25th percentile) "
        "figure is used to warn when a drier season would leave crops short of water."
    )

    return WaterBudgetResult(
        estimated_daily_litres_low=round(daily_eff_low, 1),
        estimated_daily_litres_mid=round(daily_eff_mid, 1),
        estimated_daily_litres_high=round(daily_eff_high, 1),
        seasonal_pumped_mm_low=round(seasonal_pumped_low_mm, 1),
        seasonal_pumped_mm_mid=round(seasonal_pumped_mid_mm, 1),
        seasonal_pumped_mm_high=round(seasonal_pumped_high_mm, 1),
        effective_rainfall_mm=round(eff_rain_mm, 1),
        effective_rainfall_dry_year_mm=dry_rain_mm,
        rainfall_basis="imd_median" if dry_rain_mm is not None else "fallback",
        groundwater_stage_pct=gw_stage,
        groundwater_category=gw_category,
        groundwater_pump_derate=derate,
        total_available_mm_mid=round(total_available_mid_mm, 1),
        available_water_liters=round(available_water_liters, 0),
        available_water_m3=round(available_water_m3, 1),
        calculation_method=calc_method,
        uncertainty_note=uncertainty_note,
        warnings=warnings,
    )
