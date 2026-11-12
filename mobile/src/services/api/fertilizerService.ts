import { apiClient } from "./client";

export type StageRecommendation = {
  stage_name: string;
  timing_days: string;
  what_to_apply: string;
  farmer_instructions: string;
  estimated_cost_inr: number;
};

export type PesticideSpray = {
  disease: string;
  chemical_spray?: string;
  tank_mixing_dose?: string;
  organic_option?: string;
  field_sanitation?: string;
};

export type FertilizerRecommendation = {
  crop: string;
  district: string;
  soil_type: string;
  soil_ph: number;
  budget_tier: string;
  acres: number;
  total_estimated_cost_inr: number;
  cost_per_acre_inr: number;
  regional_soil_advisory: string;
  deficiencies: string[];
  stages: StageRecommendation[];
  pesticide_spray?: PesticideSpray | null;
  water_tip: string;
};

export type FertilizerRequest = {
  crop: string;
  district?: string;
  budget_tier?: "low" | "standard" | "high";
  acres?: number;
  disease?: string;
};

export async function fetchFertilizerRecommendation(
  params: FertilizerRequest
): Promise<FertilizerRecommendation> {
  const response = await apiClient.post<FertilizerRecommendation>(
    "/fertilizer/recommend",
    {
      crop: params.crop || "Ragi",
      district: params.district || "Mandya",
      budget_tier: params.budget_tier || "standard",
      acres: params.acres ?? 1.0,
      disease: params.disease,
    }
  );
  return response.data;
}
