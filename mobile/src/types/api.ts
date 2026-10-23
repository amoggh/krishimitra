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
  effective_rainfall_dry_year_mm?: number;
  rainfall_basis?: string;
  groundwater_stage_pct?: number;
  groundwater_category?: "safe" | "semi_critical" | "critical" | "over_exploited";
  groundwater_pump_derate?: number;
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
  interval_method?: string;
  coverage_target?: number;
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

export interface CropValidation {
  is_ground_truth_verified: boolean;
  badge: string;
  historical_yield_median_t_ha?: number;
  historical_yield_range_str?: string;
  yield_deviation_pct?: number;
  yield_verdict?: string;
  yield_sources: string[];
  yield_samples_count: number;
  market_price_median_inr?: number;
  market_price_range_str?: string;
  price_deviation_pct?: number;
  price_verdict?: string;
  price_sources: string[];
  price_samples_count: number;
}

export interface PlanValidationSummary {
  datasets_checked: string[];
  total_datasets_count: number;
  all_crops_verified: boolean;
  verified_crops_count?: number;
  verdict: string;
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
  allocation_reason?: string;
  validation?: CropValidation;
  confidence?: string;
  confidence_score?: number;
  confidence_factors?: string[];
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
  confidence_score?: number;
  confidence_factors?: string[];
  why_this_plan?: string[];
  data_sources?: string[];
  validation_summary?: PlanValidationSummary;
  /** Plan totals; fallow_acres / water_limited are set when water caps the planted area */
  summary?: {
    fallow_acres?: number;
    water_limited?: boolean;
    [key: string]: unknown;
  };
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
