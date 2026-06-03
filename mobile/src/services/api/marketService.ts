import type { MandiPrice } from "@/types/api";
import { apiClient } from "./client";

export async function getMandiPrices(district?: string): Promise<MandiPrice[]> {
  const { data } = await apiClient.get<MandiPrice[]>("/market/prices", {
    params: { district },
  });
  return data;
}
