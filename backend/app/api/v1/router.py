from fastapi import APIRouter

from app.api.v1 import auth, crop_optimizer, disease, farm, market, risk

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(farm.router)
api_router.include_router(market.router)
api_router.include_router(risk.router)
api_router.include_router(disease.router)
api_router.include_router(crop_optimizer.router)
