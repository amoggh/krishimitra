"""
Tests for yield_model/conformal.py and its use in predict_yield.
"""

import math

import numpy as np
import pytest

from crop_optimization.yield_model.conformal import (
    conformal_quantile,
    empirical_coverage,
    fit_conformal,
    interval,
    quantile_for,
)


def test_quantile_finite_sample_rank():
    # n=9, alpha=0.2 → k = ceil(10 * 0.8) = 8 → 8th smallest
    scores = np.arange(1, 10, dtype=float)
    assert conformal_quantile(scores, 0.2) == 8.0


def test_quantile_infinite_when_too_few_points():
    assert math.isinf(conformal_quantile(np.array([0.1, 0.2]), 0.2))
    assert math.isinf(conformal_quantile(np.array([]), 0.2))


def test_interval_is_multiplicative_and_contains_prediction():
    lo, hi = interval(2.0, math.log(2))
    assert lo == pytest.approx(1.0)
    assert hi == pytest.approx(4.0)


def test_per_group_falls_back_to_global():
    rng = np.random.default_rng(0)
    y_pred = np.full(60, 2.0)
    y_true = y_pred * np.exp(rng.normal(0, 0.2, 60))
    groups = np.array(["Maize"] * 50 + ["Linseed"] * 10)
    cal = fit_conformal(y_true, y_pred, groups, alpha=0.2, min_group_size=20)
    assert "Maize" in cal["per_group"]
    assert "Linseed" not in cal["per_group"]
    assert quantile_for(cal, "Maize")[1] == "crop"
    assert quantile_for(cal, "Linseed")[1] == "global"


def test_coverage_guarantee_on_exchangeable_data():
    """On exchangeable data, held-out coverage should be close to 1 - alpha."""
    rng = np.random.default_rng(42)
    n = 4000
    y_pred = rng.uniform(0.5, 5.0, n)
    y_true = y_pred * np.exp(rng.normal(0, 0.3, n))
    groups = np.array(["c"] * n)
    cal = fit_conformal(y_true[:2000], y_pred[:2000], groups[:2000], alpha=0.2)
    cov = empirical_coverage(y_true[2000:], y_pred[2000:], groups[2000:], cal)
    assert 0.77 <= cov <= 0.83


def test_predict_yield_uses_conformal_for_trained_crop():
    from crop_optimization.yield_model.model import YIELD_MODEL_SOURCE, _get_yield_model, predict_yield

    if _get_yield_model() is None:
        pytest.skip("Yield model artifacts not present; run train_yield_model.py")
    r = predict_yield("Maize", "Mysuru", "kharif")
    assert r.source == YIELD_MODEL_SOURCE
    assert r.interval_method.startswith("split_conformal")
    assert r.coverage_target == pytest.approx(0.8)
    assert r.lower_t_per_ha < r.expected_t_per_ha < r.upper_t_per_ha


def test_predict_yield_skips_model_for_untrained_crop():
    from crop_optimization.yield_model.model import YIELD_MODEL_SOURCE, _get_yield_model, predict_yield

    if _get_yield_model() is None:
        pytest.skip("Yield model artifacts not present; run train_yield_model.py")
    r = predict_yield("Onion", "Mysuru", "kharif")
    assert r.source != YIELD_MODEL_SOURCE
