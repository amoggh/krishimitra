import type { MandiPrice } from "@/types/api";
import { apiClient } from "./client";

export async function getMandiPrices(
  district?: string,
  crops?: string[] | string,
  search?: string
): Promise<MandiPrice[]> {
  const cropParam = Array.isArray(crops) ? crops.join(",") : crops;
  const { data } = await apiClient.get<MandiPrice[]>("/market/prices", {
    params: {
      district: district || undefined,
      crop: cropParam || undefined,
      search: search || undefined,
    },
  });
  return data;
}
