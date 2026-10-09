import type {
  DashboardSummary,
  MandiPrice,
  RecommendationResult,
  RiskAnalysis,
} from "@/types/api";

// ---------------------------------------------------------------------------
// Demo farmer is based in Mandya, Karnataka
// ---------------------------------------------------------------------------

export const mockDashboard: DashboardSummary = {
  farmer: {
    id: "1",
    name: "Ravi Kumar",
    phone: "+919876543210",
    location: "Mandya, Karnataka",
    acres: 5.0,
  },
  weather: {
    location: "Mandya",
    temp_c: 30,
    condition: "Partly cloudy",
    rain_chance_pct: 45,
  },
  soil: { type: "Red Loam", ph: 6.5, npk: "moderate" },
  water_budget_litres_per_acre: 16500,
  active_recommendation: undefined,
  market_trends: [
    {
      crop: "Ragi",
      mandi: "Mandya APMC",
      price_inr: 3420,
      change_pct: 3.2,
      updated_at: "2h ago",
      trend_7d: [32, 33, 33, 34, 35, 34, 36],
    },
    {
      crop: "Sugarcane",
      mandi: "Mandya APMC",
      price_inr: 3100,
      change_pct: -1.2,
      updated_at: "2h ago",
      trend_7d: [32, 31, 31, 30, 30, 31, 31],
    },
  ],
};

// ---------------------------------------------------------------------------
// Mock recommendation — matches the backend RecommendationResult shape.
// Used as a fallback when the API is unavailable.
// NOTE: yield/price models are not trained yet, so those fields are null.
// ---------------------------------------------------------------------------

export const mockRecommendation: RecommendationResult = {
  location: "Mandya, Karnataka",
  season: "kharif",
  total_land_acres: 5.0,
  budget_inr: 150000,
  water_budget: {
    estimated_daily_litres_low: 13750,
    estimated_daily_litres_mid: 16500,
    estimated_daily_litres_high: 19250,
    seasonal_pumped_mm_low: 195.0,
    seasonal_pumped_mm_mid: 238.5,
    seasonal_pumped_mm_high: 281.0,
    effective_rainfall_mm: 322.0,
    total_available_mm_mid: 560.5,
    warnings: [
      "Borewell depth was not provided. Pump flow estimate uses a general approximation.",
    ],
  },
  recommendations: [
    {
      crop: "ragi",
      area_acres: 2.5,
      area_hectares: 1.01,
      percentage_of_total: 50.0,
      yield_result: {
        crop: "ragi",
        available: false,
        unit: "tonnes/hectare",
        unavailable_reason:
          "Yield model has not been trained. Add historical data to enable prediction.",
      },
      price_result: {
        crop: "ragi",
        available: false,
        unit: "INR/quintal",
        unavailable_reason:
          "Price prediction unavailable because mandi_prices.csv has not been provided.",
      },
      risk_result: {
        crop: "ragi",
        available: false,
        unavailable_reason: "Risk simulation requires yield and price predictions.",
      },
      water_requirement_mm: 350,
      reasons: [
        "Crop is suitable for 'kharif' season.",
        "Soil pH 6.5 is within optimal range [5.5–7.0].",
        "Water requirement (350 mm) fits within the available budget (560 mm).",
      ],
      warnings: [],
    },
    {
      crop: "maize",
      area_acres: 2.5,
      area_hectares: 1.01,
      percentage_of_total: 50.0,
      yield_result: {
        crop: "maize",
        available: false,
        unit: "tonnes/hectare",
        unavailable_reason:
          "Yield model has not been trained. Add historical data to enable prediction.",
      },
      price_result: {
        crop: "maize",
        available: false,
        unit: "INR/quintal",
        unavailable_reason:
          "Price prediction unavailable because mandi_prices.csv has not been provided.",
      },
      risk_result: {
        crop: "maize",
        available: false,
        unavailable_reason: "Risk simulation requires yield and price predictions.",
      },
      water_requirement_mm: 400,
      reasons: [
        "Crop is suitable for 'kharif' season.",
        "Water requirement (400 mm) fits within the available budget (560 mm).",
        "Soil texture 'Red Loam' matches preferred soil types.",
      ],
      warnings: [],
    },
  ],
  rejected_crops: [
    {
      crop: "sugarcane",
      reasons: [
        "Seasonal water requirement (1200 mm) exceeds estimated available water (560 mm). This crop is likely infeasible given the current water budget.",
      ],
    },
  ],
  warnings: [
    "Yield model has not been trained — economic estimates unavailable.",
    "mandi_prices.csv is missing — price predictions unavailable.",
    "Land allocation uses equal split (fallback) until ML models are trained.",
  ],
  data_quality: {
    soil_data_available: false,
    weather_data_available: false,
    mandi_data_available: false,
    yield_model_trained: false,
    price_model_trained: false,
    warnings: [],
  },
  status: "ok",
  message: undefined,
};

export const mockRisk: RiskAnalysis = {
  overall_score: 38,
  rainfall_risk_pct: 24,
  price_volatility_pct: 30,
  pest_risk: "low",
  profit_distribution: [
    { x: 0, y: 0.05 },
    { x: 1, y: 0.2 },
    { x: 2, y: 0.45 },
    { x: 3, y: 0.65 },
    { x: 4, y: 0.8 },
    { x: 5, y: 0.7 },
  ],
};

export const mockMandiPrices: MandiPrice[] = [
  {
    crop: "Ragi",
    mandi: "Mandya APMC",
    price_inr: 3420,
    change_pct: 3.2,
    updated_at: "2h ago",
    trend_7d: [32, 33, 33, 34, 35, 34, 36],
  },
  {
    crop: "Sugarcane",
    mandi: "Mandya APMC",
    price_inr: 3100,
    change_pct: -1.2,
    updated_at: "2h ago",
    trend_7d: [32, 31, 31, 30, 30, 31, 31],
  },
];
