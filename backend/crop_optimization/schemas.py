"""
schemas.py — Pydantic models for the Crop Optimization module.

All inputs and outputs are typed and validated here.
Using Pydantic v2 (which matches the existing requirements.txt).
"""

from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

from crop_optimization.config import VALID_MOTOR_HP, SUPPORTED_SEASONS
from crop_optimization.normalization import normalize_district


# ---------------------------------------------------------------------------
# Input schemas
# ---------------------------------------------------------------------------


class SoilInput(BaseModel):
    """Optional soil information provided by the farmer or a soil test."""

    ph: Optional[float] = Field(None, ge=0.0, le=14.0, description="Soil pH (0–14)")
    nitrogen: Optional[float] = Field(None, ge=0.0, description="Available nitrogen (kg/ha)")
    phosphorus: Optional[float] = Field(None, ge=0.0, description="Available phosphorus (kg/ha)")
    potassium: Optional[float] = Field(None, ge=0.0, description="Available potassium (kg/ha)")
    texture: Optional[str] = Field(
        None,
        description="Soil texture/type e.g. 'loamy', 'clayey', 'sandy', 'red', 'black'"
    )


class FarmerInput(BaseModel):
    """
    All information provided by the farmer at recommendation time.

    Required fields: area_acres (or land_acres), district, investment_inr, motor_hp,
                     daily_electricity_hours (or electricity_hours_per_day),
                     irrigation_type, season.
    Optional fields: pincode, borewell_depth_ft, soil.
    """

    area_acres: float = Field(..., gt=0, description="Total land area in acres")
    district: str = Field(..., min_length=1, description="District name (e.g. 'Mysuru')")
    pincode: Optional[str] = Field(None, description="6-digit pincode (optional)")
    investment_inr: float = Field(..., ge=0, description="Total available budget in INR")
    motor_hp: float = Field(..., description="Pump motor horsepower")
    daily_electricity_hours: float = Field(
        ..., ge=0.0, le=24.0, description="Hours of electricity available per day"
    )
    irrigation_type: str = Field(
        ..., description="Irrigation method: flood | furrow | sprinkler | drip"
    )
    borewell_depth_ft: Optional[float] = Field(
        None, ge=0.0, description="Borewell depth in feet (optional)"
    )
    season: str = Field(..., description="Cropping season: kharif | rabi | zaid | summer")
    soil: Optional[SoilInput] = Field(None, description="Optional soil information")

    @model_validator(mode="before")
    @classmethod
    def remap_incoming_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Accept alternative field names from different client payloads
            if "land_acres" in data and "area_acres" not in data:
                data["area_acres"] = data["land_acres"]
            if "electricity_hours_per_day" in data and "daily_electricity_hours" not in data:
                data["daily_electricity_hours"] = data["electricity_hours_per_day"]
            if "budget_inr" in data and "investment_inr" not in data:
                data["investment_inr"] = data["budget_inr"]
        return data

    @field_validator("motor_hp")
    @classmethod
    def validate_motor_hp(cls, v: float) -> float:
        if v not in VALID_MOTOR_HP:
            raise ValueError(
                f"motor_hp must be one of {VALID_MOTOR_HP}. Got {v}."
            )
        return v

    @field_validator("irrigation_type")
    @classmethod
    def validate_irrigation_type(cls, v: str) -> str:
        allowed = {"flood", "furrow", "sprinkler", "drip"}
        v_lower = v.lower().strip()
        if v_lower not in allowed:
            raise ValueError(
                f"irrigation_type must be one of {sorted(allowed)}. Got '{v}'."
            )
        return v_lower

    @field_validator("season")
    @classmethod
    def validate_season(cls, v: str) -> str:
        v_lower = v.lower().strip()
        if v_lower not in SUPPORTED_SEASONS:
            raise ValueError(
                f"season must be one of {SUPPORTED_SEASONS}. Got '{v}'."
            )
        return v_lower

    @field_validator("district")
    @classmethod
    def clean_district(cls, v: str) -> str:
        canonical = normalize_district(v)
        return canonical if canonical else v.strip().title()

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v.isdigit() or len(v) != 6:
                raise ValueError("pincode must be a 6-digit number string.")
        return v


