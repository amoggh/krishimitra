import { useEffect, useState } from "react";
import { setActiveDistrict, getActiveDistrict } from "./locationState";
import {
  getFarmsApi,
  createFarmApi,
  setDefaultFarmApi,
  updateFarmApi,
  deleteFarmApi,
  type FarmEntity,
  type AllocatedCropItem,
} from "./api/farmService";

export type { FarmEntity, AllocatedCropItem };

const FARMS_STORAGE_KEY = "@krushimitra_farmer_farms_v1";
const ACTIVE_FARM_STORAGE_KEY = "@krushimitra_active_farm_id_v1";

export const DEFAULT_FARMS: FarmEntity[] = [
  {
    id: "farm-shivamogga-main",
    name: "Shivamogga Green Valley",
    district: "Shivamogga",
    state: "Karnataka",
    acres: 10.0,
    soilType: "Red Sandy & Lateritic Loam",
    soil_type: "Red Sandy & Lateritic Loam",
    irrigationType: "Drip Irrigation",
    irrigation_type: "Drip Irrigation",
    isDefault: true,
    is_default: true,
    allocatedCrops: [
      { crop: "Arecanut", acres: 4.0, percentage: 40.0 },
      { crop: "Paddy", acres: 3.5, percentage: 35.0 },
      { crop: "Ginger", acres: 2.5, percentage: 25.0 },
    ],
    allocated_crops: [
      { crop: "Arecanut", acres: 4.0, percentage: 40.0 },
      { crop: "Paddy", acres: 3.5, percentage: 35.0 },
      { crop: "Ginger", acres: 2.5, percentage: 25.0 },
    ],
    activePlanId: "plan-shivamogga-2026",
    active_plan_id: "plan-shivamogga-2026",
  },
  {
    id: "farm-mandya-basin",
    name: "Mandya Cauvery Basin",
    district: "Mandya",
    state: "Karnataka",
    acres: 5.0,
    soilType: "Red Sandy Loam",
    soil_type: "Red Sandy Loam",
    irrigationType: "Canal Irrigation",
    irrigation_type: "Canal Irrigation",
    isDefault: false,
    is_default: false,
    allocatedCrops: [
      { crop: "Sugarcane", acres: 3.0, percentage: 60.0 },
      { crop: "Ragi", acres: 2.0, percentage: 40.0 },
    ],
    allocated_crops: [
      { crop: "Sugarcane", acres: 3.0, percentage: 60.0 },
      { crop: "Ragi", acres: 2.0, percentage: 40.0 },
    ],
    activePlanId: "plan-mandya-2026",
    active_plan_id: "plan-mandya-2026",
  },
  {
    id: "farm-belagavi-plains",
    name: "Belagavi Krishna Plains",
    district: "Belagavi",
    state: "Karnataka",
    acres: 8.0,
    soilType: "Deep Black Soil",
    soil_type: "Deep Black Soil",
    irrigationType: "Sprinkler Irrigation",
    irrigation_type: "Sprinkler Irrigation",
    isDefault: false,
    is_default: false,
    allocatedCrops: [
      { crop: "Cotton", acres: 4.5, percentage: 56.25 },
      { crop: "Soybean", acres: 3.5, percentage: 43.75 },
    ],
    allocated_crops: [
      { crop: "Cotton", acres: 4.5, percentage: 56.25 },
      { crop: "Soybean", acres: 3.5, percentage: 43.75 },
    ],
    activePlanId: "plan-belagavi-2026",
    active_plan_id: "plan-belagavi-2026",
  },
  {
    id: "farm-mysuru-estate",
    name: "Mysuru Chamundi Farms",
    district: "Mysuru",
    state: "Karnataka",
    acres: 4.5,
    soilType: "Red Loam",
    soil_type: "Red Loam",
    irrigationType: "Drip Irrigation",
    irrigation_type: "Drip Irrigation",
    isDefault: false,
    is_default: false,
    allocatedCrops: [
      { crop: "Maize", acres: 2.5, percentage: 55.5 },
      { crop: "Tobacco", acres: 2.0, percentage: 44.5 },
    ],
    allocated_crops: [
      { crop: "Maize", acres: 2.5, percentage: 55.5 },
      { crop: "Tobacco", acres: 2.0, percentage: 44.5 },
    ],
    activePlanId: "plan-mysuru-2026",
    active_plan_id: "plan-mysuru-2026",
  },
];

