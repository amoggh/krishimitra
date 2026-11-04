from fastapi import APIRouter

from app.models.schemas import MandiPrice
from app.services.mock_engine import get_mandi_prices
from app.services.mandi_live_service import _PRICE_CACHE

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/prices", response_model=list[MandiPrice])
def mandi_prices(district: str | None = None) -> list[MandiPrice]:
    target_dist = (district or "Mandya").strip().lower()
    results: list[MandiPrice] = []

    for item in _PRICE_CACHE.values():
        if item.district.lower() == target_dist or not district:
            p = item.modal_price_rs_qtl
            spread = max(item.max_price_rs_qtl - item.min_price_rs_qtl, 0)
            change = round((spread / max(p, 1)) * 3.5, 1)
            results.append(
                MandiPrice(
                    crop=item.crop,
                    mandi=item.mandi,
                    price_inr=p,
                    change_pct=change,
                    updated_at=item.arrival_date or "Live (Today)",
                    trend_7d=[round(p * f, 0) for f in [0.96, 0.98, 0.97, 1.01, 0.99, 1.02, 1.0]],
                )
            )

    if results:
        return results
    return get_mandi_prices(district)
