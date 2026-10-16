import type { DashboardSummary, FarmInputPayload, RecommendationResult } from "@/types/api";
import { apiClient } from "./client";

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