let inMemoryFarms: FarmEntity[] = [...DEFAULT_FARMS];
let inMemoryActiveFarmId: string = DEFAULT_FARMS[0].id;
const farmListeners = new Set<() => void>();

function notifyListeners() {
  farmListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn("Farm listener error:", e);
    }
  });
}

function readStorageFarms(): FarmEntity[] | null {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const data = window.localStorage.getItem(FARMS_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
  }
  return null;
}

function writeStorageFarms(farms: FarmEntity[]) {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(FARMS_STORAGE_KEY, JSON.stringify(farms));
    } catch {
      // Ignore
    }
  }
}

function readStorageActiveFarmId(): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      return window.localStorage.getItem(ACTIVE_FARM_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
  return null;
}

function writeStorageActiveFarmId(id: string) {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(ACTIVE_FARM_STORAGE_KEY, id);
    } catch {
      // Ignore
    }
  }
}

// Initialize on module load
const storedFarms = readStorageFarms();
if (storedFarms) {
  inMemoryFarms = storedFarms;
}

const storedActiveId = readStorageActiveFarmId();
if (storedActiveId && inMemoryFarms.some((f) => f.id === storedActiveId)) {
  inMemoryActiveFarmId = storedActiveId;
} else {
  const defaultFarm = inMemoryFarms.find((f) => f.isDefault || f.is_default);
  inMemoryActiveFarmId = defaultFarm ? defaultFarm.id : inMemoryFarms[0].id;
}

// Set active district matching initial farm
const initFarm = inMemoryFarms.find((f) => f.id === inMemoryActiveFarmId);
if (initFarm) {
  setActiveDistrict(initFarm.district);
}

/**
 * Returns all farms synchronously.
 */
export function getAllFarms(): FarmEntity[] {
  return inMemoryFarms;
}

/**
 * Returns the currently selected active farm.
 */
export function getActiveFarm(): FarmEntity {
  const found = inMemoryFarms.find((f) => f.id === inMemoryActiveFarmId);
  return found || inMemoryFarms[0];
}

/**
 * Returns the default farm for this profile.
 */
export function getDefaultFarm(): FarmEntity {
  const found = inMemoryFarms.find((f) => f.isDefault || f.is_default);
  return found || inMemoryFarms[0];
}

/**
 * Selects active farm.
 * Automatically switches active district across the app to update weather, mandi & recommendations!
 */
export function setActiveFarmId(farmId: string): FarmEntity {
  const target = inMemoryFarms.find((f) => f.id === farmId);
  if (!target) return getActiveFarm();

  inMemoryActiveFarmId = farmId;
  writeStorageActiveFarmId(farmId);

  // Sync active district across Krishimitra
  setActiveDistrict(target.district);

  notifyListeners();
  return target;
}

/**
 * Sets a farm as the Default Farm.
 */
export function setDefaultFarmId(farmId: string): FarmEntity {
  inMemoryFarms = inMemoryFarms.map((f) => {
    const isThis = f.id === farmId;
    return {
      ...f,
      isDefault: isThis,
      is_default: isThis,
    };
  });

  writeStorageFarms(inMemoryFarms);
  notifyListeners();

  // Background sync with API
  setDefaultFarmApi(farmId).catch(() => {});

  return getActiveFarm();
}

/**
 * Adds a new farm allocated to this profile.
 */
export function addFarm(newFarmData: {
  name: string;
  district: string;
  state?: string;
  acres: number;
  soilType?: string;
  irrigationType?: string;
  isDefault?: boolean;
}): FarmEntity {
  const farmId = `farm-${newFarmData.district.toLowerCase()}-${Date.now()}`;
  const isDef = Boolean(newFarmData.isDefault || inMemoryFarms.length === 0);

  if (isDef) {
    inMemoryFarms = inMemoryFarms.map((f) => ({ ...f, isDefault: false, is_default: false }));
  }

  const created: FarmEntity = {
    id: farmId,
    name: newFarmData.name.trim() || `${newFarmData.district} Farm`,
    district: newFarmData.district,
    state: newFarmData.state || "Karnataka",
    acres: Number(newFarmData.acres) || 5.0,
    soilType: newFarmData.soilType || "Red Sandy Loam",
    soil_type: newFarmData.soilType || "Red Sandy Loam",
    irrigationType: newFarmData.irrigationType || "Drip Irrigation",
    irrigation_type: newFarmData.irrigationType || "Drip Irrigation",
    isDefault: isDef,
    is_default: isDef,
    allocatedCrops: [],
    allocated_crops: [],
  };

  inMemoryFarms = [created, ...inMemoryFarms];
  writeStorageFarms(inMemoryFarms);

  // Switch to newly created farm
  setActiveFarmId(created.id);

  // Background sync with API
  createFarmApi(created).catch(() => {});

  return created;
}

