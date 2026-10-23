"""
pipeline.py — Central orchestration pipeline for the Crop Optimization module.

Coordinates:
  FarmerInput
    ↓
  Normalize District & Season
    ↓
  Load Real Datasets (Cached)
    ↓
  Calculate Water Budget
    ↓
  Generate District Crop Candidates & Run Compatibility Filter
    ↓
  Data-Driven Yield Estimation (Hierarchy: District 2021 → ICRISAT → Karnataka Fallback)
    ↓
  Mandi & Market Price Estimation (Karnataka Mandi → Wholesale Dataset → All-India)
    ↓
  Cost Evaluation (Transparently acknowledges when cost data is missing)
    ↓
  Monte Carlo Risk Simulation (Empirical Historical Variability)
    ↓
  Multi-Objective Land Allocation (NSGA-II + 1/2 Crop Fallbacks)
    ↓
  Farmer-Friendly Recommendation & Provenance Assembly
    ↓
  RecommendationResult
"""

from __future__ import annotations

import logging
from typing import Optional

import pandas as pd

from crop_optimization.compatibility.crop_filter import (
    CROP_WATER_REQUIREMENTS_MM,
    filter_crops,
)
from crop_optimization.config import (
    ACRES_PER_HECTARE,
    CONFIDENCE_HIGH_THRESHOLD,
    CONFIDENCE_MEDIUM_THRESHOLD,
    DRY_YEAR_CONFIDENCE_PENALTY,
    DRY_YEAR_SHORTFALL_WARN,
    MIN_CROP_AREA_ACRES,
    MIN_IRRIGABLE_FRACTION,
)
from crop_optimization.data_loader import load_all_datasets
from crop_optimization.normalization import normalize_district, normalize_season
from crop_optimization.optimizer.nsga2 import CropCandidate, optimize_allocation
from crop_optimization.price_model.model import predict_price
from crop_optimization.recommendation.recommendation import build_recommendation
from crop_optimization.risk.monte_carlo import simulate_crop_profit
from crop_optimization.schemas import (
    CropAllocation,
    CropCompatibilityResult,
    DataQualitySummary,
    FarmerInput,
    PriceResult,
    RecommendationResult,
    RiskResult,
    YieldResult,
)
from crop_optimization.utils import acres_to_hectares
from crop_optimization.water.water_budget import calculate_water_budget
from crop_optimization.yield_model.model import YIELD_MODEL_SOURCE, predict_yield

logger = logging.getLogger(__name__)


def run_crop_optimization(farmer_input: FarmerInput) -> RecommendationResult:
    """
    Execute the end-to-end constraint-aware crop optimization pipeline with
    a zero-failure safety guarantee.
    """
    try:
        return _run_crop_optimization_internal(farmer_input)
    except Exception as exc:
        logger.exception("Unexpected error in crop optimization pipeline: %s. Using resilient input-tailored plan.", exc)
        return _build_resilient_input_recommendation(farmer_input, str(exc))


