"""
crop_optimizer.py — FastAPI route for the Crop Optimization module.

Endpoint:
    POST /api/v1/crop-optimizer/recommend

Accepts FarmerInput, runs the pipeline, returns RecommendationResult.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from crop_optimization.pipeline import run_pipeline
from crop_optimization.schemas import FarmerInput, RecommendationResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/crop-optimizer", tags=["Crop Optimizer"])


@router.post("/recommend", response_model=RecommendationResult)
@router.post("/optimize", response_model=RecommendationResult)
def recommend(farmer_input: FarmerInput) -> RecommendationResult:
    """
    Recommend optimal crop allocation for a farmer.

    Given farmer land, location, budget, irrigation setup, and season,
    returns a list of recommended crops with area allocations, expected
    profit ranges, water usage, and risk metrics.

    If datasets or ML models are missing, the endpoint still returns a
    partial result with honest warnings rather than failing silently.
    """
    try:
        result = run_pipeline(farmer_input)
        return result
    except Exception as exc:
        logger.exception("Unexpected error in crop optimizer pipeline: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=(
                "An unexpected error occurred in the crop optimizer pipeline. "
                f"Details: {exc}"
            ),
        ) from exc
