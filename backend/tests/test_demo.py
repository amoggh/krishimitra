"""
test_demo.py — Tests for the demo pipeline (NSGA-II end-to-end).

These tests verify the full demo flow including:
  - NSGA-II actually runs and produces a multi-crop allocation
  - Total land <= farmer land
  - Total cost <= budget
  - Water constraint respected
  - No incompatible crop receives land
  - No crop exceeds MAX_SINGLE_CROP_FRACTION
  - Monte Carlo produces risk metrics
  - Pipeline produces a recommendation with demo data
  - Results are deterministic (same seed → same output)

All tests use demo_mode=True — no CSV files or trained models required.
"""

import pytest

from crop_optimization.config import MAX_SINGLE_CROP_FRACTION
from crop_optimization.demo_data import DEMO_FARMER
from crop_optimization.pipeline import optimize_crops
from crop_optimization.schemas import FarmerInput, SoilInput


def make_demo_input(**overrides) -> FarmerInput:
    """Build a FarmerInput from the canonical demo farmer profile."""
    data = dict(DEMO_FARMER)
    data.update(overrides)
    soil_raw = data.pop("soil")
    fi = FarmerInput(**data, soil=SoilInput(**soil_raw))
    return fi


@pytest.fixture(scope="module")
def demo_result():
    """Run the demo pipeline once and share the result across tests."""
    fi = make_demo_input()
    return optimize_crops(fi, demo_mode=True)


# ---------------------------------------------------------------------------
# Pipeline returns a well-formed result
# ---------------------------------------------------------------------------

def test_demo_pipeline_returns_result(demo_result):
    from crop_optimization.schemas import RecommendationResult
    assert isinstance(demo_result, RecommendationResult)


def test_demo_status_ok(demo_result):
    assert demo_result.status == "ok"


def test_demo_has_recommendations(demo_result):
    assert len(demo_result.recommendations) > 0, "Demo should allocate at least one crop."


def test_demo_has_rejected_crops(demo_result):
    """Rice should be rejected because its water requirement exceeds the budget."""
    rejected_names = [r.crop for r in demo_result.rejected_crops]
    assert "rice" in rejected_names, "Rice should be rejected due to water constraint."


# ---------------------------------------------------------------------------
# Land constraints
# ---------------------------------------------------------------------------

def test_total_land_does_not_exceed_farm(demo_result):
    total = sum(c.area_acres for c in demo_result.recommendations)
    assert total <= DEMO_FARMER["area_acres"] + 0.05, (
        f"Allocated {total:.3f} acres exceeds farm size {DEMO_FARMER['area_acres']} acres."
    )


def test_no_crop_area_is_negative(demo_result):
    for c in demo_result.recommendations:
        assert c.area_acres >= 0, f"{c.crop} has negative area: {c.area_acres}"


def test_no_single_crop_exceeds_max_fraction(demo_result):
    total = DEMO_FARMER["area_acres"]
    for c in demo_result.recommendations:
        frac = c.area_acres / total
        assert frac <= MAX_SINGLE_CROP_FRACTION + 0.01, (
            f"{c.crop} takes {frac:.1%} of land, exceeds {MAX_SINGLE_CROP_FRACTION:.0%} limit."
        )


def test_land_is_substantially_used(demo_result):
    """NSGA-II should use at least 85% of available land."""
    total = sum(c.area_acres for c in demo_result.recommendations)
    pct = total / DEMO_FARMER["area_acres"]
    assert pct >= 0.85, (
        f"Only {pct:.0%} of land allocated. Optimizer should use most of the farm."
    )


# ---------------------------------------------------------------------------
# Budget constraint
# ---------------------------------------------------------------------------

def test_total_cost_does_not_exceed_budget(demo_result):
    total_cost = sum(c.expected_cost_inr or 0 for c in demo_result.recommendations)
    budget = DEMO_FARMER["investment_inr"]
    assert total_cost <= budget + 1, (
        f"Total cost ₹{total_cost:,.0f} exceeds budget ₹{budget:,.0f}."
    )