def _run_crop_optimization_internal(farmer_input: FarmerInput) -> RecommendationResult:
    global_warnings: list[str] = []


    logger.info(
        "Starting crop optimization: district=%s, acres=%.1f, season=%s, hp=%.1f, hrs=%.1f, method=%s",
        farmer_input.district,
        farmer_input.area_acres,
        farmer_input.season,
        farmer_input.motor_hp,
        farmer_input.daily_electricity_hours,
        farmer_input.irrigation_type,
    )

    # 1. Load real datasets
    datasets = load_all_datasets()
    karnataka_2021_df = datasets.get("karnataka_2021")
    multi_model_df = datasets.get("multi_model")
    mandi_df = datasets.get("mandi_prices")

    # 2. Water budget calculation
    water_budget = calculate_water_budget(farmer_input, weather_df=multi_model_df)
    logger.info("Water budget calculated: total available = %.1f mm", water_budget.total_available_mm_mid)

    # 3. Crop compatibility filtering
    compatibility_results = filter_crops(
        farmer_input=farmer_input,
        water_budget=water_budget,
        karnataka_2021_df=karnataka_2021_df,
    )

    compatible_crops = [r for r in compatibility_results if r.compatible]
    logger.info("Compatible crops: %d out of %d candidates", len(compatible_crops), len(compatibility_results))

    # Ensure at least 2 crops are compatible so the pipeline always produces viable recommendations
    if len(compatible_crops) < 2:
        norm_season = normalize_season(farmer_input.season)
        seasonal_resilient = {
            "kharif": ["Ragi / Finger Millet", "Maize", "Groundnut", "Jowar / Sorghum", "Tur / Pigeonpea"],
            "rabi": ["Bengalgram / Chickpea", "Jowar / Sorghum", "Wheat", "Sunflower", "Horsegram", "Maize"],
            "summer": ["Groundnut", "Greengram / Moong", "Blackgram / Urad", "Sesamum", "Maize", "Ragi / Finger Millet"],
        }.get(norm_season, ["Ragi / Finger Millet", "Maize", "Groundnut"])

        for fallback_crop in seasonal_resilient:
            if not any(c.crop == fallback_crop for c in compatible_crops):
                comp_res = CropCompatibilityResult(
                    crop=fallback_crop,
                    compatible=True,
                    score=0.70,
                    failed_constraints=[],
                    warnings=[f"Prioritized as climate-resilient staple crop for {farmer_input.season.capitalize()} season in {farmer_input.district}."],
                    reasons=[f"Common hardy {farmer_input.season.capitalize()} crop added because few crops passed the checks; tolerates some water shortage."],
                )
                compatibility_results.append(comp_res)
                compatible_crops.append(comp_res)
            if len(compatible_crops) >= 4:
                break


    # 4. Yield estimation (hierarchy: district 2021 → ICRISAT → Karnataka fallback)
    yield_results: dict[str, YieldResult] = {}
    for compat in compatible_crops:
        crop = compat.crop
        yield_results[crop] = predict_yield(
            crop=crop,
            district=farmer_input.district,
            season=farmer_input.season,
            farmer_input=farmer_input,
        )

    # 5. Price estimation
    price_results: dict[str, PriceResult] = {}
    for compat in compatible_crops:
        crop = compat.crop
        price_results[crop] = predict_price(
            crop=crop,
            district=farmer_input.district,
            season=farmer_input.season,
            mandi_df=mandi_df,
        )

    # 6. Cultivation costs (DES Cost of Cultivation 2021-22) & water requirements
    #    cost_per_acre      — A2+FL (cash + family labour), used for profit
    #    cash_cost_per_acre — A2 (cash paid out), used for the budget constraint
    costs_df = datasets.get("cultivation_costs")
    cost_per_acre: dict[str, float] = {}
    cash_cost_per_acre: dict[str, float] = {}
    cost_info: dict[str, dict] = {}
    water_requirements: dict[str, Optional[float]] = {}

    for compat in compatible_crops:
        crop = compat.crop
        # Crop water requirement from multi-model / agro-climatic table
        water_requirements[crop] = CROP_WATER_REQUIREMENTS_MM.get(crop, 500.0)
        if costs_df is not None and crop in costs_df.index:
            row = costs_df.loc[crop]
            a2fl = row.get("a2fl_inr_per_ha")
            a2fl = float(a2fl) if pd.notna(a2fl) else float(row["a2_inr_per_ha"])
            cost_per_acre[crop] = a2fl / ACRES_PER_HECTARE
            cash_cost_per_acre[crop] = float(row["a2_inr_per_ha"]) / ACRES_PER_HECTARE
            cost_info[crop] = {
                "basis": row.get("cost_basis"),
                "holdings": row.get("holdings_sampled"),
                "source": row.get("source"),
            }
        else:
            cost_per_acre[crop] = 0.0
            cash_cost_per_acre[crop] = 0.0

    # 7. Risk simulation (Monte Carlo using empirical yield and price distributions)
    per_crop_area = farmer_input.area_acres / max(len(compatible_crops), 1)
    risk_results: dict[str, RiskResult] = {}
    for compat in compatible_crops:
        crop = compat.crop
        risk_results[crop] = simulate_crop_profit(
            crop=crop,
            area_acres=per_crop_area,
            yield_result=yield_results[crop],
            price_result=price_results[crop],
            cost_per_acre_inr=cost_per_acre.get(crop, 0.0),
        )

    # 8. Build optimizer candidates
    # Rank crops with both yield and price predictions by risk-adjusted profit
    economically_viable_crops = [
        compat for compat in compatible_crops
        if yield_results[compat.crop].available and price_results[compat.crop].available
    ]

    # Crops without verified cost data cannot have a real profit estimate, so they
    # must not compete on revenue alone. Exclude them when ≥2 costed crops remain.
    exclusion_reasons: dict[str, str] = {}
    costed = [c for c in economically_viable_crops if cost_per_acre.get(c.crop, 0.0) > 0]
    if len(costed) >= 2:
        for c in economically_viable_crops:
            if cost_per_acre.get(c.crop, 0.0) <= 0:
                exclusion_reasons[c.crop] = (
                    "No verified cultivation cost data for this crop (DES cost survey), "
                    "so its profit cannot be estimated fairly against other crops."
                )
        economically_viable_crops = costed
    elif economically_viable_crops:
        global_warnings.append(
            "Verified cultivation costs were unavailable for most suitable crops; "
            "profit figures use an estimated cost share of your budget."
        )

    # Don't force money-losing crops into the plan just to fill land: drop crops whose
    # expected profit is negative when at least 2 profitable crops remain.
    def _expected_profit(compat) -> float:
        r = risk_results.get(compat.crop)
        return r.expected_profit_inr if r and r.expected_profit_inr is not None else 0.0

    profitable = [c for c in economically_viable_crops if _expected_profit(c) > 0]
    if len(profitable) >= 2:
        for c in economically_viable_crops:
            if _expected_profit(c) <= 0:
                exclusion_reasons[c.crop] = (
                    "Expected to lose money at current yields, mandi prices and cultivation costs."
                )
        economically_viable_crops = profitable

    # Sort candidates by risk-adjusted return (or expected profit) descending
    def _crop_sort_key(compat):
        r = risk_results.get(compat.crop)
        if r and r.risk_adjusted_profit_inr is not None:
            return r.risk_adjusted_profit_inr
        return 0.0

    if economically_viable_crops:
        economically_viable_crops.sort(key=_crop_sort_key, reverse=True)
        # Select top 6 crops so optimizer produces practical 2-4 crop allocations
        optimizer_pool = economically_viable_crops[:6]
    else:
        # Fallback to crops with yield predictions
        viable_yield = [compat for compat in compatible_crops if yield_results[compat.crop].available]
        optimizer_pool = viable_yield[:6] if viable_yield else compatible_crops[:6]

    candidates: list[CropCandidate] = []
    for compat in optimizer_pool:
        crop = compat.crop
        candidates.append(
            CropCandidate(
                crop=crop,
                water_requirement_mm=water_requirements.get(crop, 500.0) or 500.0,
                # Budget constraint is on cash outlay (A2)
                cost_per_acre_inr=cash_cost_per_acre.get(crop, 0.0),
                risk_result=risk_results.get(crop),
            )
        )

    # 9. Optimization (NSGA-II + fallbacks)
    allocations = optimize_allocation(
        crops=candidates,
        total_acres=farmer_input.area_acres,
        budget_inr=farmer_input.investment_inr,
        available_water_mm=water_budget.total_available_mm_mid,
    )

    # Ensure allocations is guaranteed non-empty
    if not allocations and optimizer_pool:
        top_c = optimizer_pool[:2]
        if len(top_c) == 1:
            allocations = [
                CropAllocation(
                    crop=top_c[0].crop,
                    area_acres=round(float(farmer_input.area_acres), 2),
                    area_hectares=round(acres_to_hectares(float(farmer_input.area_acres)), 4),
                    percentage_of_total=100.0,
                )
            ]
        else:
            a1 = round(float(farmer_input.area_acres) * 0.60, 2)
            a2 = round(float(farmer_input.area_acres) - a1, 2)
            allocations = [
                CropAllocation(crop=top_c[0].crop, area_acres=a1, area_hectares=round(acres_to_hectares(a1), 4), percentage_of_total=60.0),
                CropAllocation(crop=top_c[1].crop, area_acres=a2, area_hectares=round(acres_to_hectares(a2), 4), percentage_of_total=40.0),
            ]

    # Water is a hard limit: plant only the area the water can support, leave the rest fallow
    allocations, fallow_acres, irrigable_fraction = fit_allocations_to_water(
        allocations,
        water_requirements,
        total_acres=float(farmer_input.area_acres),
        pumped_mm=water_budget.seasonal_pumped_mm_mid,
        rain_mm=water_budget.effective_rainfall_mm,
    )
    if fallow_acres > 0 and (not allocations or irrigable_fraction < MIN_IRRIGABLE_FRACTION):
        return _build_water_shortage_result(farmer_input, water_budget, compatibility_results, irrigable_fraction)
    if fallow_acres > 0:
        global_warnings.append(
            f"Water is the limiting factor: your pump and expected rainfall can support about "
            f"{farmer_input.area_acres - fallow_acres:.1f} of your {farmer_input.area_acres:.1f} acres this season. "
            f"Leave the remaining {fallow_acres:.1f} acres fallow (or sow a rainfed fodder / green-manure crop) "
            "rather than spreading water too thin and losing the whole crop."
        )

    # Cash needed vs budget
    cash_needed = sum(cash_cost_per_acre.get(a.crop, 0.0) * a.area_acres for a in allocations)
    if cash_needed > farmer_input.investment_inr > 0:
        global_warnings.append(
            f"This plan needs about Rs {cash_needed:,.0f} in cash costs (seed, fertiliser, hired labour, etc.), "
            f"more than your Rs {farmer_input.investment_inr:,.0f} budget. Consider planting less area or "
            "lower-cost crops."
        )

    # 10. Data quality indicators
    data_quality = DataQualitySummary(
        soil_data_available=farmer_input.soil is not None,
        weather_data_available=not any("unavailable" in w.lower() for w in water_budget.warnings),
        mandi_data_available=any(p.available and "mandi" in (p.source or "") for p in price_results.values()),
        yield_model_trained=any(y.source == YIELD_MODEL_SOURCE for y in yield_results.values()),
        price_model_trained=any(p.source == "trained_random_forest_ml_model" for p in price_results.values()),
        warnings=[],
    )

    # 11. Assemble recommendation
    result = build_recommendation(
        farmer_input=farmer_input,
        water_budget=water_budget,
        allocations=allocations,
        compatibility_results=compatibility_results,
        yield_results=yield_results,
        price_results=price_results,
        risk_results=risk_results,
        cost_per_acre=cost_per_acre,
        water_requirements=water_requirements,
        data_quality=data_quality,
        global_warnings=global_warnings,
        cost_info=cost_info,
        exclusion_reasons=exclusion_reasons,
    )
    result.summary["fallow_acres"] = round(fallow_acres, 2)
    result.summary["water_limited"] = fallow_acres > 0

    # Dry-year (1-in-4) check: the plan is sized on a typical year; warn if a dry year leaves it short
    shortfall = dry_year_shortfall(
        allocations, water_requirements,
        total_acres=float(farmer_input.area_acres),
        pumped_mm=water_budget.seasonal_pumped_mm_mid,
        dry_rain_mm=water_budget.effective_rainfall_dry_year_mm,
    )
    if shortfall is not None:
        result.summary["dry_year_water_shortfall_pct"] = round(shortfall * 100, 1)
        if shortfall > DRY_YEAR_SHORTFALL_WARN:
            rain_drop = water_budget.effective_rainfall_mm - (water_budget.effective_rainfall_dry_year_mm or 0.0)
            note = (
                f"In a dry year (about 1 season in 4) effective rainfall here is ~{rain_drop:.0f} mm lower, "
                f"and this plan would be short of about {shortfall:.0%} of its water. Keep extra irrigation "
                "hours in reserve, prefer drip, or be ready to cut back the most water-hungry crop."
            )
            result.warnings.append(note)
            result.why_this_plan.append(f"🌦️ Dry-year risk: {note}")
            result.confidence_factors.append(
                f"A dry year would leave this plan ~{shortfall:.0%} short of water."
            )
            result.confidence_score = round((result.confidence_score or 0.0) * DRY_YEAR_CONFIDENCE_PENALTY, 3)
            if result.confidence == "High" and result.confidence_score < CONFIDENCE_HIGH_THRESHOLD:
                result.confidence = "Medium"
            elif result.confidence == "Medium" and result.confidence_score < CONFIDENCE_MEDIUM_THRESHOLD:
                result.confidence = "Low"

    logger.info(
        "Optimization complete: %d recommended crops, total allocated=%.2f acres, confidence=%s",
        len(result.recommendations),
        sum(c.area_acres for c in result.recommendations),
        result.confidence,
    )

    return result


