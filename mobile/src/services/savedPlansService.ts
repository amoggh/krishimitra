import { useEffect, useState } from "react";
import { Share, Platform } from "react-native";
import type { RecommendationResult } from "@/types/api";
import { mockRecommendation } from "@/data/mockData";
import {
  deleteSavedPlanApi,
  getSavedPlansApi,
  savePlanApi,
} from "./api/farmService";
import { setActiveDistrict } from "./locationState";
import { getActiveFarm, saveFarmAllocations } from "./farmProfileService";

export interface SavedPlan {
  id: string;
  farmId?: string;
  title: string;
  subtitle: string;
  savedAt: string;
  formattedDate: string;
  district: string;
  season: string;
  totalAcres: number;
  budgetInr: number;
  cropsSummary: string;
  expectedProfitRange?: string;
  confidence?: string;
  waterAvailableMm?: number;
  result: RecommendationResult;
}

const STORAGE_KEY = "@krushimitra_saved_plans_v1";
const ACTIVE_PLAN_KEY = "@krushimitra_active_plan_id_v1";

const DEFAULT_SEEDED_PLANS: SavedPlan[] = [
  {
    id: "plan-kharif-2026-active",
    title: "Kharif 2026 — Active Plan",
    subtitle: "Mandya · 5.0 acres · ₹1,50,000",
    savedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    formattedDate: "Saved 2 days ago",
    district: "Mandya",
    season: "kharif",
    totalAcres: 5.0,
    budgetInr: 150000,
    cropsSummary: "Ragi (2.5 ac) + Maize (2.5 ac)",
    expectedProfitRange: "₹1.5L – ₹2.1L",
    confidence: "High",
    waterAvailableMm: 561,
    result: mockRecommendation,
  },
  {
    id: "plan-kharif-2026-alt",
    title: "Kharif 2026 — Low Risk Plan",
    subtitle: "Mandya · 5.0 acres · ₹1,00,000",
    savedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    formattedDate: "Saved 5 days ago",
    district: "Mandya",
    season: "kharif",
    totalAcres: 5.0,
    budgetInr: 100000,
    cropsSummary: "Ragi only (5.0 ac)",
    expectedProfitRange: "₹1.1L – ₹1.4L",
    confidence: "Medium",
    waterAvailableMm: 561,
    result: {
      ...mockRecommendation,
      budget_inr: 100000,
      recommendations: [
        {
          ...mockRecommendation.recommendations[0],
          crop: "ragi",
          area_acres: 5.0,
          percentage_of_total: 100,
        },
      ],
    },
  },
];

let inMemoryPlans: SavedPlan[] | null = null;
let inMemoryActivePlanId: string | null = null;
const listeners = new Set<() => void>();

function readActivePlanIdFromStorage(): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      return window.localStorage.getItem(ACTIVE_PLAN_KEY);
    } catch {
      // Ignore
    }
  }
  return null;
}

function writeActivePlanIdToStorage(id: string | null) {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      if (id) {
        window.localStorage.setItem(ACTIVE_PLAN_KEY, id);
      } else {
        window.localStorage.removeItem(ACTIVE_PLAN_KEY);
      }
    } catch {
      // Ignore
    }
  }
}

// Initialize active plan ID
inMemoryActivePlanId = readActivePlanIdFromStorage();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn("Listener error:", err);
    }
  });
}

function readFromLocalStorage(): SavedPlan[] | null {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const data = window.localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn("Could not read saved plans from localStorage:", e);
    }
  }
  return null;
}

function writeToLocalStorage(plans: SavedPlan[]) {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    } catch (e) {
      console.warn("Could not write saved plans to localStorage:", e);
    }
  }
}

