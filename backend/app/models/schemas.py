from pydantic import BaseModel, Field


class OtpRequest(BaseModel):
    phone: str


class OtpVerify(BaseModel):
    phone: str
    otp: str


class TokenResponse(BaseModel):
    access_token: str
    farmer_id: str


class FarmInput(BaseModel):
    area_acres: float = Field(gt=0)
    location: str
    pincode: str | None = None
    investment_inr: int = Field(gt=0)
    motor_hp: float
    electricity_hours: int = Field(ge=1, le=24)
    irrigation_type: str
    borewell_depth_ft: int | None = None
    latitude: float | None = None
    longitude: float | None = None


class AnalyzeJobResponse(BaseModel):
    job_id: str


class ProfitRange(BaseModel):
    low: float
    high: float


class LandDivision(BaseModel):
    crop: str
    acres: float
    color: str


class CropRecommendation(BaseModel):
    crop: str
    acres: float
    input_tier: str
    yield_quintals_per_acre: ProfitRange
    price_per_quintal: ProfitRange
    profit_inr: ProfitRange
    water_usage_pct: float
    risk_level: str


class RecommendationResult(BaseModel):
    plan_id: str
    season: str
    profit_inr: ProfitRange
    confidence_pct: float
    land_division: list[LandDivision]
    crops: list[CropRecommendation]
    explanation: str


class RiskAnalysis(BaseModel):
    overall_score: int
    rainfall_risk_pct: float
    price_volatility_pct: float
    pest_risk: str
    profit_distribution: list[dict[str, float]]


class MandiPrice(BaseModel):
    crop: str
    mandi: str
    price_inr: float
    change_pct: float
    updated_at: str
    trend_7d: list[float]
