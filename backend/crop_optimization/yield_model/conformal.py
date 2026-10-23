"""
yield_model/conformal.py — Split conformal prediction for yield intervals.

Replaces the old fixed ±15% bands with intervals that have a finite-sample
coverage guarantee: if calibration and future seasons are exchangeable, the
true yield falls inside the interval with probability >= 1 - alpha.

Nonconformity score (log scale, because yields span 0.5 t/ha pulses to 85 t/ha sugarcane):

    s_i = |log(y_i) - log(ŷ_i)|

Interval for a new prediction ŷ:

    [ŷ · exp(-q), ŷ · exp(+q)]

where q is the ceil((n+1)(1-alpha))-th smallest calibration score.

Mondrian (per-crop) calibration: each crop gets its own q when it has at least
`min_group_size` calibration points; otherwise the global q is used. This keeps
a volatile crop from borrowing the narrow band of a stable one.

The default alpha = 0.2 (80% interval) matches the risk module, which reads
lower/upper bounds as P10/P90.
"""

from __future__ import annotations

import math
from typing import Optional

import numpy as np

DEFAULT_ALPHA = 0.20
DEFAULT_MIN_GROUP_SIZE = 20


def nonconformity_scores(y_true: np.ndarray, y_pred: np.ndarray) -> np.ndarray:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return np.abs(np.log(y_true) - np.log(y_pred))


def conformal_quantile(scores: np.ndarray, alpha: float) -> float:
    """Finite-sample split conformal quantile. Returns inf when n is too small."""
    scores = np.sort(np.asarray(scores, dtype=float))
    n = len(scores)
    if n == 0:
        return math.inf
    k = math.ceil((n + 1) * (1 - alpha))
    if k > n:
        return math.inf
    return float(scores[k - 1])


def fit_conformal(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    groups: np.ndarray,
    alpha: float = DEFAULT_ALPHA,
    min_group_size: int = DEFAULT_MIN_GROUP_SIZE,
) -> dict:
    """Compute global and per-group conformal quantiles from a calibration set."""
    scores = nonconformity_scores(y_true, y_pred)
    groups = np.asarray(groups)

    per_group: dict[str, dict] = {}
    for g in np.unique(groups):
        g_scores = scores[groups == g]
        if len(g_scores) >= min_group_size:
            per_group[str(g)] = {"q": conformal_quantile(g_scores, alpha), "n": int(len(g_scores))}

    return {
        "alpha": alpha,
        "coverage_target": 1 - alpha,
        "score": "abs_log_ratio",
        "min_group_size": min_group_size,
        "global": {"q": conformal_quantile(scores, alpha), "n": int(len(scores))},
        "per_group": per_group,
    }


def quantile_for(calibration: dict, group: Optional[str]) -> tuple[float, str]:
    """Return (q, scope) for a group, falling back to the global quantile."""
    entry = calibration.get("per_group", {}).get(group or "")
    if entry is not None:
        return float(entry["q"]), "crop"
    return float(calibration["global"]["q"]), "global"


def interval(y_pred: float, q: float) -> tuple[float, float]:
    return y_pred * math.exp(-q), y_pred * math.exp(q)


def empirical_coverage(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    groups: np.ndarray,
    calibration: dict,
) -> float:
    """Fraction of points whose true value falls inside their conformal interval."""
    hits = 0
    for yt, yp, g in zip(y_true, y_pred, groups):
        q, _ = quantile_for(calibration, str(g))
        lo, hi = interval(float(yp), q)
        hits += int(lo <= yt <= hi)
    return hits / len(y_true) if len(y_true) else float("nan")