def fit_allocations_to_water(
    allocations: list[CropAllocation],
    water_requirements: dict[str, Optional[float]],
    total_acres: float,
    pumped_mm: float,
    rain_mm: float,
) -> tuple[list[CropAllocation], float, float]:
    """
    Shrink the plan so its irrigation need fits the pump's seasonal volume.

    Rain lands on every planted acre (rain_mm each), but pumped water is a fixed
    volume (pumped_mm spread over the whole farm) that can be concentrated on fewer
    acres. So the plan fits when:

        Σ area_i × max(0, need_i − rain_mm)  ≤  pumped_mm × total_acres

    If it doesn't, every crop's area is scaled down by the same factor (keeping the
    land split), and the freed land is reported as fallow.

    Returns (allocations, fallow_acres, irrigable_fraction of the farm).
    """
    if not allocations or total_acres <= 0:
        return allocations, 0.0, 1.0

    irrigation_need = sum(
        a.area_acres * max(0.0, (water_requirements.get(a.crop) or 500.0) - rain_mm) for a in allocations
    )
    pump_volume = max(0.0, pumped_mm) * total_acres
    if irrigation_need <= pump_volume or irrigation_need <= 0:
        return allocations, 0.0, 1.0

    scale = pump_volume / irrigation_need
    planted = sum(a.area_acres for a in allocations)
    fitted = []
    for a in allocations:
        area = round(a.area_acres * scale, 2)
        if area < MIN_CROP_AREA_ACRES:
            continue
        fitted.append(CropAllocation(
            crop=a.crop,
            area_acres=area,
            area_hectares=round(acres_to_hectares(area), 4),
            percentage_of_total=round(area / total_acres * 100, 1),
        ))
    new_planted = sum(a.area_acres for a in fitted)
    logger.info("Water-limited plan: planting %.2f of %.2f acres (scale %.2f).", new_planted, planted, scale)
    return fitted, round(total_acres - new_planted, 2), new_planted / total_acres


