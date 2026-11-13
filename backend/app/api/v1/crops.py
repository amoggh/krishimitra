from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.mandi_live_service import get_current_mandi_price

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/crops", tags=["Crop Details"])


class CropSummary(BaseModel):
    crop: str
    season: str
    duration_days: int
    msp_inr_qtl: float
    current_mandi_price_qtl: Optional[float] = None
    water_req_category: str


class CropDetailResponse(BaseModel):
    crop: str
    scientific_name: str
    season: str
    duration_days: int
    soil_ph_range: tuple[float, float]
    soil_type: list[str]
    water_req_mm: float
    recommended_npk_ratio: str
    msp_inr_qtl: float
    live_mandi_price_qtl: Optional[float] = None
    min_mandi_price_qtl: Optional[float] = None
    max_mandi_price_qtl: Optional[float] = None
    mandi_source: str
    last_updated: Optional[str] = None
    common_diseases: list[str]
    sowing_window: str
    harvest_window: str
    description: str


CROP_CATALOG: dict[str, dict] = {
    "ragi": {
        "crop": "Ragi / Finger Millet",
        "scientific_name": "Eleusine coracana",
        "season": "Kharif",
        "duration_days": 110,
        "soil_ph_range": (5.5, 7.5),
        "soil_type": ["Red Sandy Loam", "Laterite", "Light Black Soil"],
        "water_req_mm": 350.0,
        "water_req_category": "Low",
        "recommended_npk_ratio": "50:40:25 kg/ha",
        "msp_inr_qtl": 3578.0,
        "common_diseases": ["Blast (Pyricularia grisea)", "Foot Rot", "Brown Spot"],
        "sowing_window": "July - August",
        "harvest_window": "October - November",
        "description": "Drought-hardy staple millet rich in calcium and dietary fiber, ideal for semi-arid zones.",
    },
    "maize": {
        "crop": "Maize",
        "scientific_name": "Zea mays",
        "season": "Kharif / Rabi",
        "duration_days": 105,
        "soil_ph_range": (5.8, 7.8),
        "soil_type": ["Deep Loam", "Well-drained Alluvial", "Black Soil"],
        "water_req_mm": 500.0,
        "water_req_category": "Medium",
        "recommended_npk_ratio": "120:60:40 kg/ha",
        "msp_inr_qtl": 2090.0,
        "common_diseases": ["Fall Armyworm", "Turcicum Leaf Blight", "Common Rust"],
        "sowing_window": "June - July (Kharif) / October (Rabi)",
        "harvest_window": "September - October / January - February",
        "description": "High-yield cereal widely used for food, livestock feed, and industrial starch.",
    },
    "groundnut": {
        "crop": "Groundnut",
        "scientific_name": "Arachis hypogaea",
        "season": "Kharif",
        "duration_days": 120,
        "soil_ph_range": (6.0, 7.2),
        "soil_type": ["Sandy Loam", "Red Soil with Good Drainage"],
        "water_req_mm": 450.0,
        "water_req_category": "Medium",
        "recommended_npk_ratio": "25:50:25 kg/ha + Gypsum",
        "msp_inr_qtl": 6377.0,
        "common_diseases": ["Tikka Leaf Spot", "Collar Rot", "Rust"],
        "sowing_window": "June - July",
        "harvest_window": "October - November",
        "description": "Major oilseed and legume crop fixing soil nitrogen while commanding strong market demand.",
    },
    "jowar": {
        "crop": "Jowar / Sorghum",
        "scientific_name": "Sorghum bicolor",
        "season": "Kharif / Rabi",
        "duration_days": 115,
        "soil_ph_range": (6.0, 8.5),
        "soil_type": ["Clay Loam", "Black Cotton Soil"],
        "water_req_mm": 400.0,
        "water_req_category": "Low-Medium",
        "recommended_npk_ratio": "80:40:40 kg/ha",
        "msp_inr_qtl": 3180.0,
        "common_diseases": ["Grain Mold", "Downy Mildew", "Shoot Fly"],
        "sowing_window": "June - July / September - October",
        "harvest_window": "October / January",
        "description": "Resilient dryland millet valued for grain and green fodder.",
    },
    "rice": {
        "crop": "Rice / Paddy",
        "scientific_name": "Oryza sativa",
        "season": "Kharif",
        "duration_days": 135,
        "soil_ph_range": (5.0, 7.0),
        "soil_type": ["Clayey Loam", "Silty Clay with Water Retention"],
        "water_req_mm": 1100.0,
        "water_req_category": "High",
        "recommended_npk_ratio": "100:50:50 kg/ha",
        "msp_inr_qtl": 2203.0,
        "common_diseases": ["Bacterial Leaf Blight", "Sheath Blight", "Blast"],
        "sowing_window": "June - July",
        "harvest_window": "November - December",
        "description": "Water-intensive staple crop suitable for canal and borewell irrigated belts.",
    },
    "bengalgram": {
        "crop": "Bengalgram / Chickpea",
        "scientific_name": "Cicer arietinum",
        "season": "Rabi",
        "duration_days": 95,
        "soil_ph_range": (6.0, 7.8),
        "soil_type": ["Deep Black Soils", "Clay Loam"],
        "water_req_mm": 250.0,
        "water_req_category": "Low",
        "recommended_npk_ratio": "20:50:0 kg/ha",
        "msp_inr_qtl": 5440.0,
        "common_diseases": ["Fusarium Wilt", "Dry Root Rot", "Ascochyta Blight"],
        "sowing_window": "October - November",
        "harvest_window": "January - February",
        "description": "High-protein winter pulse demanding residual moisture and low irrigation.",
    },
    "tur": {
        "crop": "Tur / Pigeonpea",
        "scientific_name": "Cajanus cajan",
        "season": "Kharif",
        "duration_days": 160,
        "soil_ph_range": (6.5, 7.5),
        "soil_type": ["Deep Loamy", "Black Cotton Soil"],
        "water_req_mm": 550.0,
        "water_req_category": "Medium",
        "recommended_npk_ratio": "25:50:0 kg/ha",
        "msp_inr_qtl": 7000.0,
        "common_diseases": ["Sterility Mosaic", "Wilt", "Pod Borer"],
        "sowing_window": "June - July",
        "harvest_window": "December - January",
        "description": "Long-duration essential pulse intercropped with cereals, revitalizing soil health.",
    },
    "cotton": {
        "crop": "Cotton",
        "scientific_name": "Gossypium hirsutum",
        "season": "Kharif",
        "duration_days": 165,
        "soil_ph_range": (6.0, 8.0),
        "soil_type": ["Deep Black Cotton Soil", "Medium Black"],
        "water_req_mm": 650.0,
        "water_req_category": "Medium-High",
        "recommended_npk_ratio": "100:50:50 kg/ha",
        "msp_inr_qtl": 6620.0,
        "common_diseases": ["Bacterial Blight", "Bollworm", "Leaf Curl"],
        "sowing_window": "May - June",
        "harvest_window": "November - January",
        "description": "Premier cash fiber crop requiring well-drained soils and steady nutrient management.",
    },
    "tomato": {
        "crop": "Tomato",
        "scientific_name": "Solanum lycopersicum",
        "season": "Kharif / Rabi",
        "duration_days": 90,
        "soil_ph_range": (6.0, 7.0),
        "soil_type": ["Well Drained Sandy Loam", "Rich Loam"],
        "water_req_mm": 500.0,
        "water_req_category": "Medium",
        "recommended_npk_ratio": "150:100:100 kg/ha",
        "msp_inr_qtl": 2400.0,
        "common_diseases": ["Early Blight", "Late Blight", "Leaf Curl Virus", "Bacterial Wilt"],
        "sowing_window": "June - July / October - November",
        "harvest_window": "September - October / January - March",
        "description": "High-value commercial horticultural crop with high yield potential and market volatility.",
    },
    "onion": {
        "crop": "Onion",
        "scientific_name": "Allium cepa",
        "season": "Kharif / Late Kharif / Rabi",
        "duration_days": 120,
        "soil_ph_range": (6.0, 7.5),
        "soil_type": ["Friable Sandy Loam", "Alluvial Soil"],
        "water_req_mm": 450.0,
        "water_req_category": "Medium",
        "recommended_npk_ratio": "100:50:50 kg/ha + Sulphur",
        "msp_inr_qtl": 2100.0,
        "common_diseases": ["Purple Blotch", "Stemphylium Leaf Blight", "Thrips"],
        "sowing_window": "June - July / September - October",
        "harvest_window": "October - November / February - March",
        "description": "Major bulb vegetable grown extensively across Karnataka with seasonal price elasticity.",
    },
}


