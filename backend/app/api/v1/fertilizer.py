from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.fertilizer_service import (
    get_fertilizer_recommendation,
    FertilizerRecommendationResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/fertilizer", tags=["Fertilizer & Spray Engine"])


class FertilizerRecommendationRequest(BaseModel):
    crop: str = "Ragi"
    district: str = "Mandya"
    budget_tier: str = "standard"  # "low", "standard", "high"
    acres: float = 1.0
    disease: Optional[str] = None


@router.post("/recommend", response_model=FertilizerRecommendationResponse)
def get_recommendation_post(
    payload: FertilizerRecommendationRequest,
) -> FertilizerRecommendationResponse:
    """
    Generate customized, farmer-friendly fertilizer & spray schedule.
    Accepts JSON body with crop, district, budget tier, farm size, and optional disease.
    """
    return get_fertilizer_recommendation(
        crop=payload.crop,
        district=payload.district,
        budget_tier=payload.budget_tier,
        acres=payload.acres,
        disease_detected=payload.disease,
    )


@router.get("/recommend", response_model=FertilizerRecommendationResponse)
def get_recommendation_get(
    crop: str = Query("Ragi", description="Crop name (e.g. Ragi, Maize, Paddy, Tomato, Cotton, Groundnut)"),
    district: str = Query("Mandya", description="Farmer's district in Karnataka"),
    budget_tier: str = Query("standard", description="Budget tier: 'low', 'standard', or 'high'"),
    acres: float = Query(1.0, description="Farm size in acres"),
    disease: Optional[str] = Query(None, description="Optional detected disease name to attach treatment"),
) -> FertilizerRecommendationResponse:
    """
    GET version for quick fetching or query-based exploration.
    """
    return get_fertilizer_recommendation(
        crop=crop,
        district=district,
        budget_tier=budget_tier,
        acres=acres,
        disease_detected=disease,
    )

