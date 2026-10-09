export interface FarmerProfile {
  id: string;
  name: string;
  phone: string;
  location: string;
  acres: number;
}

// ---- Crop Optimizer input — matches backend FarmerInput schema ----

export interface SoilInput {
  ph?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  texture?: string;
}

export interface FarmInputPayload {
  area_acres: number;
  district: string;
  pincode?: string;
  investment_inr: number;
  motor_hp: number;
  daily_electricity_hours: number;
  irrigation_type: "flood" | "furrow" | "sprinkler" | "drip";
  borewell_depth_ft?: number;
  season: string;
  soil?: SoilInput;
}

// ---- Crop Optimizer output — matches backend RecommendationResult schema ----

export interface WaterBudgetResult {
  estimated_daily_litres_low: number;
  estimated_daily_litres_mid: number;
  estimated_daily_litres_high: number;
  seasonal_pumped_mm_low: number;
  seasonal_pumped_mm_mid: number;
  seasonal_pumped_mm_high: number;
  effective_rainfall_mm: number;
  total_available_mm_mid: number;
  warnings: string[];
}

export interface YieldResult {
  crop: string;
  lower_t_per_ha?: number;
  expected_t_per_ha?: number;
  upper_t_per_ha?: number;
  unit: string;
  available: boolean;
  unavailable_reason?: string;
}

export interface PriceResult {
  crop: string;
  lower_inr_per_quintal?: number;
  expected_inr_per_quintal?: number;
  upper_inr_per_quintal?: number;
  unit: string;
  available: boolean;
  unavailable_reason?: string;
}

export interface RiskResultDetail {
  crop: string;
  expected_profit_inr?: number;
  profit_variance_inr?: number;
  profit_p10_inr?: number;
  profit_p90_inr?: number;
  yield_failure_probability?: number;
  price_crash_probability?: number;
  risk_adjusted_profit_inr?: number;
  available: boolean;
  unavailable_reason?: string;
}

export interface CropResult {
  crop: string;
  area_acres: number;
  area_hectares: number;
  percentage_of_total: number;
  yield_result?: YieldResult;
  price_result?: PriceResult;
  risk_result?: RiskResultDetail;
  expected_revenue_inr?: number;
  expected_cost_inr?: number;
  expected_net_profit_inr?: number;
  net_profit_lower_inr?: number;
  net_profit_upper_inr?: number;
  water_requirement_mm?: number;
  reasons: string[];
  warnings: string[];
}

export interface RejectedCrop {
  crop: string;
  reasons: string[];
}

export interface DataQualitySummary {
  soil_data_available: boolean;
  weather_data_available: boolean;
  mandi_data_available: boolean;
  yield_model_trained: boolean;
  price_model_trained: boolean;
  warnings: string[];
}

export interface RecommendationResult {
  location: string;
  season: string;
  total_land_acres: number;
  budget_inr: number;
  water_budget: WaterBudgetResult;
  recommendations: CropResult[];
  rejected_crops: RejectedCrop[];
  warnings: string[];
  data_quality: DataQualitySummary;
  status: string;
  message?: string;
  confidence?: string;
  confidence_explanation?: string;
  why_this_plan?: string[];
  data_sources?: string[];
}

// ---- Legacy/local-only shape for UI display helpers ----

/** Derived from CropResult for use in LandDivisionBar */
export interface LandDivisionItem {
  crop: string;
  acres: number;
  color: string;
}

export interface RiskAnalysis {
  overall_score: number;
  rainfall_risk_pct: number;
  price_volatility_pct: number;
  pest_risk: string;
  profit_distribution: { x: number; y: number }[];
}

export interface DiseasePrediction {
  crop: string | null;
  condition: string;
  class_name: string | null;
  is_healthy: boolean | null;
  confidence: number;
  status: "confident" | "uncertain";
}

export interface DiseaseAnalysisResult {
  success: boolean;
  prediction: DiseasePrediction;
}

export interface MandiPrice {
  crop: string;
  mandi: string;
  price_inr: number;
  change_pct: number;
  updated_at: string;
  trend_7d: number[];
}

export interface WeatherSummary {
  location: string;
  temp_c: number;
  condition: string;
  rain_chance_pct: number;
}

export interface DashboardSummary {
  farmer: FarmerProfile;
  weather: WeatherSummary;
  soil: { type: string; ph: number; npk: string };
  water_budget_litres_per_acre: number;
  active_recommendation?: RecommendationResult;
  market_trends: MandiPrice[];
}
