"""
crop_optimizer.py — FastAPI route for the Crop Optimization module.

Endpoint:
    POST /api/v1/crop-optimizer/recommend

Accepts FarmerInput, runs the pipeline, returns RecommendationResult.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from crop_optimization.pipeline import (
    _build_resilient_input_recommendation,
    run_pipeline,
)
from crop_optimization.schemas import FarmerInput, RecommendationResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/crop-optimizer", tags=["Crop Optimizer"])

# Registry of active optimization plans for downstream endpoints (e.g. Risk Analysis)
ACTIVE_PLANS: dict[str, RecommendationResult] = {}


@router.post("/recommend", response_model=RecommendationResult)
@router.post("/optimize", response_model=RecommendationResult)
def recommend(farmer_input: FarmerInput) -> RecommendationResult:
    """
    Recommend optimal crop allocation for a farmer.

    Given farmer land, location, budget, irrigation setup, and season,
    returns a list of recommended crops with area allocations, expected
    profit ranges, water usage, and risk metrics.
    """
    try:
        result = run_pipeline(farmer_input)
    except Exception as exc:
        logger.exception("Unexpected error in crop optimizer pipeline: %s. Using resilient input-tailored plan.", exc)
        result = _build_resilient_input_recommendation(farmer_input, str(exc))

    # Cache for downstream endpoints (e.g. Risk Analysis)
    plan_id = f"{result.location.lower()}-{result.season.lower()}"
    ACTIVE_PLANS[plan_id] = result
    ACTIVE_PLANS["latest"] = result

    return result