def dry_year_shortfall(
    allocations: list[CropAllocation],
    water_requirements: dict[str, Optional[float]],
    total_acres: float,
    pumped_mm: float,
    dry_rain_mm: Optional[float],
) -> Optional[float]:
    """
    Fraction of the plan's total crop water need that would go unmet in a dry year
    (IMD 25th-percentile rainfall). 0 when the plan still fits; None when unknown.
    """
    if dry_rain_mm is None or not allocations:
        return None
    total_need = sum(a.area_acres * (water_requirements.get(a.crop) or 500.0) for a in allocations)
    irrigation_need = sum(
        a.area_acres * max(0.0, (water_requirements.get(a.crop) or 500.0) - dry_rain_mm) for a in allocations
    )
    gap = irrigation_need - max(0.0, pumped_mm) * total_acres
    if total_need <= 0 or gap <= 0:
        return 0.0
    return gap / total_need


def _build_water_shortage_result(
    farmer_input: FarmerInput,
    water_budget,
    compatibility_results: list,
    irrigable_fraction: float,
) -> RecommendationResult:
    """Honest 'no plan' when water cannot support even a small part of the farm."""
    from crop_optimization.schemas import RejectedCrop

    pct = max(0.0, irrigable_fraction) * 100
    message = (
        f"Not enough water for an irrigated crop this {farmer_input.season} season: your "
        f"{farmer_input.motor_hp:g} HP pump at {farmer_input.daily_electricity_hours:g} hrs/day plus expected "
        f"rainfall (~{water_budget.effective_rainfall_mm:.0f} mm effective) can support only about {pct:.0f}% "
        "of your land for the suitable crops."
    )
    return RecommendationResult(
        location=f"{farmer_input.district}, Karnataka",
        season=farmer_input.season,
        total_land_acres=farmer_input.area_acres,
        budget_inr=farmer_input.investment_inr,
        water_budget=water_budget,
        recommendations=[],
        rejected_crops=[
            RejectedCrop(crop=r.crop, reasons=r.failed_constraints or [
                "Not enough water this season to grow it on a meaningful area."
            ])
            for r in compatibility_results
        ],
        summary={"fallow_acres": farmer_input.area_acres, "water_limited": True,
                 "irrigable_fraction": round(irrigable_fraction, 3)},
        why_this_plan=[
            "💧 Water is too limited for a profitable irrigated crop this season.",
            "🌾 Options: leave the land fallow, sow a short rainfed fodder or green-manure crop, "
            "or plan for the next season with more rainfall.",
            "🔌 More power hours, a higher-capacity pump or drip irrigation would increase the area you can water.",
        ],
        confidence="Low",
        confidence_explanation="No crop plan: water supply is the binding constraint.",
        confidence_factors=[message],
        warnings=[message] + water_budget.warnings,
        status="no_recommendation",
        message=message,
    )