export function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Saved just now";
    if (diffMins < 60) return `Saved ${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Saved ${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Saved yesterday";
    return `Saved ${diffDays} days ago`;
  } catch {
    return "Saved recently";
  }
}

/**
 * Extract summary statistics and titles from a RecommendationResult
 */
export function buildSavedPlanFromRecommendation(
  result: RecommendationResult,
  customTitle?: string
): SavedPlan {
  const seasonCap =
    result.season.charAt(0).toUpperCase() + result.season.slice(1);
  const cropsList = result.recommendations
    .map((c) => c.crop.charAt(0).toUpperCase() + c.crop.slice(1))
    .slice(0, 2)
    .join(" + ");

  const title =
    customTitle ??
    `${seasonCap} ${new Date().getFullYear()} — ${cropsList || "Optimized Plan"}`;

  const subtitle = `${result.location || "Karnataka"} · ${
    result.total_land_acres
  } acres · ₹${result.budget_inr.toLocaleString("en-IN")}`;

  const cropsSummary =
    result.recommendations
      .map(
        (c) =>
          `${c.crop.charAt(0).toUpperCase() + c.crop.slice(1)} (${c.area_acres.toFixed(1)} ac)`
      )
      .join(" + ") || "Custom crop division";

  // Calculate profit range
  const profitLower = result.recommendations
    .map((c) => c.net_profit_lower_inr ?? c.risk_result?.profit_p10_inr ?? null)
    .filter((v): v is number => v != null)
    .reduce((a, b) => a + b, 0);

  const profitUpper = result.recommendations
    .map((c) => c.net_profit_upper_inr ?? c.risk_result?.profit_p90_inr ?? null)
    .filter((v): v is number => v != null)
    .reduce((a, b) => a + b, 0);

  let expectedProfitRange: string | undefined;
  if (profitLower > 0 || profitUpper > 0) {
    expectedProfitRange = `₹${(profitLower / 100000).toFixed(1)}L – ₹${(
      profitUpper / 100000
    ).toFixed(1)}L`;
  }

  const now = new Date().toISOString();
  const rawLoc = result.location || "Mandya";
  const districtName = rawLoc.includes(",") ? rawLoc.split(",")[0].trim() : rawLoc.trim();

  return {
    id: `plan-${Date.now()}`,
    title,
    subtitle,
    savedAt: now,
    formattedDate: "Saved just now",
    district: districtName || "Mandya",
    season: result.season,
    totalAcres: result.total_land_acres,
    budgetInr: result.budget_inr,
    cropsSummary,
    expectedProfitRange,
    confidence: result.confidence,
    waterAvailableMm: result.water_budget?.total_available_mm_mid,
    result,
  };
}

/**
 * Format plan details into text for sharing across WhatsApp, SMS, or other apps
 */
export function formatPlanForSharing(plan: SavedPlan): string {
  const cropList = plan.result.recommendations
    .map(
      (c) =>
        `• ${c.crop.charAt(0).toUpperCase() + c.crop.slice(1)}: ${c.area_acres.toFixed(1)} acres (${c.percentage_of_total.toFixed(0)}%)`
    )
    .join("\n");

  const profitLine = plan.expectedProfitRange
    ? `\n💰 Estimated Net Profit: ${plan.expectedProfitRange}`
    : "";

  const waterLine = plan.waterAvailableMm
    ? `\n💧 Water Available: ${plan.waterAvailableMm.toFixed(0)} mm`
    : "";

  return (
    `🌾 KrushiMitra AI Farm Plan\n` +
    `📋 ${plan.title}\n` +
    `📍 Location: ${plan.district} | Season: ${plan.season.toUpperCase()}\n` +
    `🌱 Farm Size: ${plan.totalAcres} acres | Budget: ₹${plan.budgetInr.toLocaleString(
      "en-IN"
    )}\n` +
    `${waterLine}\n\n` +
    `Recommended Allocation:\n${cropList}${profitLine}\n\n` +
    `🎯 Optimized using NSGA-II Multi-Objective Engine\n` +
    `Generated with KrushiMitra`
  );
}

/**
 * Save a new plan to local storage, memory, and backend API.
 * Automatically marks this plan as the current active recommendation.
 */
export async function savePlan(
  result: RecommendationResult,
  customTitle?: string
): Promise<SavedPlan> {
  const newPlan = buildSavedPlanFromRecommendation(result, customTitle);

  // Initialize if null
  if (!inMemoryPlans) {
    inMemoryPlans = readFromLocalStorage() ?? [...DEFAULT_SEEDED_PLANS];
  }

  // Prepend to list
  inMemoryPlans = [newPlan, ...inMemoryPlans.filter((p) => p.id !== newPlan.id)];
  writeToLocalStorage(inMemoryPlans);

  // Mark as the current active recommendation
  inMemoryActivePlanId = newPlan.id;
  writeActivePlanIdToStorage(newPlan.id);

  // Also allocate crops to the currently active farm
  const activeF = getActiveFarm();
  if (activeF && result.recommendations && result.recommendations.length > 0) {
    const allocated = result.recommendations.map((r) => ({
      crop: r.crop.charAt(0).toUpperCase() + r.crop.slice(1),
      acres: r.area_acres,
      percentage: r.percentage_of_total,
    }));
    saveFarmAllocations(activeF.id, allocated, newPlan.id);
  }

  notifyListeners();
  setActiveDistrict(newPlan.district);

  // Sync with backend API in background
  try {
    await savePlanApi(newPlan);
  } catch (err) {
    // Non-fatal if offline
    console.log("Could not sync saved plan to backend API:", err);
  }

  return newPlan;
}

/**
 * Explicitly switch the current active plan
 */
export function setActivePlan(id: string) {
  inMemoryActivePlanId = id;
  writeActivePlanIdToStorage(id);
  if (inMemoryPlans) {
    const plan = inMemoryPlans.find((p) => p.id === id);
    if (plan) {
      setActiveDistrict(plan.district);
    }
  }
  notifyListeners();
}

/**
 * Get the currently active plan
 */
export function getActivePlan(): SavedPlan | null {
  if (!inMemoryPlans) {
    inMemoryPlans = readFromLocalStorage() ?? [...DEFAULT_SEEDED_PLANS];
  }
  if (!inMemoryActivePlanId) {
    inMemoryActivePlanId = readActivePlanIdFromStorage();
  }
  if (inMemoryActivePlanId && inMemoryPlans) {
    const found = inMemoryPlans.find((p) => p.id === inMemoryActivePlanId);
    if (found) return found;
  }
  return inMemoryPlans && inMemoryPlans.length > 0 ? inMemoryPlans[0] : null;
}

/**
 * Retrieve all saved plans
 */
export async function getSavedPlans(): Promise<SavedPlan[]> {
  if (inMemoryPlans) {
    return inMemoryPlans;
  }

  const local = readFromLocalStorage();
  if (local && local.length > 0) {
    inMemoryPlans = local;
    return inMemoryPlans;
  }

  // Try fetching from backend
  try {
    const remote = await getSavedPlansApi();
    if (remote && Array.isArray(remote) && remote.length > 0) {
      inMemoryPlans = remote as SavedPlan[];
      writeToLocalStorage(inMemoryPlans);
      return inMemoryPlans;
    }
  } catch {
    // Ignore backend fetch error
  }

  inMemoryPlans = [...DEFAULT_SEEDED_PLANS];
  writeToLocalStorage(inMemoryPlans);
  return inMemoryPlans;
}

/**
 * Delete a plan by ID
 */
export async function deleteSavedPlan(id: string): Promise<void> {
  if (!inMemoryPlans) {
    inMemoryPlans = readFromLocalStorage() ?? [...DEFAULT_SEEDED_PLANS];
  }

  inMemoryPlans = inMemoryPlans.filter((p) => p.id !== id);
  writeToLocalStorage(inMemoryPlans);
  notifyListeners();

  try {
    await deleteSavedPlanApi(id);
  } catch {
    // Non-fatal
  }
}

/**
 * Trigger native OS share sheet (WhatsApp, Messages, etc.)
 */
export async function sharePlan(plan: SavedPlan): Promise<void> {
  const message = formatPlanForSharing(plan);
  try {
    await Share.share(
      {
        title: plan.title,
        message,
      },
      {
        dialogTitle: `Share ${plan.title}`,
      }
    );
  } catch (err) {
    console.log("Share error or dismissed:", err);
  }
}

/**
 * React hook for components to subscribe to saved plans and active plan
 */
export function useSavedPlans() {
  const [plans, setPlans] = useState<SavedPlan[]>(() => inMemoryPlans ?? readFromLocalStorage() ?? DEFAULT_SEEDED_PLANS);
  const [activePlanId, setActivePlanIdState] = useState<string | null>(() => inMemoryActivePlanId ?? readActivePlanIdFromStorage());
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const loaded = await getSavedPlans();
        if (mounted) {
          setPlans([...loaded]);
          setActivePlanIdState(inMemoryActivePlanId ?? readActivePlanIdFromStorage());
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    const onUpdate = () => {
      if (mounted) {
        if (inMemoryPlans) {
          setPlans([...inMemoryPlans]);
        }
        setActivePlanIdState(inMemoryActivePlanId ?? readActivePlanIdFromStorage());
      }
    };

    listeners.add(onUpdate);
    return () => {
      mounted = false;
      listeners.delete(onUpdate);
    };
  }, []);

  const removePlan = async (id: string) => {
    await deleteSavedPlan(id);
  };

  const activePlan: SavedPlan | null =
    (activePlanId ? plans.find((p) => p.id === activePlanId) : null) ??
    (plans.length > 0 ? plans[0] : null);

  return {
    plans,
    activePlan,
    setActivePlan,
    loading,
    removePlan,
    sharePlan,
  };
}
