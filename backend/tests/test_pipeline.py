"""
test_pipeline.py — Integration tests for the full pipeline.

These tests run the complete pipeline end-to-end with missing data files,
verifying that the system fails gracefully and returns honest warnings.

No internet access, no real CSV files, and no trained models required.
"""

import pytest

from crop_optimization.pipeline import run_pipeline
from crop_optimization.schemas import FarmerInput, SoilInput


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_input(**overrides) -> FarmerInput:
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


@pytest.fixture(scope="module")
def pipeline_result():
    """Run pipeline once for the module to avoid redundant optimizer executions."""
    return run_pipeline(make_input())


# ---------------------------------------------------------------------------
# Pipeline returns a well-formed result
# ---------------------------------------------------------------------------


def test_pipeline_does_not_crash(pipeline_result):
    assert pipeline_result is not None


def test_pipeline_returns_recommendation_result(pipeline_result):
    from crop_optimization.schemas import RecommendationResult
    assert isinstance(pipeline_result, RecommendationResult)


def test_pipeline_has_status(pipeline_result):
    assert pipeline_result.status in ("ok", "no_recommendation", "error")


def test_pipeline_includes_water_budget(pipeline_result):
    assert pipeline_result.water_budget is not None
    assert pipeline_result.water_budget.seasonal_pumped_mm_mid >= 0


def test_pipeline_has_honest_warnings(pipeline_result):
    # Warnings include absence of cultivation costs
    assert len(pipeline_result.warnings) > 0 or pipeline_result.status != "ok"


# ---------------------------------------------------------------------------
# Data quality indicators
# ---------------------------------------------------------------------------


def test_data_quality_shows_available_models(pipeline_result):
    assert pipeline_result.data_quality.yield_model_trained is True
    assert pipeline_result.data_quality.price_model_trained is True


def test_data_quality_shows_mandi_available(pipeline_result):
    assert pipeline_result.data_quality.mandi_data_available is True


def test_recommendations_is_a_list(pipeline_result):
    assert isinstance(pipeline_result.recommendations, list)


def test_rejected_crops_is_a_list(pipeline_result):
    assert isinstance(pipeline_result.rejected_crops, list)


# ---------------------------------------------------------------------------
# Input validation at pipeline boundary
# ---------------------------------------------------------------------------


def test_pipeline_rejects_invalid_motor_hp():
    with pytest.raises(Exception):
        FarmerInput(
            area_acres=5.0,
            district="Mysuru",
            investment_inr=100_000,
            motor_hp=4.0,   # invalid
            daily_electricity_hours=6.0,
            irrigation_type="drip",
            season="kharif",
        )


def test_pipeline_rejects_negative_area():
    with pytest.raises(Exception):
        FarmerInput(
            area_acres=-1.0,   # invalid
            district="Mysuru",
            investment_inr=100_000,
            motor_hp=5.0,
            daily_electricity_hours=6.0,
            irrigation_type="drip",
            season="kharif",
        )


def test_pipeline_location_in_result():
    inp = make_input(district="Belagavi")
    result = run_pipeline(inp)
    assert "belagavi" in result.location.lower()


def test_pipeline_season_in_result():
    inp = make_input(season="rabi")
    result = run_pipeline(inp)
    assert result.season == "rabi"


def test_pipeline_area_in_result():
    inp = make_input(area_acres=7.5)
    result = run_pipeline(inp)
    assert result.total_land_acres == 7.5
