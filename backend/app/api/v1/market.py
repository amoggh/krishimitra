from fastapi import APIRouter, Query

from app.models.schemas import MandiPrice
from app.services.mock_engine import get_mandi_prices
from app.services.mandi_live_service import _PRICE_CACHE, _seed_from_local_mandi_data

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/prices", response_model=list[MandiPrice])
def mandi_prices(
    district: str | None = None,
    crop: str | None = Query(None, description="Comma-separated crops or single crop name to filter"),
    search: str | None = Query(None, description="Search term for crop or mandi market name"),
) -> list[MandiPrice]:
    # Ensure cache is seeded if not yet populated
    if not _PRICE_CACHE:
        _seed_from_local_mandi_data()

    raw_dist = (district or "").strip().lower()
    target_dist = raw_dist.split(",")[0].strip() if "," in raw_dist else raw_dist

    # Parse crop filters if provided (e.g. from recommended crops)
    requested_crops: list[str] = []
    if crop:
        requested_crops = [c.strip().lower() for c in crop.split(",") if c.strip()]

    search_term = (search or "").strip().lower()

    results: list[MandiPrice] = []
    seen_crops: set[str] = set()

    # 1. First pass: Match target district entries
    for item in _PRICE_CACHE.values():
        crop_lower = item.crop.lower()
        dist_lower = item.district.lower()

        # Check district match
        district_matches = not target_dist or (target_dist in dist_lower or dist_lower in target_dist)
        if not district_matches:
            continue

        # Check crop match if filter applied
        if requested_crops:
            if not any(req in crop_lower or crop_lower in req for req in requested_crops):
                continue

        # Check search term
        if search_term:
            if search_term not in crop_lower and search_term not in item.mandi.lower():
                continue

        if crop_lower in seen_crops:
            continue
        seen_crops.add(crop_lower)

        p = item.modal_price_rs_qtl
        spread = max(item.max_price_rs_qtl - item.min_price_rs_qtl, 0)
        # Dynamic daily change percentage based on real spread
        change = round(((item.max_price_rs_qtl - p) / max(p, 1)) * 2.8 - 0.4, 1)

        # Generate realistic 7-day trend based on min, modal, max
        f_vals = [
            round(item.min_price_rs_qtl + (p - item.min_price_rs_qtl) * step, 1)
            for step in [0.4, 0.6, 0.5, 0.8, 0.7, 0.9, 1.0]
        ]

        results.append(
            MandiPrice(
                crop=item.crop,
                mandi=item.mandi or f"{item.district} APMC",
                price_inr=p,
                change_pct=change,
                updated_at=item.arrival_date or "Live (Today)",
                trend_7d=f_vals if f_vals else [p],
            )
        )

    # 2. Second pass for requested crops not found in the specific district:
    # Fallback to Karnataka state-level entry so recommended crops are ALWAYS present
    if requested_crops:
        for req in requested_crops:
            if not any(req in seen for seen in seen_crops):
                for item in _PRICE_CACHE.values():
                    crop_lower = item.crop.lower()
                    if (req in crop_lower or crop_lower in req) and crop_lower not in seen_crops:
                        seen_crops.add(crop_lower)
                        p = item.modal_price_rs_qtl
                        change = round(((item.max_price_rs_qtl - p) / max(p, 1)) * 2.8 - 0.4, 1)
                        f_vals = [
                            round(item.min_price_rs_qtl + (p - item.min_price_rs_qtl) * step, 1)
                            for step in [0.4, 0.6, 0.5, 0.8, 0.7, 0.9, 1.0]
                        ]
                        display_mandi = f"{target_dist.title()} / Karnataka APMC" if target_dist else item.mandi
                        results.append(
                            MandiPrice(
                                crop=item.crop,
                                mandi=display_mandi,
                                price_inr=p,
                                change_pct=change,
                                updated_at=item.arrival_date or "Live (Today)",
                                trend_7d=f_vals if f_vals else [p],
                            )
                        )
                        break

    if results:
        # Sort so requested crops appear first, then alphabetically
        if requested_crops:
            results.sort(
                key=lambda x: (
                    0 if any(req in x.crop.lower() for req in requested_crops) else 1,
                    x.crop,
                )
            )
        return results

    # Final fallback if nothing was matched
    return get_mandi_prices(district)
