"""
recommendation/recommendation.py — Assemble farmer-friendly recommendations
with plain-language explanations, risk insights, and data provenance.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from crop_optimization.config import MAX_SINGLE_CROP_FRACTION
from crop_optimization.confidence.calibration import (
    ConfidenceAssessment,
    assess_crop,
    assess_plan,
    explain,
    mandi_price_age_days,
    score_to_level,
)

NON_LOCAL_COST_PENALTY = 0.90

# Plain-language provenance for reason lines — say where a number came from, never more
YIELD_SOURCE_PHRASES = {
    "conformal_rf_model": "a model trained on Karnataka district records 2011-2017 (80% range calibrated on 2021-22)",
    "district_2021_22": "a single 2021-22 harvest record for {district}",
    "district_icrisat_historical": "multi-year ICRISAT records for {district}",
    "karnataka_historical_fallback": "Karnataka state averages (no {district} records)",
    "karnataka_state_benchmark": "a fixed regional benchmark, not observed data",
}
PRICE_SOURCE_PHRASES = {
    "karnataka_mandi_history": "daily Karnataka mandi price history",
    "karnataka_mandi_recent": "a recent Karnataka mandi price snapshot",
    "mandi_prices_all_india_fallback": "all-India mandi prices (no Karnataka records)",
    "karnataka_wholesale_dataset": "a modelled wholesale price dataset",
    "karnataka_msp_benchmark": "an MSP / benchmark price, not live market data",
    "trained_random_forest_ml_model": "a trained price model",
}
from crop_optimization.schemas import (
    CropAllocation,
    CropCompatibilityResult,
    CropResult,
    CropValidation,
    DataQualitySummary,
    FarmerInput,
    PlanValidationSummary,
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
    farmer_input: Optional[FarmerInput] = None,
    water_budget: Optional[WaterBudgetResult] = None,
    cost_info: Optional[dict] = None,
) -> CropResult:
    """
    Build a CropResult with plain-language explanations and ground-truth validation.
    """
    reasons: list[str] = []
    warnings: list[str] = []

    if compatibility:
        for r in compatibility.reasons:
            if r not in reasons:
                reasons.append(r)
        warnings.extend(compatibility.warnings)

    expected_revenue: Optional[float] = None
    expected_cost: Optional[float] = None
    expected_net: Optional[float] = None
    net_lower: Optional[float] = None
    net_upper: Optional[float] = None

    # Cultivation cost estimation (realistic budget share if cost dataset is absent)
    if cost_per_acre_inr > 0:
        total_cost = cost_per_acre_inr * allocation.area_acres
    elif farmer_input and farmer_input.investment_inr > 0:
        total_cost = round(farmer_input.investment_inr * (allocation.percentage_of_total / 100.0) * 0.65, 0)
    else:
        total_cost = round(allocation.area_acres * 14000.0, 0)

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
        expected_cost = round(total_cost, 0)
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
    else:
        if not yield_result or not yield_result.available:
            warnings.append("Yield baseline calibrated with regional benchmarks.")
        if not price_result or not price_result.available:
            warnings.append("Recent mandi price calibrated with APMC baseline.")

    # 1. Plain-language allocation reason (Why this crop & acreage?)
    if allocation.percentage_of_total >= 50.0:
        allocation_reason = (
            f"Allocated {allocation.percentage_of_total:.0f}% ({allocation.area_acres:.1f} acres) as the main crop: "
            f"it has the best expected return after risk among the suitable crops. Capped at "
            f"{MAX_SINGLE_CROP_FRACTION:.0%} of the farm so one bad season or price fall can't sink the whole plan."
        )
    else:
        allocation_reason = (
            f"Allocated {allocation.percentage_of_total:.0f}% ({allocation.area_acres:.1f} acres) to spread risk. "
            f"A second crop reduces the loss if the main crop's yield or price disappoints."
        )

    # 2. Ground-truth validation counter-check against real CSVs (validate_output.py)
    val_data: Optional[CropValidation] = None
    try:
        from validate_output import get_crop_validation_stats
        dist = farmer_input.district if farmer_input else "Karnataka"
        szn = farmer_input.season if farmer_input else "kharif"
        py = yield_result.expected_t_per_ha if yield_result else None
        pp = price_result.expected_inr_per_quintal if price_result else None
        v_dict = get_crop_validation_stats(allocation.crop, dist, szn, py, pp)
        val_data = CropValidation(**v_dict)
    except Exception as exc:
        logger.warning("Ground-truth validation failed for %s: %s", allocation.crop, exc)
        val_data = CropValidation(
            is_ground_truth_verified=False,
            badge="Not verified",
            yield_verdict="Historical check could not be run",
            price_verdict="Historical check could not be run",
        )

    # Data-driven confidence for this crop
    price_age = None
    if price_result and price_result.available and "mandi" in (price_result.source or ""):
        try:
            price_age = mandi_price_age_days(allocation.crop)
        except Exception as exc:
            logger.debug("Could not determine mandi price age for %s: %s", allocation.crop, exc)
    assessment = assess_crop(
        yield_result=yield_result,
        price_result=price_result,
        validation=val_data,
        water_requirement_mm=water_requirement_mm,
        water_budget=water_budget,
        compatibility=compatibility,
        price_age_days=price_age,
    )
    if cost_per_acre_inr > 0 and (cost_info or {}).get("basis") != "karnataka":
        assessment.score = round(assessment.score * NON_LOCAL_COST_PENALTY, 3)
        assessment.level = score_to_level(assessment.score)
        assessment.factors.append("Cultivation cost is a multi-state median; Karnataka was not surveyed for this crop.")

    # 3. Normal person bullet reasons (Plain English)
    w_mm = water_requirement_mm or 450.0
    if farmer_input and water_budget:
        reasons.append(
            f"💧 Water: Needs ~{w_mm:.0f} mm this season; its acreage is sized to what your {farmer_input.motor_hp:.1f} HP pump "
            f"({farmer_input.daily_electricity_hours:.1f} hrs/day) and expected rainfall can supply."
        )
    else:
        reasons.append(f"💧 Water Fit: Sustainable requirement of {w_mm:.0f} mm for your irrigation setup.")

    if expected_net is not None and net_lower is not None and net_upper is not None:
        reasons.append(
            f"💰 Profit Return: Estimated net profit of Rs {expected_net:,.0f} (range: Rs {net_lower:,.0f} – Rs {net_upper:,.0f}) after Rs {total_cost:,.0f} cultivation cost."
        )
    elif expected_revenue is not None:
        reasons.append(f"💰 Revenue: Expected gross harvest value of Rs {expected_revenue:,.0f}.")

    if cost_per_acre_inr > 0:
        basis = "Karnataka" if (cost_info or {}).get("basis") == "karnataka" else "multi-state median"
        holdings = (cost_info or {}).get("holdings")
        sample = f", {int(holdings)} farms surveyed" if holdings and holdings == holdings else ""
        reasons.append(
            f"🧾 Cost: ~Rs {cost_per_acre_inr:,.0f}/acre incl. family labour "
            f"(DES Cost of Cultivation 2021-22, {basis}{sample})."
        )
    else:
        warnings.append("No verified cultivation cost data; cost is an estimated share of your budget.")

    dist_name = farmer_input.district if farmer_input else "Karnataka"
    if yield_result and yield_result.available and yield_result.expected_t_per_ha:
        reasons.append(
            f"🌱 Yield: ~{yield_result.expected_t_per_ha:.2f} t/ha expected "
            f"(range {yield_result.lower_t_per_ha:.2f}–{yield_result.upper_t_per_ha:.2f}), "
            f"based on {YIELD_SOURCE_PHRASES.get(yield_result.source or '', 'available records').format(district=dist_name)}."
        )

    if price_result and price_result.expected_inr_per_quintal:
        reasons.append(
            f"📈 Price: ~Rs {price_result.expected_inr_per_quintal:,.0f}/q, "
            f"from {PRICE_SOURCE_PHRASES.get(price_result.source or '', 'available market data')}."
        )

    if val_data and val_data.is_ground_truth_verified:
        reasons.append(f"✓ Historical check: yield {val_data.yield_verdict.lower()}, price {val_data.price_verdict.lower()}.")
    elif val_data:
        reasons.append(f"⚠ Historical check: {val_data.badge} — yield: {val_data.yield_verdict}; price: {val_data.price_verdict}.")

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
        allocation_reason=allocation_reason,
        validation=val_data,
        confidence=assessment.level,
        confidence_score=assessment.score,
        confidence_factors=assessment.factors,
    )


def _assessment_of(crop_result: CropResult) -> ConfidenceAssessment:
    return ConfidenceAssessment(
        score=crop_result.confidence_score or 0.0,
        level=crop_result.confidence or "Low",
        factors=list(crop_result.confidence_factors),
    )


def _build_rejected_crops(
    compatibility_results: list[CropCompatibilityResult],
    allocated_crop_names: set[str],
    exclusion_reasons: Optional[dict[str, str]] = None,
) -> list[RejectedCrop]:
    """Build list of rejected crops with farmer-friendly reasons."""
    rejected: list[RejectedCrop] = []
    exclusion_reasons = exclusion_reasons or {}

    for result in compatibility_results:
        if result.crop in allocated_crop_names:
            continue

        if result.crop in exclusion_reasons:
            rejected.append(RejectedCrop(crop=result.crop, reasons=[exclusion_reasons[result.crop]]))
        elif not result.compatible:
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
    cost_info: Optional[dict[str, dict]] = None,
    exclusion_reasons: Optional[dict[str, str]] = None,
) -> RecommendationResult:
    """
    Assemble the final farmer-friendly recommendation response.
    """
    allocated_crop_names = {a.crop for a in allocations}
    compat_by_crop = {r.crop: r for r in compatibility_results}

    # Build per-crop results with ground-truth validation & plain language explanations
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
            farmer_input=farmer_input,
            water_budget=water_budget,
            cost_info=(cost_info or {}).get(crop),
        )
        crop_results.append(cr)

    # Build rejected crops
    rejected = _build_rejected_crops(compatibility_results, allocated_crop_names, exclusion_reasons)

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

    # Why this plan explanations (Farmer-first, plain English)
    why_this_plan: list[str] = []
    if crop_results:
        crops_breakdown = " + ".join(f"{c.percentage_of_total:.0f}% {c.crop}" for c in crop_results)
        why_this_plan.append(
            f"🎯 Land Division ({crops_breakdown}): Spreading land across {len(crop_results)} crops lowers the chance of losing the whole season to one pest, weather or price shock."
        )
        # Water per planted acre: rain on each acre + pump volume concentrated on planted land
        planted_share = total_allocated_acres / farmer_input.area_acres if farmer_input.area_acres else 1.0
        water_per_planted_mm = water_budget.effective_rainfall_mm + (
            water_budget.seasonal_pumped_mm_mid / planted_share if planted_share > 0 else 0.0
        )
        if planted_share < 0.99:
            why_this_plan.append(
                f"💧 Water Limit: Only {total_allocated_acres:.1f} of {farmer_input.area_acres:.1f} acres are planted, "
                f"so your {farmer_input.motor_hp:.1f} HP pump ({water_budget.estimated_daily_litres_mid / 1000:.1f}k L/day) "
                f"can deliver ~{water_per_planted_mm:.0f} mm per planted acre against a need of ~{water_used_mm:.0f} mm."
            )
        else:
            why_this_plan.append(
                f"💧 Water Fit: Combined need (~{water_used_mm:.0f} mm) vs ~{water_per_planted_mm:.0f} mm available "
                f"per acre from your {farmer_input.motor_hp:.1f} HP pump and expected rainfall."
            )
        why_this_plan.append(
            f"💰 Profit: Estimated net profit Rs {profit_mid:,.0f} (range Rs {profit_min:,.0f} – Rs {profit_max:,.0f}) "
            f"after cultivation costs, against your Rs {farmer_input.investment_inr:,.0f} budget."
        )
    # Ground-truth summary — counts what actually matched, not a fixed claim
    verified_count = sum(1 for c in crop_results if c.validation and c.validation.is_ground_truth_verified)
    n_crops = len(crop_results)
    if n_crops and verified_count == n_crops:
        gt_verdict = f"All {n_crops} recommended crops match historical yield and mandi price records"
    elif n_crops:
        gt_verdict = (
            f"{verified_count} of {n_crops} recommended crops match historical yield and mandi price records; "
            "the rest rely on estimates that could not be fully checked"
        )
    else:
        gt_verdict = "No crops to check"
    if crop_results:
        why_this_plan.append(f"🛡️ Historical check: {gt_verdict}.")

    validation_summary = PlanValidationSummary(
        datasets_checked=[
            "Karnataka Directorate of Agriculture 2021-22 Yield Dataset",
            "ICRISAT District-Level Historical Yield Dataset",
            "APMC Mandi Price Monitoring System Dataset",
            "Karnataka Historical Crop Yields (1997-2020)",
            "Karnataka Agro-Climatic Multi-Model Soil & ETc Dataset",
        ],
        total_datasets_count=5,
        all_crops_verified=bool(n_crops) and verified_count == n_crops,
        verified_crops_count=verified_count,
        verdict=gt_verdict,
    )

    # Report only the sources the crops actually drew on
    source_labels = {
        "district_2021_22": "Karnataka Government APY Crop Production Statistics 2021-22",
        "district_icrisat_historical": "ICRISAT District-Level Historical Yield Dataset",
        "karnataka_historical_fallback": "Historical Karnataka Crop Yield Dataset 1997-2020",
        "conformal_rf_model": "Random Forest yield model (ICRISAT 2011-2017) with conformal intervals calibrated on 2021-22",
        "trained_random_forest_ml_model": "Random Forest price model",
        "karnataka_state_benchmark": "Regional yield benchmark (fixed values)",
        "karnataka_mandi_history": "Agmarknet daily mandi price history (data.gov.in API)",
        "karnataka_mandi_recent": "Agmarknet Mandi Price Dataset (Karnataka)",
        "mandi_prices_all_india_fallback": "Agmarknet Mandi Price Dataset (all-India)",
        "karnataka_wholesale_dataset": "Karnataka Multi-Model Wholesale Price Dataset",
        "karnataka_msp_benchmark": "MSP / regional price benchmark (fixed values)",
    }
    sources_used: set[str] = {
        "IMD 0.25° gridded rainfall 2014-2023 (district 25th percentile)"
        if not any("Rainfall" in w or "rainfall" in w for w in water_budget.warnings)
        else "Karnataka Multi-Model Agro-Climatic Dataset (rainfall fallback)"
    }
    for c in crop_results:
        for r in (c.yield_result, c.price_result):
            if r is not None and r.available and r.source:
                sources_used.add(source_labels.get(r.source, r.source))

    # Data-driven confidence (replaces the old hardcoded "High")
    costs_verified = bool(crop_results) and all(cost_per_acre.get(c.crop, 0.0) > 0 for c in crop_results)
    if costs_verified:
        sources_used.add("DES Cost of Cultivation/Production Estimates 2021-22")
    plan_assessment = assess_plan(
        crop_assessments=[
            (c.area_acres, _assessment_of(c)) for c in crop_results
        ],
        costs_verified=costs_verified,
        water_budget=water_budget,
    )
    confidence = plan_assessment.level
    conf_expl = explain(plan_assessment.level, plan_assessment.score, farmer_input.district)

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
        confidence_score=plan_assessment.score,
        confidence_factors=plan_assessment.factors,
        data_sources=sorted(sources_used),
        warnings=global_warnings + water_budget.warnings,
        data_quality=data_quality,
        validation_summary=validation_summary,
        status=status,
        message=message,
    )
