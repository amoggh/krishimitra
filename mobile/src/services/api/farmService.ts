import type { DashboardSummary, FarmInputPayload, RecommendationResult } from "@/types/api";
import { apiClient } from "./client";

export interface AllocatedCropItem {
  crop: string;
  acres: number;
  percentage: number;
}

export interface FarmEntity {
  id: string;
  name: string;
  district: string;
  state: string;
  acres: number;
  soil_type?: string;
  soilType?: string;
  irrigation_type?: string;
  irrigationType?: string;
  is_default?: boolean;
  isDefault?: boolean;
  allocated_crops?: AllocatedCropItem[];
  allocatedCrops?: AllocatedCropItem[];
  active_plan_id?: string;
  activePlanId?: string;
  saved_mandi_prices?: any[];
  savedMandiPrices?: any[];
}

export async function getDashboard(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>("/farm/dashboard");
  return data;
}

export async function submitFarmInput(
  payload: FarmInputPayload
): Promise<{ job_id: string }> {
  const { data } = await apiClient.post("/farm/analyze", payload);
  return data;
}

export async function getRecommendation(
  jobId: string
): Promise<RecommendationResult> {
  const { data } = await apiClient.get<RecommendationResult>(
    `/farm/recommendations/${jobId}`
  );
  return data;
}

export async function getSavedPlansApi(): Promise<any[]> {
  const { data } = await apiClient.get<any[]>("/farm/saved-plans");
  return data;
}

export async function savePlanApi(plan: any): Promise<any> {
  const { data } = await apiClient.post<any>("/farm/saved-plans", plan);
  return data;
}

export async function deleteSavedPlanApi(planId: string): Promise<boolean> {
  await apiClient.delete(`/farm/saved-plans/${planId}`);
  return true;
}

// ── Multi-Farm API Endpoints ──

export async function getFarmsApi(): Promise<FarmEntity[]> {
  const { data } = await apiClient.get<FarmEntity[]>("/farm/farms");
  return data;
}

export async function createFarmApi(payload: Partial<FarmEntity>): Promise<FarmEntity> {
  const { data } = await apiClient.post<FarmEntity>("/farm/farms", payload);
  return data;
}

export async function setDefaultFarmApi(farmId: string): Promise<FarmEntity> {
  const { data } = await apiClient.put<FarmEntity>(`/farm/farms/${farmId}/default`);
  return data;
}

export async function updateFarmApi(farmId: string, updates: Partial<FarmEntity>): Promise<FarmEntity> {
  const { data } = await apiClient.put<FarmEntity>(`/farm/farms/${farmId}`, updates);
  return data;
}

export async function deleteFarmApi(farmId: string): Promise<boolean> {
  await apiClient.delete(`/farm/farms/${farmId}`);
  return true;
}
