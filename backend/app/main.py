import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.config import settings
from app.services.mandi_live_service import run_mandi_price_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start live Mandi prices background task (refreshing every 6 hours)
    scheduler_task = asyncio.create_task(run_mandi_price_scheduler(interval_hours=24))
    yield
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.v1.crop_optimizer import recommend as crop_recommend
from crop_optimization.schemas import FarmerInput, RecommendationResult

app.include_router(api_router, prefix=settings.api_prefix)

@app.post("/api/crop-optimization/optimize", response_model=RecommendationResult, tags=["Crop Optimizer"])
@app.post("/api/crop-optimization/recommend", response_model=RecommendationResult, tags=["Crop Optimizer"])
def crop_optimize_alias(farmer_input: FarmerInput) -> RecommendationResult:
    return crop_recommend(farmer_input)


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name}
