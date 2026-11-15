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
    from crop_optimization.config import PRICE_MODEL_DIR

    assert pipeline_result.data_quality.yield_model_trained is True
    # Only true when a trained price model artifact actually exists
    expected_price_model = (PRICE_MODEL_DIR / "price_model.joblib").exists()
    assert pipeline_result.data_quality.price_model_trained is expected_price_model


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


# ---------------------------------------------------------------------------
# Water-limited plans
# ---------------------------------------------------------------------------


def test_fit_allocations_to_water_scales_and_reports_fallow():
    from crop_optimization.pipeline import fit_allocations_to_water
    from crop_optimization.schemas import CropAllocation

    allocs = [
        CropAllocation(crop="A", area_acres=3.0, area_hectares=1.21, percentage_of_total=60.0),
        CropAllocation(crop="B", area_acres=2.0, area_hectares=0.81, percentage_of_total=40.0),
    ]
    # need 400 mm, rain 100 mm → 300 mm irrigation per acre × 5 acres = 1500; pump gives 150 × 5 = 750
    fitted, fallow, frac = fit_allocations_to_water(allocs, {"A": 400, "B": 400}, 5.0, pumped_mm=150, rain_mm=100)
    assert sum(a.area_acres for a in fitted) == pytest.approx(2.5, abs=0.02)
    assert fallow == pytest.approx(2.5, abs=0.02)
    assert frac == pytest.approx(0.5, abs=0.01)
    # land split preserved
    assert fitted[0].area_acres / fitted[1].area_acres == pytest.approx(1.5, rel=0.02)


def test_fit_allocations_to_water_leaves_feasible_plans_alone():
    from crop_optimization.pipeline import fit_allocations_to_water
    from crop_optimization.schemas import CropAllocation

    allocs = [CropAllocation(crop="A", area_acres=5.0, area_hectares=2.02, percentage_of_total=100.0)]
    fitted, fallow, frac = fit_allocations_to_water(allocs, {"A": 300}, 5.0, pumped_mm=200, rain_mm=200)
    assert fitted == allocs and fallow == 0.0 and frac == 1.0


def test_severe_water_shortage_returns_no_plan():
    from crop_optimization.pipeline import _run_crop_optimization_internal

    res = _run_crop_optimization_internal(FarmerInput(
        area_acres=5, district="Kalaburagi", investment_inr=150000, motor_hp=1,
        daily_electricity_hours=2, irrigation_type="flood", season="summer",
    ))
    assert res.status == "no_recommendation"
    assert res.recommendations == []
    assert "water" in (res.message or "").lower()
    assert res.summary.get("water_limited") is True


def test_planted_area_never_needs_more_water_than_available():
    from crop_optimization.pipeline import _run_crop_optimization_internal

    res = _run_crop_optimization_internal(FarmerInput(
        area_acres=5, district="Mysuru", investment_inr=150000, motor_hp=5,
        daily_electricity_hours=6, irrigation_type="drip", season="kharif",
    ))
    wb = res.water_budget
    need = sum(c.area_acres * max(0.0, (c.water_requirement_mm or 0) - wb.effective_rainfall_mm)
               for c in res.recommendations)
    assert need <= wb.seasonal_pumped_mm_mid * res.total_land_acres * 1.01
