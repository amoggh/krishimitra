import type { MandiPrice } from "@/types/api";
import { apiClient } from "./client";

const priceCache = new Map<string, { timestamp: number; data: MandiPrice[] }>();
const inFlightRequests = new Map<string, Promise<MandiPrice[]>>();
const CACHE_TTL_MS = 60000; // 60-second cache to guarantee single-fetch behavior

export async function getMandiPrices(
  district?: string,
  crops?: string[] | string,
  search?: string
): Promise<MandiPrice[]> {
  const cropParam = Array.isArray(crops) ? crops.join(",") : crops;
  const cacheKey = `${district || "all"}__${cropParam || "all"}__${search || "none"}`;

  // Check TTL cache
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Deduplicate in-flight network requests
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const { data } = await apiClient.get<MandiPrice[]>("/market/prices", {
        params: {
          district: district || undefined,
          crop: cropParam || undefined,
          search: search || undefined,
        },
      });
      priceCache.set(cacheKey, { timestamp: Date.now(), data });
      return data;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}
