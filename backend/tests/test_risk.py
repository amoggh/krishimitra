"""
test_risk.py — Tests for the Monte Carlo risk simulation.
"""

import pytest

from crop_optimization.risk.monte_carlo import simulate_crop_profit
from crop_optimization.schemas import PriceResult, RiskResult, YieldResult


def make_yield(available=True, lower=1.5, expected=2.5, upper=3.5) -> YieldResult:
    if available:
        return YieldResult(
            crop="rice",
            available=True,
            lower_t_per_ha=lower,
            expected_t_per_ha=expected,
            upper_t_per_ha=upper,
        )
    return YieldResult(
        crop="rice",
        available=False,
        unavailable_reason="Yield model not trained.",
    )


def make_price(available=True, lower=1500, expected=2000, upper=2500) -> PriceResult:
    if available:
        return PriceResult(
            crop="rice",
            available=True,
            lower_inr_per_quintal=lower,
            expected_inr_per_quintal=expected,
            upper_inr_per_quintal=upper,
        )
    return PriceResult(
        crop="rice",
        available=False,
        unavailable_reason="Price model not trained.",
    )


# ---------------------------------------------------------------------------
# Unavailable model cases
# ---------------------------------------------------------------------------


def test_missing_yield_returns_unavailable():
    result = simulate_crop_profit(
        crop="rice",
        area_acres=2.0,
        yield_result=make_yield(available=False),
        price_result=make_price(available=True),
        cost_per_acre_inr=10000,
    )
    assert result.available is False
    assert result.unavailable_reason is not None


def test_missing_price_returns_unavailable():
    result = simulate_crop_profit(
        crop="rice",
        area_acres=2.0,
        yield_result=make_yield(available=True),
        price_result=make_price(available=False),
        cost_per_acre_inr=10000,
    )
    assert result.available is False
    assert result.unavailable_reason is not None


# ---------------------------------------------------------------------------
# Valid simulation cases
# ---------------------------------------------------------------------------


def test_simulation_runs_with_valid_inputs():
    result = simulate_crop_profit(
        crop="rice",
        area_acres=2.0,
        yield_result=make_yield(),
        price_result=make_price(),
        cost_per_acre_inr=10000,
    )
    assert result.available is True


def test_expected_profit_is_numeric():
    result = simulate_crop_profit(
        crop="rice",
        area_acres=2.0,
        yield_result=make_yield(),
        price_result=make_price(),
        cost_per_acre_inr=5000,
    )
    assert isinstance(result.expected_profit_inr, float)


def test_probabilities_are_between_0_and_1():
    result = simulate_crop_profit(
        crop="rice",
        area_acres=2.0,
        yield_result=make_yield(),
        price_result=make_price(),
        cost_per_acre_inr=5000,
    )
    assert 0.0 <= result.yield_failure_probability <= 1.0
    assert 0.0 <= result.price_crash_probability <= 1.0


def test_p10_less_than_p90():
    result = simulate_crop_profit(
        crop="rice",
        area_acres=2.0,
        yield_result=make_yield(),
        price_result=make_price(),
        cost_per_acre_inr=5000,
    )
    assert result.profit_p10_inr <= result.profit_p90_inr


def test_profit_variance_non_negative():
    result = simulate_crop_profit(
        crop="rice",
        area_acres=2.0,
        yield_result=make_yield(),
        price_result=make_price(),
        cost_per_acre_inr=5000,
    )
    assert result.profit_variance_inr >= 0


def test_higher_cost_reduces_expected_profit():
    r_low = simulate_crop_profit("rice", 2.0, make_yield(), make_price(), cost_per_acre_inr=5000)
    r_high = simulate_crop_profit("rice", 2.0, make_yield(), make_price(), cost_per_acre_inr=50000)
    assert r_low.expected_profit_inr > r_high.expected_profit_inr


def test_simulation_deterministic_with_same_seed():
    """Same inputs should produce the same results (deterministic seed)."""
    r1 = simulate_crop_profit("rice", 2.0, make_yield(), make_price(), 5000)
    r2 = simulate_crop_profit("rice", 2.0, make_yield(), make_price(), 5000)
    assert r1.expected_profit_inr == r2.expected_profit_inr