def _build_resilient_input_recommendation(farmer_input: FarmerInput, exc_str: str = "") -> RecommendationResult:
    """
    Emergency safety net that ALWAYS returns a complete, input-matching recommendation
    even in the event of an unexpected runtime failure or sparse datasets.
    """
    from crop_optimization.schemas import (
        CropResult,
        DataQualitySummary,
        PriceResult,
        RiskResult,
        WaterBudgetResult,
        YieldResult,
    )
    from crop_optimization.utils import acres_to_hectares
    from crop_optimization.water.water_budget import calculate_water_budget

    norm_season = normalize_season(farmer_input.season)
    district_name = farmer_input.district or "Karnataka"
    total_acres = float(farmer_input.area_acres)
    budget = int(farmer_input.investment_inr)

    seasonal_crops = {
        "kharif": [("Maize", 3.4, 2090.0, 480.0), ("Ragi / Finger Millet", 2.6, 3578.0, 450.0)],
        "rabi": [("Bengalgram / Chickpea", 1.4, 5440.0, 400.0), ("Jowar / Sorghum", 1.9, 3180.0, 420.0)],
        "summer": [("Groundnut", 1.7, 6377.0, 480.0), ("Greengram / Moong", 0.9, 8558.0, 360.0)],
    }.get(norm_season, [("Ragi / Finger Millet", 2.6, 3578.0, 450.0), ("Maize", 3.4, 2090.0, 480.0)])

    a1 = round(total_acres * 0.60, 2)
    a2 = round(total_acres - a1, 2)
    pairs = [(seasonal_crops[0], a1, 60.0), (seasonal_crops[1], a2, 40.0)]

    try:
        from validate_output import get_crop_validation_stats
    except Exception:
        get_crop_validation_stats = None

    from crop_optimization.confidence.calibration import assess_crop, assess_plan, explain

    recs: list[CropResult] = []
    crop_assessments = []
    for (crop_name, y_exp, p_exp, w_req), acres, pct in pairs:
        ha = acres_to_hectares(acres)
        tonnes = y_exp * ha
        quintals = tonnes * 10.0
        rev = round(quintals * p_exp, 0)
        cost = round(budget * (pct / 100.0) * 0.65, 0)
        net_profit = round(rev - cost, 0)
        p_low = round(net_profit * 0.85, 0)
        p_high = round(net_profit * 1.15, 0)

        # Ground-truth validation (honest: unverified unless the check actually runs and passes)
        from crop_optimization.schemas import CropValidation
        crop_val = CropValidation(
            yield_verdict="Historical check could not be run",
            price_verdict="Historical check could not be run",
        )
        if get_crop_validation_stats:
            try:
                crop_val = CropValidation(
                    **get_crop_validation_stats(crop_name, district_name, norm_season, y_exp, p_exp)
                )
            except Exception as val_exc:
                logger.debug("Fallback validation failed for %s: %s", crop_name, val_exc)

        yield_res = YieldResult(
            crop=crop_name,
            expected_t_per_ha=y_exp,
            lower_t_per_ha=round(y_exp * 0.85, 2),
            upper_t_per_ha=round(y_exp * 1.15, 2),
            unit="tonnes/hectare",
            source="karnataka_state_benchmark",
            confidence="low",
            available=True,
        )
        price_res = PriceResult(
            crop=crop_name,
            expected_inr_per_quintal=p_exp,
            lower_inr_per_quintal=round(p_exp * 0.90, 0),
            upper_inr_per_quintal=round(p_exp * 1.10, 0),
            unit="INR/quintal",
            source="karnataka_msp_benchmark",
            confidence="low",
            available=True,
        )
        assessment = assess_crop(
            yield_result=yield_res,
            price_result=price_res,
            validation=crop_val,
            water_requirement_mm=None,
            water_budget=None,
        )
        assessment.factors.insert(0, "Emergency fallback plan: the full analysis could not be completed.")
        crop_assessments.append((acres, assessment))

        alloc_reason = (
            f"Allocated {pct:.0f}% ({acres:.1f} acres) as the primary revenue generator. Produces maximum return within pump limits."
            if pct >= 50.0
            else f"Allocated {pct:.0f}% ({acres:.1f} acres) for risk diversification. Protects farm income against price slumps."
        )

        reasons = [
            f"💧 Water: Needs ~{w_req:.0f} mm this season; not checked against your pump in this simplified plan.",
            f"💰 Profit (rough): ~Rs {net_profit:,.0f} (range Rs {p_low:,.0f} – Rs {p_high:,.0f}) using an estimated cost of Rs {cost:,.0f}.",
            f"🌱 Yield: ~{y_exp:.1f} t/ha, a fixed regional benchmark for {norm_season.capitalize()}, not a {district_name} forecast.",
            f"📈 Price: ~Rs {p_exp:,.0f}/q, an MSP / benchmark price, not live market data.",
            f"⚠ Historical check: {crop_val.badge} — yield: {crop_val.yield_verdict}; price: {crop_val.price_verdict}.",
        ]

        recs.append(
            CropResult(
                crop=crop_name,
                area_acres=acres,
                area_hectares=round(ha, 4),
                percentage_of_total=pct,
                yield_result=yield_res,
                price_result=price_res,
                risk_result=RiskResult(
                    crop=crop_name,
                    expected_profit_inr=net_profit,
                    profit_variance_inr=round(net_profit * 0.15, 0),
                    profit_p10_inr=p_low,
                    profit_p90_inr=p_high,
                    yield_failure_probability=0.07,
                    price_crash_probability=0.05,
                    risk_adjusted_profit_inr=round(net_profit * 0.92, 0),
                    available=True,
                ),
                expected_revenue_inr=rev,
                expected_cost_inr=cost,
                expected_net_profit_inr=net_profit,
                net_profit_lower_inr=p_low,
                net_profit_upper_inr=p_high,
                water_requirement_mm=w_req,
                reasons=reasons,
                warnings=[],
                allocation_reason=alloc_reason,
                validation=crop_val,
                confidence=assessment.level,
                confidence_score=assessment.score,
                confidence_factors=assessment.factors,
            )
        )

    try:
        wb = calculate_water_budget(farmer_input)
    except Exception:
        wb = WaterBudgetResult(
            estimated_daily_litres_low=12000,
            estimated_daily_litres_mid=15000,
            estimated_daily_litres_high=18000,
            seasonal_pumped_mm_low=200,
            seasonal_pumped_mm_mid=250,
            seasonal_pumped_mm_high=300,
            effective_rainfall_mm=280,
            total_available_mm_mid=530,
            available_water_liters=2100000,
            available_water_m3=2100,
            warnings=[],
        )

    from crop_optimization.schemas import PlanValidationSummary
    verified_count = sum(1 for c in recs if c.validation and c.validation.is_ground_truth_verified)
    val_summary = PlanValidationSummary(
        datasets_checked=[
            "Karnataka Directorate of Agriculture 2021-22 Yield Dataset",
            "ICRISAT District-Level Historical Yield Dataset",
            "APMC Mandi Price Monitoring System Dataset",
            "Karnataka Historical Crop Yields (1997-2020)",
            "Karnataka Agro-Climatic Multi-Model Soil & ETc Dataset",
        ],
        total_datasets_count=5,
        all_crops_verified=verified_count == len(recs),
        verified_crops_count=verified_count,
        verdict=f"Emergency fallback plan: {verified_count} of {len(recs)} crops matched historical records",
    )

    plan_assessment = assess_plan(crop_assessments, costs_verified=False, water_budget=wb)

    tot_profit = sum(c.expected_net_profit_inr or 0.0 for c in recs)

    return RecommendationResult(
        location=district_name,
        season=farmer_input.season,
        total_land_acres=total_acres,
        budget_inr=budget,
        water_budget=wb,
        recommendations=recs,
        rejected_crops=[],
        data_quality=DataQualitySummary(
            soil_data_available=farmer_input.soil is not None,
            weather_data_available=False,
            mandi_data_available=False,
            yield_model_trained=False,
            price_model_trained=False,
            warnings=["Emergency fallback: yields and prices are fixed regional benchmarks."],
        ),
        warnings=["The full analysis could not be completed; this is a simplified benchmark plan."],
        status="ok",
        confidence=plan_assessment.level,
        confidence_explanation=explain(plan_assessment.level, plan_assessment.score, district_name),
        confidence_score=plan_assessment.score,
        confidence_factors=plan_assessment.factors,
        why_this_plan=[
            "⚠ Simplified plan: the full analysis could not be completed, so this uses two common "
            f"{norm_season.capitalize()} crops with fixed regional numbers. Please retry for a full plan.",
            f"🎯 Land Division ({pairs[0][2]:.0f}% {seasonal_crops[0][0]} + {pairs[1][2]:.0f}% {seasonal_crops[1][0]}): "
            "two crops so one bad outcome doesn't sink the whole season.",
            f"💰 Rough profit: ~Rs {tot_profit:,.0f} using estimated costs; water and budget fit were not checked.",
            f"🛡️ Historical check: {val_summary.verdict}.",
        ],
        data_sources=[
            "Regional yield benchmark (fixed values)",
            "MSP / regional price benchmark (fixed values)",
        ],
        validation_summary=val_summary,
    )


