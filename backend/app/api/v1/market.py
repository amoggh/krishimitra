from fastapi import APIRouter

from app.models.schemas import MandiPrice
from app.services.mock_engine import get_mandi_prices

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/prices", response_model=list[MandiPrice])
def mandi_prices(district: str | None = None) -> list[MandiPrice]:
    return get_mandi_prices(district)


@router.get("/volatility")
def mandi_volatility(crop: str, expected_price: float | None = None) -> dict:
    """
    Price volatility (7/30-day PVI) and alerts for a crop from the daily Agmarknet history.

    Alerts: price below 80% of `expected_price` (e.g. the plan's expected harvest price),
    or a 90-day high. Returns available=false until history has been collected.
    """
    from crop_optimization.data_pipeline.live_mandi import get_store, price_alerts, volatility_report
    from crop_optimization.normalization import normalize_crop

    canonical = normalize_crop(crop) or crop
    store = get_store()
    if store is None:
        return {"crop": canonical, "available": False,
                "reason": "No mandi history yet. Run: python -m crop_optimization.data_pipeline.live_mandi fetch"}
    return {
        **volatility_report(store, canonical),
        "alerts": price_alerts(store, canonical, expected_price),
        "available": True,
    }
