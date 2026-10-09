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

from crop_optimization.compatibility.crop_filter import (
    CROP_WATER_REQUIREMENTS_MM,
    filter_crops,
)
from crop_optimization.data_loader import load_all_datasets
from crop_optimization.normalization import normalize_district, normalize_season
from crop_optimization.optimizer.nsga2 import CropCandidate, optimize_allocation
from crop_optimization.price_model.model import predict_price
from crop_optimization.recommendation.recommendation import build_recommendation
from crop_optimization.risk.monte_carlo import simulate_crop_profit
from crop_optimization.schemas import (
    DataQualitySummary,
    FarmerInput,
    PriceResult,
    RecommendationResult,
    RiskResult,
    YieldResult,
)
from crop_optimization.water.water_budget import calculate_water_budget
from crop_optimization.yield_model.model import predict_yield

logger = logging.getLogger(__name__)


def run_crop_optimization(farmer_input: FarmerInput) -> RecommendationResult:
    """
    Execute the end-to-end constraint-aware crop optimization pipeline.

    Parameters
    ----------
    farmer_input : FarmerInput
        Validated farmer details from frontend.

    Returns
    -------
    RecommendationResult
    """
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

    # Early exit if 0 crops are compatible
    if not compatible_crops:
        global_warnings.append(
            f"No crops passed compatibility checks for {farmer_input.district} during {farmer_input.season.capitalize()}."
        )
        data_quality = DataQualitySummary(
            soil_data_available=farmer_input.soil is not None,
            weather_data_available=True,
            mandi_data_available=True,
            yield_model_trained=True,
            price_model_trained=True,
            warnings=global_warnings,
        )
        return build_recommendation(
            farmer_input=farmer_input,
            water_budget=water_budget,
            allocations=[],
            compatibility_results=compatibility_results,
            yield_results={},
            price_results={},
            risk_results={},
            cost_per_acre={},
            water_requirements={},
            data_quality=data_quality,
            global_warnings=global_warnings,
        )

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

    # 6. Cultivation costs & water requirements
    cost_per_acre: dict[str, float] = {}
    water_requirements: dict[str, Optional[float]] = {}

    for compat in compatible_crops:
        crop = compat.crop
        # Crop water requirement from multi-model / agro-climatic table
        water_requirements[crop] = CROP_WATER_REQUIREMENTS_MM.get(crop, 500.0)
        # Cultivation cost: none of the 5 datasets has verified complete cultivation costs
        cost_per_acre[crop] = 0.0

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
                cost_per_acre_inr=cost_per_acre.get(crop, 0.0),
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

    # 10. Data quality indicators
    data_quality = DataQualitySummary(
        soil_data_available=farmer_input.soil is not None,
        weather_data_available=True,
        mandi_data_available=any(p.available for p in price_results.values()),
        yield_model_trained=any(y.available for y in yield_results.values()),
        price_model_trained=any(p.available for p in price_results.values()),
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
    )

    logger.info(
        "Optimization complete: %d recommended crops, total allocated=%.2f acres, confidence=%s",
        len(result.recommendations),
        sum(c.area_acres for c in result.recommendations),
        result.confidence,
    )

    return result


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
