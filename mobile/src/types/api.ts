export interface FarmerProfile {
  id: string;
  name: string;
  phone: string;
  location: string;
  acres: number;
}

export interface FarmInputPayload {
  area_acres: number;
  location: string;
  pincode?: string;
  investment_inr: number;
  motor_hp: number;
  electricity_hours: number;
  irrigation_type: "flood" | "sprinkler" | "drip";
  borewell_depth_ft?: number;
  latitude?: number;
  longitude?: number;
}

export interface CropRecommendation {
  crop: string;
  acres: number;
  input_tier: string;
  yield_quintals_per_acre: { low: number; high: number };
  price_per_quintal: { low: number; high: number };
  profit_inr: { low: number; high: number };
  water_usage_pct: number;
  risk_level: "low" | "medium" | "high";
}

export interface RecommendationResult {
  plan_id: string;
  season: string;
  profit_inr: { low: number; high: number };
  confidence_pct: number;
  land_division: { crop: string; acres: number; color: string }[];
  crops: CropRecommendation[];
  explanation: string;
}

export interface RiskAnalysis {
  overall_score: number;
  rainfall_risk_pct: number;
  price_volatility_pct: number;
  pest_risk: string;
  profit_distribution: { x: number; y: number }[];
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
