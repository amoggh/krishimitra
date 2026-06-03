from fastapi import APIRouter

from app.models.schemas import RiskAnalysis
from app.services.mock_engine import get_risk

router = APIRouter(prefix="/risk", tags=["risk"])


@router.get("/{plan_id}", response_model=RiskAnalysis)
def risk_analysis(plan_id: str) -> RiskAnalysis:
    return get_risk(plan_id)
