"""
test_crop_filter.py — Tests for crop compatibility filtering.

Uses in-memory DataFrames so no real CSV files are needed.
"""

import pandas as pd
import pytest

from crop_optimization.compatibility.crop_filter import filter_crops
from crop_optimization.schemas import FarmerInput, SoilInput, WaterBudgetResult


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_farmer(**overrides) -> FarmerInput:
    defaults = dict(
        area_acres=5.0,
        district="Mysuru",
        investment_inr=150_000,
        motor_hp=5.0,
        daily_electricity_hours=6.0,
        irrigation_type="drip",
        season="kharif",
        soil=SoilInput(ph=6.5, texture="loamy"),
    )
    defaults.update(overrides)
    return FarmerInput(**defaults)


def make_water_budget(total_mm: float = 500.0) -> WaterBudgetResult:
    return WaterBudgetResult(
        estimated_daily_litres_low=10000,
        estimated_daily_litres_mid=12000,
        estimated_daily_litres_high=14000,
        seasonal_pumped_mm_low=400,
        seasonal_pumped_mm_mid=total_mm,
        seasonal_pumped_mm_high=600,
        effective_rainfall_mm=0.0,
        total_available_mm_mid=total_mm,
        warnings=[],
    )


def make_requirements_df(rows: list[dict]) -> pd.DataFrame:
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Season filter
# ---------------------------------------------------------------------------


def test_season_mismatch_rejects_crop():
    df = make_requirements_df([
        {"crop": "wheat", "season": "rabi", "min_ph": 6.0, "max_ph": 7.5,
         "water_requirement_mm": 300, "soil_types": "loamy"}
    ])
    farmer = make_farmer(season="kharif")
    wb = make_water_budget()
    results = filter_crops(farmer, wb, df)
    assert len(results) == 1
    assert results[0].compatible is False
    assert any("season" in r.lower() for r in results[0].failed_constraints)


def test_season_match_passes():
    df = make_requirements_df([
        {"crop": "rice", "season": "kharif", "min_ph": 5.5, "max_ph": 7.0,
         "water_requirement_mm": 400, "soil_types": "loamy,clayey"}
    ])
    farmer = make_farmer(season="kharif")
    wb = make_water_budget(total_mm=500)
    results = filter_crops(farmer, wb, df)
    assert results[0].compatible is True


def test_multi_season_crop_matches():
    """A crop listed as 'kharif,rabi' should match kharif."""
    df = make_requirements_df([
        {"crop": "maize", "season": "kharif,rabi", "min_ph": 5.5, "max_ph": 7.5,
         "water_requirement_mm": 400, "soil_types": "loamy"}
    ])
    farmer = make_farmer(season="kharif")
    wb = make_water_budget(total_mm=500)
    results = filter_crops(farmer, wb, df)
    assert results[0].compatible is True


# ---------------------------------------------------------------------------
# pH filter
# ---------------------------------------------------------------------------


def test_too_acidic_soil_rejects():
    df = make_requirements_df([
        {"crop": "cotton", "season": "kharif", "min_ph": 6.5, "max_ph": 8.0,
         "water_requirement_mm": 400, "soil_types": "black"}
    ])
    farmer = make_farmer(soil=SoilInput(ph=5.0))  # very acidic
    wb = make_water_budget()
    results = filter_crops(farmer, wb, df)
    assert results[0].compatible is False
    assert any("ph" in r.lower() or "acid" in r.lower() for r in results[0].failed_constraints)


def test_too_alkaline_soil_rejects():
    df = make_requirements_df([
        {"crop": "rice", "season": "kharif", "min_ph": 5.0, "max_ph": 6.5,
         "water_requirement_mm": 400, "soil_types": "loamy"}
    ])
    farmer = make_farmer(soil=SoilInput(ph=8.5))
    wb = make_water_budget()
    results = filter_crops(farmer, wb, df)
    assert results[0].compatible is False


