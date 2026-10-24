"""
confidence/calibration.py — Data-driven confidence scoring.

Replaces the old hardcoded "High" confidence and "Ground-Truth Verified" labels.

Every crop starts from the quality of the data its yield and price came from
(the source tier), then loses confidence for each weakness found:

  - Sparse local data      : few historical records for this crop/district
  - Stale mandi prices     : price snapshot older than MANDI_DATA_AGING_DAYS / MANDI_DATA_STALE_DAYS
  - Water deficit          : crop needs more water than the farm's seasonal budget
  - Forced compatibility   : crop was let through by the deficit-irrigation safety net
  - Out of historical range: prediction far from what was historically observed

score = yield_tier × price_tier × (product of penalty multipliers), in [0, 1]

The plan score is the area-weighted mean of crop scores. A plan cannot be "High"
while cultivation costs are unverified, because every profit figure depends on them.

Each penalty adds a plain-language factor so the farmer sees *why* confidence is lower.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

import pandas as pd

from crop_optimization.config import (
    CONFIDENCE_HIGH_THRESHOLD,
    CONFIDENCE_MEDIUM_THRESHOLD,
    MANDI_DATA_AGING_DAYS,
    MANDI_DATA_STALE_DAYS,
    MIN_RECORDS_HIGH_CONFIDENCE,
    MIN_RECORDS_MEDIUM_CONFIDENCE,
)
from crop_optimization.data_loader import load_mandi_data
from crop_optimization.schemas import (
    CropCompatibilityResult,
    CropValidation,
    PriceResult,
    WaterBudgetResult,
    YieldResult,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Source tiers: how much the underlying data itself can be trusted (0–1)
# ---------------------------------------------------------------------------

# (multiplier, plain-language description)
YIELD_SOURCE_TIERS: dict[str, tuple[float, str]] = {
    # RF on real district records with split conformal intervals (80% coverage
    # verified on unseen 2021-22 data); no weather inputs yet.
    "conformal_rf_model": (0.85, "a model trained on 2011-2017 district records with calibrated ranges"),
    "district_icrisat_historical": (0.90, "multi-year district yield records"),
    "district_2021_22": (0.80, "a single season (2021-22) of district yield records"),
    # The RF model is fed constant rainfall/temperature at prediction time,
    # so it is effectively a crop × district lookup, not a weather-aware model.
    "trained_random_forest_ml_model": (0.75, "a trained model that does not yet use live weather"),
    "karnataka_historical_fallback": (0.55, "state-level averages (no district records)"),
    "karnataka_state_benchmark": (0.35, "a fixed regional benchmark, not observed data"),
}

PRICE_SOURCE_TIERS: dict[str, tuple[float, str]] = {
    "karnataka_mandi_history": (0.95, "daily Karnataka mandi price history"),
    "karnataka_mandi_recent": (0.90, "Karnataka mandi prices"),
    "trained_random_forest_ml_model": (0.75, "a trained price model"),
    "mandi_prices_all_india_fallback": (0.60, "all-India mandi prices (no Karnataka records)"),
    "karnataka_wholesale_dataset": (0.50, "a modelled wholesale price dataset"),
    "karnataka_msp_benchmark": (0.35, "a fixed MSP/benchmark price, not market data"),
}

UNKNOWN_SOURCE_TIER = (0.40, "an unidentified data source")

# Penalty multipliers
SPARSE_MEDIUM_PENALTY = 0.85     # MEDIUM <= records < HIGH
SPARSE_LOW_PENALTY = 0.70        # 1 <= records < MEDIUM
NO_RECORDS_PENALTY = 0.55        # no historical records at all
AGING_PRICE_PENALTY = 0.90
STALE_PRICE_PENALTY = 0.70
UNKNOWN_PRICE_AGE_PENALTY = 0.85
WATER_DEFICIT_MILD_PENALTY = 0.85    # need > available
WATER_DEFICIT_SEVERE_PENALTY = 0.60  # need > 1.5 × available
FORCED_COMPAT_PENALTY = 0.60
OUT_OF_RANGE_PENALTY = 0.80
OUT_OF_RANGE_DEVIATION_PCT = 50.0
FALLBACK_RAINFALL_PENALTY = 0.90
GROUNDWATER_STRESS_PENALTY = {"over_exploited": 0.85, "critical": 0.92}
WIDE_INTERVAL_PENALTY = 0.85
WIDE_INTERVAL_RATIO = 4.0        # upper / lower yield bound

FORCED_COMPAT_MARKERS = ("deficit irrigation", "climate-resilient staple")


@dataclass
class ConfidenceAssessment:
    score: float
    level: str                       # "High" | "Medium" | "Low"
    factors: list[str] = field(default_factory=list)


def score_to_level(score: float) -> str:
    if score >= CONFIDENCE_HIGH_THRESHOLD:
        return "High"
    if score >= CONFIDENCE_MEDIUM_THRESHOLD:
        return "Medium"
    return "Low"


# ---------------------------------------------------------------------------
# Mandi price freshness
# ---------------------------------------------------------------------------

def mandi_price_age_days(crop: str, today: Optional[date] = None) -> Optional[int]:
    """Days since the latest mandi arrival date for this crop, or None if unknown."""
    today = today or date.today()
    try:
        from crop_optimization.data_pipeline.live_mandi import get_store

        store = get_store()
        latest = store.latest_date(crop) if store else None
        if latest is not None:
            return max(0, (today - latest).days)
    except Exception as exc:
        logger.debug("Mandi history age lookup failed for %s: %s", crop, exc)

    df = load_mandi_data()
    if df is None or df.empty or "Arrival_Date" not in df.columns:
        return None
    rows = df[df["crop"] == crop]
    if rows.empty:
        return None
    # Agmarknet / data.gov.in publishes dates as dd/mm/yyyy
    dates = pd.to_datetime(rows["Arrival_Date"], dayfirst=True, errors="coerce").dropna()
    if dates.empty:
        return None
    today = today or date.today()
    return max(0, (today - dates.max().date()).days)


# ---------------------------------------------------------------------------
# Per-crop assessment
# ---------------------------------------------------------------------------

def _record_penalty(n: int, what: str) -> tuple[float, Optional[str]]:
    if n >= MIN_RECORDS_HIGH_CONFIDENCE:
        return 1.0, None
    if n >= MIN_RECORDS_MEDIUM_CONFIDENCE:
        return SPARSE_MEDIUM_PENALTY, f"Only {n} historical {what} records for this crop."
    if n >= 1:
        return SPARSE_LOW_PENALTY, f"Very few historical {what} records ({n}) for this crop."
    return NO_RECORDS_PENALTY, f"No historical {what} records found to check this estimate against."


def assess_crop(
    yield_result: Optional[YieldResult],
    price_result: Optional[PriceResult],
    validation: Optional[CropValidation],
    water_requirement_mm: Optional[float],
    water_budget: Optional[WaterBudgetResult],
    compatibility: Optional[CropCompatibilityResult] = None,
    price_age_days: Optional[int] = None,
) -> ConfidenceAssessment:
    """Score one crop's recommendation from the quality of the data behind it."""
    factors: list[str] = []

    # 1. Source tiers
    if yield_result is None or not yield_result.available:
        y_mult, y_desc = 0.0, "no yield estimate"
    else:
        y_mult, y_desc = YIELD_SOURCE_TIERS.get(yield_result.source or "", UNKNOWN_SOURCE_TIER)
    if price_result is None or not price_result.available:
        p_mult, p_desc = 0.0, "no price estimate"
    else:
        p_mult, p_desc = PRICE_SOURCE_TIERS.get(price_result.source or "", UNKNOWN_SOURCE_TIER)

    if y_mult < 0.80:
        factors.append(f"Yield is based on {y_desc}.")
    if p_mult < 0.80:
        factors.append(f"Price is based on {p_desc}.")

    score = y_mult * p_mult

    # 2. Sparse local data
    y_count = validation.yield_samples_count if validation else 0
    p_count = validation.price_samples_count if validation else 0
    for n, what in ((y_count, "yield"), (p_count, "price")):
        mult, msg = _record_penalty(n, what)
        score *= mult
        if msg:
            factors.append(msg)

    # 3. Stale mandi prices
    if price_result is not None and price_result.available and "mandi" in (price_result.source or ""):
        if price_age_days is None:
            score *= UNKNOWN_PRICE_AGE_PENALTY
            factors.append("Date of the mandi price data is unknown.")
        elif price_age_days > MANDI_DATA_STALE_DAYS:
            score *= STALE_PRICE_PENALTY
            factors.append(f"Mandi prices are {price_age_days} days old (stale).")
        elif price_age_days > MANDI_DATA_AGING_DAYS:
            score *= AGING_PRICE_PENALTY
            factors.append(f"Mandi prices are {price_age_days} days old.")

    # 4. Water deficit
    available = water_budget.total_available_mm_mid if water_budget else None
    if water_requirement_mm and available and available > 0:
        ratio = water_requirement_mm / available
        if ratio > 1.5:
            score *= WATER_DEFICIT_SEVERE_PENALTY
            factors.append(
                f"Needs ~{water_requirement_mm:.0f} mm of water but only ~{available:.0f} mm is available; "
                "yield is likely to fall short."
            )
        elif ratio > 1.0:
            score *= WATER_DEFICIT_MILD_PENALTY
            factors.append(
                f"Water need (~{water_requirement_mm:.0f} mm) is slightly above the available ~{available:.0f} mm."
            )

    # 5. Crop let through by the safety net rather than passing the checks
    if compatibility is not None:
        notes = " ".join(compatibility.warnings + compatibility.reasons).lower()
        if any(m in notes for m in FORCED_COMPAT_MARKERS):
            score *= FORCED_COMPAT_PENALTY
            factors.append("Included as a fallback because few crops passed the season/water checks.")

    # 6. Very wide calibrated yield range (the data itself is volatile)
    if (
        yield_result is not None and yield_result.available
        and yield_result.lower_t_per_ha and yield_result.upper_t_per_ha
        and yield_result.upper_t_per_ha / yield_result.lower_t_per_ha > WIDE_INTERVAL_RATIO
    ):
        score *= WIDE_INTERVAL_PENALTY
        factors.append(
            f"Yield range is very wide ({yield_result.lower_t_per_ha:.2f}–{yield_result.upper_t_per_ha:.2f} t/ha): "
            "past yields for this crop vary a lot."
        )

    # 7. Prediction far from history
    if validation is not None and validation.yield_samples_count > 0:
        dev = abs(validation.yield_deviation_pct or 0.0)
        if dev > OUT_OF_RANGE_DEVIATION_PCT:
            score *= OUT_OF_RANGE_PENALTY
            factors.append(f"Predicted yield is {dev:.0f}% away from the historical median.")

    score = round(max(0.0, min(1.0, score)), 3)
    return ConfidenceAssessment(score=score, level=score_to_level(score), factors=factors)


