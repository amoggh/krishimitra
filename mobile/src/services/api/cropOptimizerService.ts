import type { FarmInputPayload, RecommendationResult } from "@/types/api";
import { apiClient } from "./client";

/**
 * Call the Crop Optimization endpoint directly.
 * POST /crop-optimizer/recommend
 *
 * The backend returns a full RecommendationResult immediately —
 * no job-id polling required.
 */
export async function getCropRecommendation(
  payload: FarmInputPayload
): Promise<RecommendationResult> {
  const { data } = await apiClient.post<RecommendationResult>(
    "/crop-optimizer/recommend",
    payload
  );
  return data;
}
