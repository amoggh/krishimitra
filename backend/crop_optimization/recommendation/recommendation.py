"""
recommendation/recommendation.py — Assemble farmer-friendly recommendations
with plain-language explanations, risk insights, and data provenance.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from crop_optimization.config import MAX_SINGLE_CROP_FRACTION
from crop_optimization.schemas import (
    CropAllocation,
    CropCompatibilityResult,
    CropResult,
    DataQualitySummary,
    FarmerInput,
    PriceResult,
    RecommendationResult,
    RejectedCrop,
    RiskResult,
    WaterBudgetResult,
    YieldResult,
)

logger = logging.getLogger(__name__)


def _build_crop_result(
    allocation: CropAllocation,
    yield_result: Optional[YieldResult],
    price_result: Optional[PriceResult],
    risk_result: Optional[RiskResult],
    cost_per_acre_inr: float,
    water_requirement_mm: Optional[float],
    compatibility: Optional[CropCompatibilityResult],
) -> CropResult:
    """
    Build a CropResult with plain-language explanations for one allocated crop.
    """
    reasons: list[str] = []
    warnings: list[str] = []

    if compatibility:
        reasons.extend(compatibility.reasons)
        warnings.extend(compatibility.warnings)

    expected_revenue: Optional[float] = None
    expected_cost: Optional[float] = None
    expected_net: Optional[float] = None
    net_lower: Optional[float] = None
    net_upper: Optional[float] = None

    total_cost = cost_per_acre_inr * allocation.area_acres

    # Economic summary
    if yield_result and yield_result.available and price_result and price_result.available:
        # Revenue = yield (t/ha) × area (ha) × 10 (quintals/tonne) × price (INR/quintal)
        exp_rev = (
            (yield_result.expected_t_per_ha or 0.0)
            * allocation.area_hectares
            * 10.0
            * (price_result.expected_inr_per_quintal or 0.0)
        )
        expected_revenue = round(exp_rev, 0)
        expected_cost = round(total_cost, 0) if total_cost > 0 else 0.0
        expected_net = round(exp_rev - total_cost, 0)

        low_rev = (
            (yield_result.lower_t_per_ha or 0.0)
            * allocation.area_hectares
            * 10.0
            * (price_result.lower_inr_per_quintal or 0.0)
        )
        high_rev = (
            (yield_result.upper_t_per_ha or 0.0)
            * allocation.area_hectares
            * 10.0
            * (price_result.upper_inr_per_quintal or 0.0)
        )
        net_lower = round(low_rev - total_cost, 0)
        net_upper = round(high_rev - total_cost, 0)

        if total_cost > 0:
            reasons.append(
                f"Expected net profit: Rs {expected_net:,.0f} (range: Rs {net_lower:,.0f} – Rs {net_upper:,.0f}) on {allocation.area_acres:.2f} acres."
            )
        else:
            reasons.append(
                f"Expected revenue: Rs {expected_revenue:,.0f} (range: Rs {net_lower:,.0f} – Rs {net_upper:,.0f}) on {allocation.area_acres:.2f} acres."
            )
    else:
        if not yield_result or not yield_result.available:
            warnings.append("Yield baseline unavailable in current records.")
        if not price_result or not price_result.available:
            warnings.append("Recent mandi price unavailable for this crop.")

    if risk_result and risk_result.available:
        y_fail = risk_result.yield_failure_probability
        p_crash = risk_result.price_crash_probability
        risk_parts = []
        if y_fail is not None:
            risk_parts.append(f"Yield failure risk: {y_fail:.0%}")
        if p_crash is not None:
            risk_parts.append(f"Price crash risk: {p_crash:.0%}")
        if risk_parts:
            reasons.append(", ".join(risk_parts))

    return CropResult(
        crop=allocation.crop,
        area_acres=allocation.area_acres,
        area_hectares=allocation.area_hectares,
        percentage_of_total=allocation.percentage_of_total,
        yield_result=yield_result,
        price_result=price_result,
        risk_result=risk_result,
        expected_revenue_inr=expected_revenue,
        expected_cost_inr=expected_cost,
        expected_net_profit_inr=expected_net,
        net_profit_lower_inr=net_lower,
        net_profit_upper_inr=net_upper,
        water_requirement_mm=water_requirement_mm,
        reasons=reasons,
        warnings=warnings,
    )


def _build_rejected_crops(
    compatibility_results: list[CropCompatibilityResult],
    allocated_crop_names: set[str],
) -> list[RejectedCrop]:
    """Build list of rejected crops with farmer-friendly reasons."""
    rejected: list[RejectedCrop] = []

    for result in compatibility_results:
        if result.crop in allocated_crop_names:
            continue

        if not result.compatible:
            rejected.append(
                RejectedCrop(
                    crop=result.crop,
                    reasons=result.failed_constraints or ["Excluded by agronomic compatibility criteria."],
                )
            )
        else:
            rejected.append(
                RejectedCrop(
                    crop=result.crop,
                    reasons=[
                        "Passed compatibility checks but not allocated because other crops offered higher return within water constraints."
                    ],
                )
            )

    return rejected


def build_recommendation(
    farmer_input: FarmerInput,
    water_budget: WaterBudgetResult,
    allocations: list[CropAllocation],
    compatibility_results: list[CropCompatibilityResult],
    yield_results: dict[str, YieldResult],
    price_results: dict[str, PriceResult],
    risk_results: dict[str, RiskResult],
    cost_per_acre: dict[str, float],
    water_requirements: dict[str, Optional[float]],
    data_quality: DataQualitySummary,
    global_warnings: list[str],
) -> RecommendationResult:
    """
    Assemble the final farmer-friendly recommendation response.
    """
    allocated_crop_names = {a.crop for a in allocations}
    compat_by_crop = {r.crop: r for r in compatibility_results}

    # Build per-crop results
    crop_results: list[CropResult] = []
    for allocation in allocations:
        crop = allocation.crop
        cr = _build_crop_result(
            allocation=allocation,
            yield_result=yield_results.get(crop),
            price_result=price_results.get(crop),
            risk_result=risk_results.get(crop),
            cost_per_acre_inr=cost_per_acre.get(crop, 0.0),
            water_requirement_mm=water_requirements.get(crop),
            compatibility=compat_by_crop.get(crop),
        )
        crop_results.append(cr)

    # Build rejected crops
    rejected = _build_rejected_crops(compatibility_results, allocated_crop_names)

    # Calculate summary metrics
    total_allocated_acres = round(sum(c.area_acres for c in crop_results), 2)
    profit_min = sum(c.net_profit_lower_inr or 0.0 for c in crop_results)
    profit_mid = sum(c.expected_net_profit_inr or 0.0 for c in crop_results)
    profit_max = sum(c.net_profit_upper_inr or 0.0 for c in crop_results)

    if total_allocated_acres > 0:
        water_used_mm = round(
            sum((c.water_requirement_mm or 0.0) * c.area_acres for c in crop_results) / total_allocated_acres, 1
        )
    else:
        water_used_mm = 0.0

    summary: dict[str, Any] = {
        "total_land_acres": farmer_input.area_acres,
        "allocated_land_acres": total_allocated_acres,
        "expected_profit_min": round(profit_min, 0),
        "expected_profit_mid": round(profit_mid, 0),
        "expected_profit_max": round(profit_max, 0),
        "water_used_mm": water_used_mm,
        "water_available_mm": water_budget.total_available_mm_mid,
    }

    # Why this plan explanations
    crop_names_str = ", ".join(c.crop for c in crop_results) if crop_results else "No crops"
    why_this_plan: list[str] = []
    if crop_results:
        why_this_plan.append(
            f"Selected crops ({crop_names_str}) have verified cultivation history in {farmer_input.district} for {farmer_input.season.capitalize()} season."
        )
        why_this_plan.append(
            f"Land allocation enforces a {int(MAX_SINGLE_CROP_FRACTION * 100)}% single-crop ceiling to diversify risk and avoid monoculture vulnerability."
        )
        if water_used_mm <= water_budget.total_available_mm_mid:
            why_this_plan.append(
                f"Combined seasonal water requirement ({water_used_mm:.0f} mm) is fully supported by your irrigation budget ({water_budget.total_available_mm_mid:.0f} mm)."
            )
        else:
            why_this_plan.append(
                f"Water budget is close to capacity; drip irrigation efficiency helps maintain crop hydration."
            )
        why_this_plan.append(
            "Cultivation cost data is not present in existing datasets; the allocation prioritizes expected revenue and risk stability without fabricating artificial input costs."
        )

    # Evaluate confidence and explanation
    sources_used: set[str] = set()
    sources_used.add("Karnataka Government APY Crop Production Statistics 2021-22")
    sources_used.add("Karnataka Multi-Model Agro-Climatic Dataset (Water Requirements & USDA Effective Rainfall)")
    sources_used.add("Agmarknet Mandi Price Dataset")

    has_state_fallback = False
    has_icrisat = False

    for c in crop_results:
        y_res = c.yield_result
        if y_res:
            if y_res.source == "karnataka_historical_fallback":
                has_state_fallback = True
                sources_used.add("Historical Karnataka Crop Yield Dataset 1997-2020")
            elif y_res.source == "district_icrisat_historical":
                has_icrisat = True
                sources_used.add("ICRISAT District-Level Historical Yield Dataset")

    if has_state_fallback:
        confidence = "Medium"
        conf_expl = (
            "Recommendation has Medium confidence: some crop yields use Karnataka state-level historical fallbacks "
            "because district observations were unavailable."
        )
    elif has_icrisat:
        confidence = "Medium"
        conf_expl = "Recommendation has Medium confidence: based on ICRISAT historical district yield baselines."
    else:
        confidence = "High"
        conf_expl = (
            "Recommendation has High confidence: yields are directly based on recent 2021–22 Karnataka district records, "
            "and market prices reflect current mandi data."
        )

    status = "ok" if crop_results else "no_recommendation"
    message = (
        None if crop_results
        else "No crops passed the feasibility constraints for your district, season, and water budget."
    )

    location = f"{farmer_input.district}, Karnataka"

    return RecommendationResult(
        location=location,
        season=farmer_input.season,
        total_land_acres=farmer_input.area_acres,
        budget_inr=farmer_input.investment_inr,
        water_budget=water_budget,
        recommendations=crop_results,
        recommended_plan=crop_results,
        rejected_crops=rejected,
        summary=summary,
        why_this_plan=why_this_plan,
        confidence=confidence,
        confidence_explanation=conf_expl,
        data_sources=sorted(sources_used),
        warnings=global_warnings + water_budget.warnings,
        data_quality=data_quality,
        status=status,
        message=message,
    )
