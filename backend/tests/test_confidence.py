"""
Tests for confidence/calibration.py — data-driven confidence scoring.

All tests work offline with hand-built inputs.
"""

from crop_optimization.confidence.calibration import (
    ConfidenceAssessment,
    assess_crop,
    assess_plan,
    score_to_level,
)
from crop_optimization.schemas import (
    CropCompatibilityResult,
    CropValidation,
    PriceResult,
    WaterBudgetResult,
    YieldResult,
)


def _yield(source="district_icrisat_historical"):
    return YieldResult(crop="Maize", lower_t_per_ha=2.5, expected_t_per_ha=3.0,
                       upper_t_per_ha=3.5, source=source, available=True)


def _price(source="karnataka_mandi_recent"):
    return PriceResult(crop="Maize", lower_inr_per_quintal=1800, expected_inr_per_quintal=2000,
                       upper_inr_per_quintal=2200, source=source, available=True)


def _validation(n_yield=30, n_price=30, dev=5.0):
    return CropValidation(is_ground_truth_verified=True, yield_samples_count=n_yield,
                          price_samples_count=n_price, yield_deviation_pct=dev)


def _water(total_mm=600.0, warnings=None):
    return WaterBudgetResult(
        estimated_daily_litres_low=1, estimated_daily_litres_mid=1, estimated_daily_litres_high=1,
        seasonal_pumped_mm_low=1, seasonal_pumped_mm_mid=1, seasonal_pumped_mm_high=1,
        effective_rainfall_mm=0, total_available_mm_mid=total_mm, warnings=warnings or [],
    )


def test_best_case_is_high():
    a = assess_crop(_yield(), _price(), _validation(), 400.0, _water(), price_age_days=3)
    assert a.level == "High"
    assert a.factors == []


def test_benchmark_sources_are_low():
    a = assess_crop(_yield("karnataka_state_benchmark"), _price("karnataka_msp_benchmark"),
                    _validation(), 400.0, _water())
    assert a.level == "Low"
    assert any("benchmark" in f for f in a.factors)


def test_unavailable_yield_scores_zero():
    y = YieldResult(crop="Maize", available=False)
    a = assess_crop(y, _price(), _validation(), 400.0, _water(), price_age_days=3)
    assert a.score == 0.0
    assert a.level == "Low"


def test_sparse_records_penalised():
    rich = assess_crop(_yield(), _price(), _validation(30, 30), 400.0, _water(), price_age_days=3)
    sparse = assess_crop(_yield(), _price(), _validation(2, 0), 400.0, _water(), price_age_days=3)
    assert sparse.score < rich.score
    assert any("No historical price records" in f for f in sparse.factors)


def test_stale_mandi_prices_penalised():
    fresh = assess_crop(_yield(), _price(), _validation(), 400.0, _water(), price_age_days=3)
    stale = assess_crop(_yield(), _price(), _validation(), 400.0, _water(), price_age_days=400)
    assert stale.score < fresh.score
    assert any("stale" in f for f in stale.factors)


def test_water_deficit_penalised():
    ok = assess_crop(_yield(), _price(), _validation(), 400.0, _water(600), price_age_days=3)
    short = assess_crop(_yield(), _price(), _validation(), 400.0, _water(100), price_age_days=3)
    assert short.score < ok.score
    assert any("water" in f.lower() for f in short.factors)


def test_forced_compatibility_penalised():
    forced = CropCompatibilityResult(
        crop="Maize", compatible=True, score=0.55,
        warnings=["Selected for deficit irrigation / rainfed management due to restricted seasonal water availability."],
    )
    a = assess_crop(_yield(), _price(), _validation(), 400.0, _water(), forced, price_age_days=3)
    assert any("fallback" in f for f in a.factors)


def test_plan_capped_at_medium_without_verified_costs():
    high = ConfidenceAssessment(score=0.8, level="High")
    assert assess_plan([(5.0, high)], costs_verified=True).level == "High"
    capped = assess_plan([(5.0, high)], costs_verified=False)
    assert capped.level == "Medium"
    assert any("Cultivation costs" in f for f in capped.factors)


def test_plan_is_area_weighted():
    big_good = ConfidenceAssessment(score=0.9, level="High")
    small_bad = ConfidenceAssessment(score=0.1, level="Low")
    plan = assess_plan([(4.0, big_good), (1.0, small_bad)], costs_verified=True)
    assert abs(plan.score - 0.74) < 1e-6


def test_empty_plan_is_low():
    assert assess_plan([], costs_verified=True).level == "Low"


def test_score_to_level_thresholds():
    assert score_to_level(0.9) == "High"
    assert score_to_level(0.5) == "Medium"
    assert score_to_level(0.1) == "Low"