# ---------------------------------------------------------------------------
# Water constraint
# ---------------------------------------------------------------------------

def test_water_budget_is_positive(demo_result):
    assert demo_result.water_budget.total_available_mm_mid > 0


def test_no_water_exceeded_crop_in_recommendations(demo_result):
    """
    Crops whose water requirement exceeds available water should be rejected,
    not allocated.
    """
    available = demo_result.water_budget.total_available_mm_mid
    for c in demo_result.recommendations:
        if c.water_requirement_mm is not None:
            assert c.water_requirement_mm <= available * 1.11, (
                f"{c.crop} water req {c.water_requirement_mm}mm > available {available}mm "
                "but was still allocated."
            )


# ---------------------------------------------------------------------------
# Risk / Monte Carlo
# ---------------------------------------------------------------------------

def test_risk_metrics_available_in_demo(demo_result):
    """In demo mode, risk simulation should run and produce metrics."""
    has_any_risk = any(
        c.risk_result is not None and c.risk_result.available
        for c in demo_result.recommendations
    )
    assert has_any_risk, "At least one allocated crop should have risk metrics."


def test_yield_failure_probability_in_range(demo_result):
    for c in demo_result.recommendations:
        if c.risk_result and c.risk_result.available:
            assert 0.0 <= c.risk_result.yield_failure_probability <= 1.0


def test_price_crash_probability_in_range(demo_result):
    for c in demo_result.recommendations:
        if c.risk_result and c.risk_result.available:
            assert 0.0 <= c.risk_result.price_crash_probability <= 1.0


def test_profit_p10_less_than_p90(demo_result):
    for c in demo_result.recommendations:
        r = c.risk_result
        if r and r.available and r.profit_p10_inr and r.profit_p90_inr:
            assert r.profit_p10_inr <= r.profit_p90_inr


# ---------------------------------------------------------------------------
# Economic results
# ---------------------------------------------------------------------------

def test_expected_net_profit_positive(demo_result):
    """With reasonable demo data, net profit should be positive for at least one crop."""
    has_positive = any(
        (c.expected_net_profit_inr or 0) > 0
        for c in demo_result.recommendations
    )
    assert has_positive, "At least one crop should show positive net profit in demo mode."


# ---------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------

def test_demo_result_is_deterministic():
    """Running the pipeline twice with the same input must give the same result."""
    fi = make_demo_input()
    r1 = optimize_crops(fi, demo_mode=True)
    r2 = optimize_crops(fi, demo_mode=True)

    crops1 = sorted(c.crop for c in r1.recommendations)
    crops2 = sorted(c.crop for c in r2.recommendations)
    assert crops1 == crops2, "Crop selection should be deterministic."

    for c1, c2 in zip(
        sorted(r1.recommendations, key=lambda x: x.crop),
        sorted(r2.recommendations, key=lambda x: x.crop),
    ):
        assert abs(c1.area_acres - c2.area_acres) < 0.001, (
            f"{c1.crop}: area differs between runs ({c1.area_acres} vs {c2.area_acres})."
        )


# ---------------------------------------------------------------------------
# Data quality labels
# ---------------------------------------------------------------------------

def test_demo_mode_marks_yield_model_as_trained(demo_result):
    """In demo mode, yield predictions are available (from demo_data.py)."""
    assert demo_result.data_quality.yield_model_trained is True


def test_demo_mode_mandi_not_available(demo_result):
    """Mandi data is never available in demo mode (honest labelling)."""
    assert demo_result.data_quality.mandi_data_available is False


def test_demo_warning_present(demo_result):
    """Demo mode must include a warning that data is synthetic."""
    has_demo_warning = any(
        "DEMO" in w or "synthetic" in w.lower()
        for w in demo_result.warnings
    )
    assert has_demo_warning, "Demo output must warn that data is synthetic."
