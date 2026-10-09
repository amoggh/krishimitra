"""
risk/monte_carlo.py — Monte Carlo risk simulation for crop profitability.

Risk is based on empirical uncertainty distributions from historical data,
NOT on an arbitrary risk score from an ML model.

Requires:
  - A yield estimate with uncertainty bounds (from the yield model).
  - A price estimate with uncertainty bounds (from the price model).
  - Input cost data.

If either yield or price predictions are unavailable, simulation cannot run
and the function returns an honest "unavailable" result.

Each simulation run draws:
  - yield from a distribution fitted to the yield [lower, expected, upper]
  - price from a distribution fitted to the price [lower, expected, upper]
  - (future: rainfall / pest shock from historical distributions)

Current status: REQUIRES YIELD AND PRICE MODELS.
Will return unavailable until both models are trained.
"""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np

from crop_optimization.config import (
    MONTE_CARLO_N_SIMULATIONS,
    MONTE_CARLO_SEED,
    PRICE_CRASH_THRESHOLD_FRACTION,
    YIELD_FAILURE_THRESHOLD_FRACTION,
)
from crop_optimization.schemas import PriceResult, RiskResult, YieldResult
from crop_optimization.utils import acres_to_hectares

logger = logging.getLogger(__name__)


def _fit_lognormal_params(
    lower: float, expected: float, upper: float
) -> tuple[float, float]:
    """
    Fit lognormal distribution parameters (mu, sigma) from
    lower / median / upper estimates.

    Uses the 10th and 90th percentile assumption:
      lower ≈ P10, upper ≈ P90.
    """
    import scipy.stats as stats  # noqa: PLC0415

    # Estimate sigma from the P10–P90 range in log space
    if lower <= 0 or expected <= 0 or upper <= 0:
        raise ValueError("All values must be positive for lognormal fitting.")

    log_lower = np.log(lower)
    log_upper = np.log(upper)

    # P10 and P90 z-scores
    z_10 = stats.norm.ppf(0.10)
    z_90 = stats.norm.ppf(0.90)

    sigma = (log_upper - log_lower) / (z_90 - z_10)
    mu = np.log(expected)  # median in log space ≈ mean of log-normal

    return mu, sigma