# ---------------------------------------------------------------------------
# Plan-level assessment
# ---------------------------------------------------------------------------

def assess_plan(
    crop_assessments: list[tuple[float, ConfidenceAssessment]],
    costs_verified: bool,
    water_budget: Optional[WaterBudgetResult] = None,
) -> ConfidenceAssessment:
    """
    Combine crop scores (weighted by acres) into one plan confidence.

    crop_assessments: list of (area_acres, assessment)
    """
    if not crop_assessments:
        return ConfidenceAssessment(score=0.0, level="Low", factors=["No crops could be recommended."])

    total_area = sum(a for a, _ in crop_assessments) or 1.0
    score = sum(a * ca.score for a, ca in crop_assessments) / total_area
    factors: list[str] = []

    if water_budget is not None and any(
        "state seasonal average" in w or "baseline rainfall" in w or "unavailable" in w.lower()
        for w in water_budget.warnings
    ):
        score *= FALLBACK_RAINFALL_PENALTY
        factors.append("District rainfall records were not available; a regional average was used.")

    category = getattr(water_budget, "groundwater_category", None) if water_budget is not None else None
    if category in GROUNDWATER_STRESS_PENALTY:
        score *= GROUNDWATER_STRESS_PENALTY[category]
        factors.append(
            f"Groundwater in this district is {category.replace('_', '-')} "
            f"({water_budget.groundwater_stage_pct:.0f}% of safe recharge is extracted); borewell supply may decline."
        )

    # De-duplicate crop factors, keep order
    seen: set[str] = set()
    for _, ca in crop_assessments:
        for f in ca.factors:
            if f not in seen:
                seen.add(f)
                factors.append(f)

    score = round(max(0.0, min(1.0, score)), 3)
    level = score_to_level(score)

    if not costs_verified:
        factors.insert(0, "Cultivation costs are estimated (no verified cost data), so profit figures are approximate.")
        if level == "High":
            level = "Medium"

    return ConfidenceAssessment(score=score, level=level, factors=factors)


def explain(level: str, score: float, district: str) -> str:
    pct = round(score * 100)
    if level == "High":
        return f"High confidence ({pct}/100): estimates for {district} rest on plentiful, recent local records."
    if level == "Medium":
        return (
            f"Medium confidence ({pct}/100): the plan is reasonable for {district}, "
            "but some estimates rely on limited or indirect data — see the factors below."
        )
    return (
        f"Low confidence ({pct}/100): key estimates for {district} rely on sparse, indirect or fallback data. "
        "Treat this plan as a starting point and confirm with your local agriculture officer."
    )