def test_missing_soil_ph_skips_ph_check():
    df = make_requirements_df([
        {"crop": "groundnut", "season": "kharif", "min_ph": 6.0, "max_ph": 7.0,
         "water_requirement_mm": 300, "soil_types": "sandy"}
    ])
    farmer = make_farmer(soil=None)
    wb = make_water_budget()
    results = filter_crops(farmer, wb, df)
    # Crop should not be rejected purely because of unknown pH
    # i.e., no failed constraint should mention pH rejection
    assert not any("ph" in r.lower() for r in results[0].failed_constraints)


# ---------------------------------------------------------------------------
# Water filter
# ---------------------------------------------------------------------------


def test_water_requirement_too_high_rejects():
    df = make_requirements_df([
        {"crop": "sugarcane", "season": "kharif", "min_ph": 6.0, "max_ph": 7.5,
         "water_requirement_mm": 1500, "soil_types": "loamy"}
    ])
    farmer = make_farmer()
    wb = make_water_budget(total_mm=500)  # only 500 mm available
    results = filter_crops(farmer, wb, df)
    assert results[0].compatible is False
    assert any("water" in r.lower() for r in results[0].failed_constraints)


def test_water_requirement_fits_passes():
    df = make_requirements_df([
        {"crop": "millet", "season": "kharif", "min_ph": 5.5, "max_ph": 7.5,
         "water_requirement_mm": 250, "soil_types": "sandy"}
    ])
    farmer = make_farmer()
    wb = make_water_budget(total_mm=500)
    results = filter_crops(farmer, wb, df)
    assert results[0].compatible is True


# ---------------------------------------------------------------------------
# Multiple crops
# ---------------------------------------------------------------------------


def test_mixed_compatible_and_rejected():
    df = make_requirements_df([
        {"crop": "rice", "season": "kharif", "min_ph": 5.5, "max_ph": 7.0,
         "water_requirement_mm": 400, "soil_types": "loamy"},
        {"crop": "sugarcane", "season": "kharif", "min_ph": 6.0, "max_ph": 7.5,
         "water_requirement_mm": 1500, "soil_types": "loamy"},
        {"crop": "wheat", "season": "rabi", "min_ph": 6.0, "max_ph": 7.5,
         "water_requirement_mm": 300, "soil_types": "loamy"},
    ])
    farmer = make_farmer(season="kharif", soil=SoilInput(ph=6.5, texture="loamy"))
    wb = make_water_budget(total_mm=500)
    results = filter_crops(farmer, wb, df)

    by_crop = {r.crop: r for r in results}
    assert by_crop["rice"].compatible is True
    assert by_crop["sugarcane"].compatible is False   # water
    assert by_crop["wheat"].compatible is False       # season


# ---------------------------------------------------------------------------
# Missing crop_requirements
# ---------------------------------------------------------------------------


def test_missing_requirements_returns_empty():
    farmer = make_farmer()
    wb = make_water_budget()
    results = filter_crops(farmer, wb, crop_requirements_df=None)
    assert results == []


# ---------------------------------------------------------------------------
# Score sanity
# ---------------------------------------------------------------------------


def test_compatible_crop_score_between_0_and_1():
    df = make_requirements_df([
        {"crop": "maize", "season": "kharif", "min_ph": 5.5, "max_ph": 7.5,
         "water_requirement_mm": 300, "soil_types": "loamy"}
    ])
    farmer = make_farmer(soil=SoilInput(ph=6.5, texture="loamy"))
    wb = make_water_budget(total_mm=500)
    results = filter_crops(farmer, wb, df)
    assert 0.0 <= results[0].score <= 1.0


def test_rejected_crop_has_zero_score():
    df = make_requirements_df([
        {"crop": "wheat", "season": "rabi", "min_ph": 6.0, "max_ph": 7.5,
         "water_requirement_mm": 300, "soil_types": "loamy"}
    ])
    farmer = make_farmer(season="kharif")
    wb = make_water_budget()
    results = filter_crops(farmer, wb, df)
    assert results[0].score == 0.0