def simulate_crop_profit(
    crop: str,
    area_acres: float,
    yield_result: YieldResult,
    price_result: PriceResult,
    cost_per_acre_inr: float,
) -> RiskResult:
    """
    Run Monte Carlo simulation for a crop to estimate profit distribution.

    Parameters
    ----------
    crop : str
    area_acres : float
    yield_result : YieldResult
        Must have available=True and lower/expected/upper in tonnes/ha.
    price_result : PriceResult
        Must have available=True and lower/expected/upper in ₹/quintal.
    cost_per_acre_inr : float
        Total cultivation cost per acre.

    Returns
    -------
    RiskResult
    """
    # ------------------------------------------------------------------
    # Guard: both yield and price must be available
    # ------------------------------------------------------------------
    if not yield_result.available:
        return RiskResult(
            crop=crop,
            available=False,
            unavailable_reason=(
                "Risk simulation requires yield prediction. "
                f"Yield unavailable: {yield_result.unavailable_reason}"
            ),
        )

    if not price_result.available:
        return RiskResult(
            crop=crop,
            available=False,
            unavailable_reason=(
                "Risk simulation requires price prediction. "
                f"Price unavailable: {price_result.unavailable_reason}"
            ),
        )

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------
    rng = np.random.default_rng(MONTE_CARLO_SEED)
    n = MONTE_CARLO_N_SIMULATIONS
    area_ha = acres_to_hectares(area_acres)
    total_cost_inr = cost_per_acre_inr * area_acres

    # ------------------------------------------------------------------
    # Sample yield (tonnes/ha) from lognormal
    # ------------------------------------------------------------------
    try:
        y_mu, y_sigma = _fit_lognormal_params(
            yield_result.lower_t_per_ha,   # type: ignore[arg-type]
            yield_result.expected_t_per_ha, # type: ignore[arg-type]
            yield_result.upper_t_per_ha,   # type: ignore[arg-type]
        )
        yield_samples_t_ha = rng.lognormal(mean=y_mu, sigma=y_sigma, size=n)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Yield lognormal fitting failed for %s: %s", crop, exc)
        return RiskResult(
            crop=crop,
            available=False,
            unavailable_reason=f"Could not fit yield distribution: {exc}",
        )

    # ------------------------------------------------------------------
    # Sample price (₹/quintal) from lognormal
    # ------------------------------------------------------------------
    try:
        p_mu, p_sigma = _fit_lognormal_params(
            price_result.lower_inr_per_quintal,    # type: ignore[arg-type]
            price_result.expected_inr_per_quintal, # type: ignore[arg-type]
            price_result.upper_inr_per_quintal,    # type: ignore[arg-type]
        )
        price_samples_inr_q = rng.lognormal(mean=p_mu, sigma=p_sigma, size=n)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Price lognormal fitting failed for %s: %s", crop, exc)
        return RiskResult(
            crop=crop,
            available=False,
            unavailable_reason=f"Could not fit price distribution: {exc}",
        )

    # ------------------------------------------------------------------
    # Compute profit for each simulation run
    #
    # Revenue = yield (t/ha) × area (ha) × 10 quintals/tonne × price (₹/quintal)
    # Cost    = fixed (does not vary in this basic simulation)
    # Profit  = Revenue - Cost
    # ------------------------------------------------------------------
    revenue_samples = yield_samples_t_ha * area_ha * 10.0 * price_samples_inr_q
    profit_samples = revenue_samples - total_cost_inr

    # ------------------------------------------------------------------
    # Risk metrics
    # ------------------------------------------------------------------
    expected_profit = float(np.mean(profit_samples))
    profit_variance = float(np.var(profit_samples))
    profit_p10 = float(np.percentile(profit_samples, 10))
    profit_p90 = float(np.percentile(profit_samples, 90))

    # Yield failure probability: P(yield < threshold × expected_yield)
    yield_threshold = yield_result.expected_t_per_ha * YIELD_FAILURE_THRESHOLD_FRACTION  # type: ignore[operator]
    yield_failure_prob = float(np.mean(yield_samples_t_ha < yield_threshold))

    # Price crash probability: P(price < threshold × expected_price)
    price_threshold = price_result.expected_inr_per_quintal * PRICE_CRASH_THRESHOLD_FRACTION  # type: ignore[operator]
    price_crash_prob = float(np.mean(price_samples_inr_q < price_threshold))

    # Risk-adjusted profit: expected profit minus one standard deviation
    # (a simple Sharpe-like adjustment; not a formal risk measure)
    std_profit = float(np.std(profit_samples))
    risk_adjusted_profit = expected_profit - std_profit

    logger.info(
        "Monte Carlo for %s: E[profit]=%.0f, P(yield fail)=%.2f, P(price crash)=%.2f",
        crop,
        expected_profit,
        yield_failure_prob,
        price_crash_prob,
    )

    # Risk confidence based on input confidences
    yield_conf = getattr(yield_result, "confidence", "medium") or "medium"
    price_conf = getattr(price_result, "confidence", "medium") or "medium"
    if yield_conf == "high" and price_conf == "high":
        risk_conf = "high"
    elif "low" in (yield_conf, price_conf):
        risk_conf = "low"
    else:
        risk_conf = "medium"

    return RiskResult(
        crop=crop,
        expected_profit_inr=round(expected_profit, 2),
        profit_variance_inr=round(profit_variance, 2),
        profit_p10_inr=round(profit_p10, 2),
        profit_p90_inr=round(profit_p90, 2),
        yield_failure_probability=round(yield_failure_prob, 4),
        price_crash_probability=round(price_crash_prob, 4),
        risk_adjusted_profit_inr=round(risk_adjusted_profit, 2),
        risk_confidence=risk_conf,
        available=True,
    )
