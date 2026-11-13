from fastapi import APIRouter

from app.models.schemas import AnalyzeJobResponse, FarmInput, RecommendationResult
from app.services.mock_engine import get_dashboard, get_recommendation

router = APIRouter(prefix="/farm", tags=["farm"])


@router.get("/dashboard")
def dashboard():
    return get_dashboard()


@router.post("/analyze", response_model=AnalyzeJobResponse)
def analyze_farm(body: FarmInput) -> AnalyzeJobResponse:
    return AnalyzeJobResponse(job_id="job-kharif-2026")


@router.get("/recommendations/{job_id}", response_model=RecommendationResult)
def recommendations(job_id: str) -> RecommendationResult:
    return get_recommendation(job_id)


_saved_plans: list[dict] = []


@router.get("/saved-plans")
def get_saved_plans() -> list[dict]:
    return _saved_plans


@router.post("/saved-plans")
def save_crop_plan(plan: dict) -> dict:
    global _saved_plans
    plan_id = plan.get("id")
    if plan_id:
        _saved_plans = [p for p in _saved_plans if p.get("id") != plan_id]
    _saved_plans.insert(0, plan)
    return plan


@router.delete("/saved-plans/{plan_id}")
def delete_saved_plan(plan_id: str) -> dict:
    global _saved_plans
    _saved_plans = [p for p in _saved_plans if p.get("id") != plan_id]
    return {"status": "ok", "deleted": plan_id}