/**
 * Saves crop optimization allocations to a specific farm.
 */
export function saveFarmAllocations(
  farmId: string,
  allocatedCrops: AllocatedCropItem[],
  activePlanId?: string
) {
  inMemoryFarms = inMemoryFarms.map((f) => {
    if (f.id === farmId) {
      return {
        ...f,
        allocatedCrops,
        allocated_crops: allocatedCrops,
        activePlanId: activePlanId || f.activePlanId,
        active_plan_id: activePlanId || f.active_plan_id,
      };
    }
    return f;
  });

  writeStorageFarms(inMemoryFarms);
  notifyListeners();

  // Background sync
  updateFarmApi(farmId, {
    allocated_crops: allocatedCrops,
    active_plan_id: activePlanId,
  }).catch(() => {});
}

/**
 * Saves mandi prices specific to this farm's district and crops.
 */
export function saveFarmMandiPrices(farmId: string, mandiPrices: any[]) {
  inMemoryFarms = inMemoryFarms.map((f) => {
    if (f.id === farmId) {
      return {
        ...f,
        savedMandiPrices: mandiPrices,
        saved_mandi_prices: mandiPrices,
      };
    }
    return f;
  });

  writeStorageFarms(inMemoryFarms);
  notifyListeners();

  updateFarmApi(farmId, { saved_mandi_prices: mandiPrices }).catch(() => {});
}

/**
 * Removes an allocated farm.
 */
export function deleteFarm(farmId: string): boolean {
  if (inMemoryFarms.length <= 1) {
    return false; // Preserve at least one farm
  }

  const deletingActive = inMemoryActiveFarmId === farmId;
  const deletingDefault = inMemoryFarms.find((f) => f.id === farmId)?.isDefault;

  inMemoryFarms = inMemoryFarms.filter((f) => f.id !== farmId);

  if (deletingDefault && inMemoryFarms.length > 0) {
    inMemoryFarms[0].isDefault = true;
    inMemoryFarms[0].is_default = true;
  }

  writeStorageFarms(inMemoryFarms);

  if (deletingActive && inMemoryFarms.length > 0) {
    setActiveFarmId(inMemoryFarms[0].id);
  } else {
    notifyListeners();
  }

  deleteFarmApi(farmId).catch(() => {});
  return true;
}

/**
 * React hook for consuming multi-farm state across screens.
 */
export function useFarms() {
  const [, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    const listener = () => {
      if (mounted) {
        setTick((t) => t + 1);
      }
    };
    farmListeners.add(listener);

    // Initial background sync with backend if online
    getFarmsApi()
      .then((backendFarms) => {
        if (mounted && backendFarms && backendFarms.length > 0) {
          // Merge with local state preserving default
          const currentLocal = readStorageFarms();
          if (!currentLocal) {
            inMemoryFarms = backendFarms.map((bf) => ({
              ...bf,
              soilType: bf.soil_type || bf.soilType || "Red Sandy Loam",
              irrigationType: bf.irrigation_type || bf.irrigationType || "Drip Irrigation",
              isDefault: bf.is_default ?? bf.isDefault ?? false,
              allocatedCrops: bf.allocated_crops || bf.allocatedCrops || [],
            }));
            writeStorageFarms(inMemoryFarms);
            notifyListeners();
          }
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
      farmListeners.delete(listener);
    };
  }, []);

  const farms = inMemoryFarms;
  const activeFarm = getActiveFarm();
  const defaultFarm = getDefaultFarm();

  return {
    farms,
    activeFarm,
    defaultFarm,
    setActiveFarm: setActiveFarmId,
    setDefaultFarm: setDefaultFarmId,
    addFarm,
    saveFarmAllocations,
    saveFarmMandiPrices,
    deleteFarm,
  };
}

