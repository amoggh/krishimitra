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
