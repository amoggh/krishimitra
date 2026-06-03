import type { RiskAnalysis } from "@/types/api";
import { apiClient } from "./client";

export async function getRiskAnalysis(planId: string): Promise<RiskAnalysis> {
  const { data } = await apiClient.get<RiskAnalysis>(`/risk/${planId}`);
  return data;
}