# ---------------------------------------------------------------------------
# Water budget output
# ---------------------------------------------------------------------------


class WaterBudgetResult(BaseModel):
    """Estimated water availability for the season."""

    estimated_daily_litres_low: float
    estimated_daily_litres_mid: float
    estimated_daily_litres_high: float
    seasonal_pumped_mm_low: float   # mm over the farmer's total area
    seasonal_pumped_mm_mid: float
    seasonal_pumped_mm_high: float
    effective_rainfall_mm: float                              # typical (median) year — plans sized on this
    effective_rainfall_dry_year_mm: Optional[float] = None    # 1-in-4 dry year (IMD P25) — risk warning
    rainfall_basis: Optional[str] = None                      # "imd_median" | "fallback"
    # District groundwater stress (CGWB GWRA 2023)
    groundwater_stage_pct: Optional[float] = None             # extraction as % of safe annual recharge
    groundwater_category: Optional[str] = None                # safe | semi_critical | critical | over_exploited
    groundwater_pump_derate: Optional[float] = None           # multiplier applied to borewell output
    total_available_mm_mid: float   # pumped_mid + effective_rainfall
    available_water_liters: Optional[float] = None
    available_water_m3: Optional[float] = None
    calculation_method: Optional[str] = None
    uncertainty_note: Optional[str] = None
    warnings: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Crop compatibility output
# ---------------------------------------------------------------------------


class CropCompatibilityResult(BaseModel):
    """Result of the agronomic compatibility check for one crop."""

    crop: str
    compatible: bool
    score: float = Field(..., ge=0.0, le=1.0, description="Compatibility score 0–1")
    failed_constraints: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Yield prediction output
# ---------------------------------------------------------------------------


class YieldResult(BaseModel):
    """Yield prediction with uncertainty bounds."""

    crop: str
    lower_t_per_ha: Optional[float] = None
    expected_t_per_ha: Optional[float] = None
    upper_t_per_ha: Optional[float] = None
    unit: str = "tonnes/hectare"
    source: Optional[str] = None
    confidence: Optional[str] = None
    available: bool = False
    unavailable_reason: Optional[str] = None
    # Set when lower/upper come from split conformal prediction
    interval_method: Optional[str] = None       # e.g. "split_conformal_crop"
    coverage_target: Optional[float] = None     # e.g. 0.8 → 80% interval


# ---------------------------------------------------------------------------
# Price prediction output
# ---------------------------------------------------------------------------


class PriceResult(BaseModel):
    """Harvest-time price estimate with uncertainty bounds."""

    crop: str
    lower_inr_per_quintal: Optional[float] = None
    expected_inr_per_quintal: Optional[float] = None
    upper_inr_per_quintal: Optional[float] = None
    unit: str = "INR/quintal"
    source: Optional[str] = None
    confidence: Optional[str] = None
    available: bool = False
    unavailable_reason: Optional[str] = None


# ---------------------------------------------------------------------------
# Risk output
# ---------------------------------------------------------------------------


class RiskResult(BaseModel):
    """Monte Carlo risk metrics for one crop."""

    crop: str
    expected_profit_inr: Optional[float] = None
    profit_variance_inr: Optional[float] = None
    profit_p10_inr: Optional[float] = None   # 10th percentile (downside)
    profit_p90_inr: Optional[float] = None   # 90th percentile (upside)
    yield_failure_probability: Optional[float] = None
    price_crash_probability: Optional[float] = None
    risk_adjusted_profit_inr: Optional[float] = None
    risk_confidence: Optional[str] = None
    available: bool = False
    unavailable_reason: Optional[str] = None


# ---------------------------------------------------------------------------
# Per-crop allocation (optimizer output)
# ---------------------------------------------------------------------------


class CropAllocation(BaseModel):
    """Area allocation recommended for one crop."""

    crop: str
    area_acres: float
    area_hectares: float
    percentage_of_total: float


# ---------------------------------------------------------------------------
# Ground-truth validation output (from validate_output.py)
# ---------------------------------------------------------------------------


