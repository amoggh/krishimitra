from fastapi import APIRouter

from app.models.schemas import MandiPrice
from app.services.mock_engine import get_mandi_prices

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/prices", response_model=list[MandiPrice])
def mandi_prices(district: str | None = None) -> list[MandiPrice]:
    return get_mandi_prices(district)
