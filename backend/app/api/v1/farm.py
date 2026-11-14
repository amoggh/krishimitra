from typing import Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models.schemas import AnalyzeJobResponse, FarmInput, RecommendationResult
from app.services.mock_engine import get_dashboard, get_recommendation

router = APIRouter(prefix="/farm", tags=["farm"])


class AllocatedCrop(BaseModel):
    crop: str
    acres: float
    percentage: float


class FarmEntitySchema(BaseModel):
    id: str
    name: str
    district: str
    state: str = "Karnataka"
    acres: float
    soil_type: str = "Red Sandy Loam"
    irrigation_type: Optional[str] = "Drip Irrigation"
    is_default: bool = False
    allocated_crops: list[AllocatedCrop] = Field(default_factory=list)
    saved_mandi_prices: Optional[list[dict[str, Any]]] = None
    active_plan_id: Optional[str] = None


class CreateFarmPayload(BaseModel):
    name: str
    district: str
    state: str = "Karnataka"
    acres: float
    soil_type: Optional[str] = "Red Sandy Loam"
    irrigation_type: Optional[str] = "Drip Irrigation"
    is_default: Optional[bool] = False
    allocated_crops: Optional[list[AllocatedCrop]] = None


# Initial seeded farms showcasing multi-district allocation
_farms: list[dict[str, Any]] = [
    {
        "id": "farm-shivamogga-main",
        "name": "Shivamogga Green Valley",
        "district": "Shivamogga",
        "state": "Karnataka",
        "acres": 10.0,
        "soil_type": "Red Sandy & Lateritic Loam",
        "irrigation_type": "Drip Irrigation",
        "is_default": True,
        "allocated_crops": [
            {"crop": "Arecanut", "acres": 4.0, "percentage": 40.0},
            {"crop": "Paddy", "acres": 3.5, "percentage": 35.0},
            {"crop": "Ginger", "acres": 2.5, "percentage": 25.0},
        ],
        "active_plan_id": "plan-shivamogga-active",
    },
    {
        "id": "farm-mandya-basin",
        "name": "Mandya Cauvery Basin",
        "district": "Mandya",
        "state": "Karnataka",
        "acres": 5.0,
        "soil_type": "Red Sandy Loam",
        "irrigation_type": "Canal Irrigation",
        "is_default": False,
        "allocated_crops": [
            {"crop": "Sugarcane", "acres": 3.0, "percentage": 60.0},
            {"crop": "Ragi", "acres": 2.0, "percentage": 40.0},
        ],
        "active_plan_id": "plan-mandya-active",
    },
    {
        "id": "farm-belagavi-plains",
        "name": "Belagavi Krishna Plains",
        "district": "Belagavi",
        "state": "Karnataka",
        "acres": 8.0,
        "soil_type": "Deep Black Soil",
        "irrigation_type": "Sprinkler Irrigation",
        "is_default": False,
        "allocated_crops": [
            {"crop": "Cotton", "acres": 4.5, "percentage": 56.25},
            {"crop": "Soybean", "acres": 3.5, "percentage": 43.75},
        ],
        "active_plan_id": "plan-belagavi-active",
    },
    {
        "id": "farm-mysuru-estate",
        "name": "Mysuru Chamundi Farms",
        "district": "Mysuru",
        "state": "Karnataka",
        "acres": 4.5,
        "soil_type": "Red Loam",
        "irrigation_type": "Drip Irrigation",
        "is_default": False,
        "allocated_crops": [
            {"crop": "Maize", "acres": 2.5, "percentage": 55.5},
            {"crop": "Tobacco", "acres": 2.0, "percentage": 44.5},
        ],
        "active_plan_id": "plan-mysuru-active",
    },
]


@router.get("/farms", response_model=list[FarmEntitySchema])
def get_all_farms():
    """Returns all allocated farms for this farmer profile."""
    return _farms


@router.post("/farms", response_model=FarmEntitySchema)
def create_farm(payload: CreateFarmPayload):
    """Creates a new farm allocated to this profile."""
    import time
    farm_id = f"farm-{payload.district.lower()}-{int(time.time())}"
    
    # If set as default, remove default from others
    if payload.is_default:
        for f in _farms:
            f["is_default"] = False
            
    new_farm = {
        "id": farm_id,
        "name": payload.name,
        "district": payload.district,
        "state": payload.state,
        "acres": payload.acres,
        "soil_type": payload.soil_type or "Red Sandy Loam",
        "irrigation_type": payload.irrigation_type or "Drip Irrigation",
        "is_default": bool(payload.is_default or len(_farms) == 0),
        "allocated_crops": [c.model_dump() for c in payload.allocated_crops] if payload.allocated_crops else [],
        "saved_mandi_prices": None,
        "active_plan_id": None,
    }
    _farms.append(new_farm)
    return new_farm


@router.put("/farms/{farm_id}/default", response_model=FarmEntitySchema)
def set_default_farm(farm_id: str):
    """Marks a specific farm as the default farm."""
    found = None
    for f in _farms:
        if f["id"] == farm_id:
            f["is_default"] = True
            found = f
        else:
            f["is_default"] = False
            
    if not found:
        raise HTTPException(status_code=404, detail=f"Farm {farm_id} not found")
    return found


@router.put("/farms/{farm_id}", response_model=FarmEntitySchema)
def update_farm(farm_id: str, updates: dict[str, Any]):
    """Updates specific farm metadata, crop allocations, or saved mandi data."""
    for f in _farms:
        if f["id"] == farm_id:
            for k, v in updates.items():
                if k != "id":
                    f[k] = v
            return f
    raise HTTPException(status_code=404, detail=f"Farm {farm_id} not found")


@router.delete("/farms/{farm_id}")
def delete_farm(farm_id: str):
    """Deletes an allocated farm."""
    global _farms
    _farms = [f for f in _farms if f["id"] != farm_id]
    # Ensure at least one default farm remains
    if _farms and not any(f.get("is_default") for f in _farms):
        _farms[0]["is_default"] = True
    return {"status": "ok", "deleted": farm_id}


@router.get("/dashboard")
def dashboard():
    base = get_dashboard()
    if "farmer" in base:
        base["farmer"]["name"] = "Ravi Kumar"
    default_farm = next((f for f in _farms if f.get("is_default")), _farms[0] if _farms else None)
    if default_farm:
        base["farmer"]["location"] = f"{default_farm['district']}, {default_farm.get('state', 'Karnataka')}"
        base["farmer"]["acres"] = default_farm["acres"]
        base["active_farm"] = default_farm
    base["farms"] = _farms
    return base


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
    
    # Also save to the corresponding farm if farm_id is present
    farm_id = plan.get("farm_id")
    if farm_id:
        for f in _farms:
            if f["id"] == farm_id:
                f["active_plan_id"] = plan_id
                # Map recommendations to allocated crops
                recs = plan.get("result", {}).get("recommendations", [])
                if recs:
                    f["allocated_crops"] = [
                        {
                            "crop": r.get("crop", "Crop").capitalize(),
                            "acres": r.get("area_acres", 1.0),
                            "percentage": r.get("percentage_of_total", 0.0),
                        }
                        for r in recs
                    ]
                break
                
    return plan


@router.delete("/saved-plans/{plan_id}")
def delete_saved_plan(plan_id: str) -> dict:
    global _saved_plans
    _saved_plans = [p for p in _saved_plans if p.get("id") != plan_id]
    return {"status": "ok", "deleted": plan_id}