class CropValidation(BaseModel):
    """Ground-truth dataset counter-check from validate_output.py."""

    is_ground_truth_verified: bool = False
    badge: str = "Not verified"
    historical_yield_median_t_ha: Optional[float] = None
    historical_yield_range_str: Optional[str] = None
    yield_deviation_pct: Optional[float] = None
    yield_verdict: Optional[str] = None
    yield_sources: list[str] = Field(default_factory=list)
    yield_samples_count: int = 0
    market_price_median_inr: Optional[float] = None
    market_price_range_str: Optional[str] = None
    price_deviation_pct: Optional[float] = None
    price_verdict: Optional[str] = None
    price_sources: list[str] = Field(default_factory=list)
    price_samples_count: int = 0


class PlanValidationSummary(BaseModel):
    """Overall multi-dataset validation summary."""

    datasets_checked: list[str] = Field(default_factory=list)
    total_datasets_count: int = 5
    all_crops_verified: bool = False
    verified_crops_count: int = 0
    verdict: str = "Not verified"


# ---------------------------------------------------------------------------
# Full per-crop recommendation result
# ---------------------------------------------------------------------------


class CropResult(BaseModel):
    """Complete recommendation details for a single crop."""

    crop: str
    area_acres: float
    area_hectares: float
    percentage_of_total: float

    yield_result: Optional[YieldResult] = None
    price_result: Optional[PriceResult] = None
    risk_result: Optional[RiskResult] = None

    # Economic summary (INR, per allocated area)
    expected_revenue_inr: Optional[float] = None
    expected_cost_inr: Optional[float] = None
    expected_net_profit_inr: Optional[float] = None
    net_profit_lower_inr: Optional[float] = None
    net_profit_upper_inr: Optional[float] = None

    water_requirement_mm: Optional[float] = None
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)

    # Plain-language explanation for farmers/evaluators
    allocation_reason: Optional[str] = None
    # Ground-truth validation against real historical CSVs
    validation: Optional[CropValidation] = None

    # Data-driven confidence (confidence/calibration.py)
    confidence: Optional[str] = None            # "High" | "Medium" | "Low"
    confidence_score: Optional[float] = None    # 0–1
    confidence_factors: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Rejected crop entry
# ---------------------------------------------------------------------------


class RejectedCrop(BaseModel):
    """A crop that was filtered out before optimization."""

    crop: str
    reasons: list[str]


# ---------------------------------------------------------------------------
# Data quality summary
# ---------------------------------------------------------------------------


class DataQualitySummary(BaseModel):
    """High-level summary of data completeness and staleness."""

    soil_data_available: bool = False
    weather_data_available: bool = False
    mandi_data_available: bool = False
    yield_model_trained: bool = False
    price_model_trained: bool = False
    warnings: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Final recommendation result
# ---------------------------------------------------------------------------


class RecommendationResult(BaseModel):
    """
    The complete output returned to the farmer (and to the API caller).
    """

    location: str
    season: str
    total_land_acres: float
    budget_inr: float

    water_budget: WaterBudgetResult

    recommendations: list[CropResult] = Field(default_factory=list)
    recommended_plan: list[CropResult] = Field(default_factory=list)
    rejected_crops: list[RejectedCrop] = Field(default_factory=list)

    summary: dict[str, Any] = Field(default_factory=dict)
    why_this_plan: list[str] = Field(default_factory=list)
    confidence: str = "Medium"
    confidence_explanation: Optional[str] = None
    confidence_score: Optional[float] = None    # 0–1
    confidence_factors: list[str] = Field(default_factory=list)
    data_sources: list[str] = Field(default_factory=list)

    warnings: list[str] = Field(default_factory=list)
    data_quality: DataQualitySummary = Field(default_factory=DataQualitySummary)

    # Multi-dataset ground-truth verification summary (from validate_output.py)
    validation_summary: Optional[PlanValidationSummary] = None

    # Overall status message
    status: str = "ok"
    message: Optional[str] = None

    @model_validator(mode="after")
    def sync_recommended_plan(self) -> "RecommendationResult":
        # Keep recommendations and recommended_plan in sync
        if self.recommendations and not self.recommended_plan:
            self.recommended_plan = list(self.recommendations)
        elif self.recommended_plan and not self.recommendations:
            self.recommendations = list(self.recommended_plan)
        return self


# ---------------------------------------------------------------------------
# Alias used by main.py / pipeline
# ---------------------------------------------------------------------------

OptimizationResult = RecommendationResult