def _resolve_catalog_key(name: str) -> Optional[str]:
    clean = name.strip().lower()
    for key in CROP_CATALOG:
        if key in clean or clean in key:
            return key
    return None


@router.get("", response_model=list[CropSummary])
def list_crops(district: str = Query("Mandya", description="District for live Mandi pricing")) -> list[CropSummary]:
    """List all supported crops with high-level summaries and current prices."""
    results: list[CropSummary] = []
    for key, data in CROP_CATALOG.items():
        live_price = get_current_mandi_price(data["crop"], district)
        results.append(
            CropSummary(
                crop=data["crop"],
                season=data["season"],
                duration_days=data["duration_days"],
                msp_inr_qtl=data["msp_inr_qtl"],
                current_mandi_price_qtl=live_price.modal_price_rs_qtl if live_price else data["msp_inr_qtl"],
                water_req_category=data.get("water_req_category", "Medium"),
            )
        )
    return results


@router.get("/{crop_name}", response_model=CropDetailResponse)
def get_crop_details(
    crop_name: str,
    district: str = Query("Mandya", description="District for localized Mandi rates"),
) -> CropDetailResponse:
    """
    Get in-depth agronomic profile, soil/water needs, fertilizer recommendations,
    and live Mandi price per quintal for a specific crop.
    """
    cat_key = _resolve_catalog_key(crop_name)
    if not cat_key:
        raise HTTPException(
            status_code=404,
            detail=f"Crop '{crop_name}' not found. Available crops: {', '.join(CROP_CATALOG.keys())}",
        )

    info = dict(CROP_CATALOG[cat_key])
    live_price = get_current_mandi_price(info["crop"], district)

    if live_price:
        info["live_mandi_price_qtl"] = live_price.modal_price_rs_qtl
        info["min_mandi_price_qtl"] = live_price.min_price_rs_qtl
        info["max_mandi_price_qtl"] = live_price.max_price_rs_qtl
        info["mandi_source"] = f"{live_price.mandi} APMC ({live_price.source})"
        info["last_updated"] = live_price.last_fetched_at.strftime("%Y-%m-%d %H:%M UTC")
    else:
        info["live_mandi_price_qtl"] = info["msp_inr_qtl"]
        info["min_mandi_price_qtl"] = round(info["msp_inr_qtl"] * 0.95, 1)
        info["max_mandi_price_qtl"] = round(info["msp_inr_qtl"] * 1.10, 1)
        info["mandi_source"] = "Karnataka MSP Benchmark (Live Mandi data updating)"
        info["last_updated"] = None

    return CropDetailResponse(**info)