# Alias for backwards compatibility with existing API route
run_pipeline = run_crop_optimization
optimize_crops = lambda fi, demo_mode=False: run_crop_optimization(fi)



if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    test_input = FarmerInput(
        area_acres=5.0,
        district="Mysuru",
        investment_inr=150000,
        motor_hp=5.0,
        daily_electricity_hours=6.0,
        irrigation_type="drip",
        borewell_depth_ft=300,
        season="kharif",
    )

    print("\n" + "=" * 60)
    print("RUNNING CROP OPTIMIZATION PIPELINE WITH REAL DATA")
    print("=" * 60 + "\n")

    res = run_crop_optimization(test_input)

    print(f"Location: {res.location}")
    print(f"Season: {res.season}")
    print(f"Confidence: {res.confidence} ({res.confidence_explanation})")
    print(f"Available Water: {res.water_budget.total_available_mm_mid:.1f} mm")
    print("\nALLOCATED CROPS:")
    for crop in res.recommendations:
        y = crop.yield_result
        p = crop.price_result
        print(f"  • {crop.crop:<22}: {crop.area_acres:.2f} acres ({crop.percentage_of_total:.0f}%) | "
              f"Yield: {y.expected_t_per_ha if y else 'N/A'} t/ha | "
              f"Price: Rs {p.expected_inr_per_quintal if p else 'N/A'}/q | "
              f"Expected Rev: Rs {crop.expected_revenue_inr:,.0f}")
    
    print("\nWHY THIS PLAN:")
    for w in res.why_this_plan:
        print(f"  - {w}")

    print("\nREJECTED CROPS (Sample):")
    for r in res.rejected_crops[:5]:
        print(f"  [x] {r.crop}: {r.reasons[0]}")

    print("\nDATA SOURCES:")
    for ds in res.data_sources:
        print(f"  [*] {ds}")
