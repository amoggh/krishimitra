import { useEffect, useState } from "react";
import { getDistrictProfile, type DistrictProfile } from "@/constants/districtProfiles";

const STORAGE_KEY = "@krushimitra_active_district_v1";

let currentDistrict: string = "Mandya";
const listeners = new Set<(district: string) => void>();

function readPersistedDistrict(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && saved.trim()) {
        return saved.trim();
      }
    } catch {
      // Ignore
    }
  }
  return "Mandya";
}

function writePersistedDistrict(district: string) {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, district);
    } catch {
      // Ignore
    }
  }
}

// Initialize on module load
currentDistrict = readPersistedDistrict();

/**
 * Set the currently active district across the app.
 * Notifies all listeners (HomeScreen, FarmInput, Market, etc.)
 */
export function setActiveDistrict(district: string) {
  if (!district) return;
  const cleaned = district.trim();
  currentDistrict = cleaned;
  writePersistedDistrict(cleaned);

  listeners.forEach((listener) => {
    try {
      listener(cleaned);
    } catch (e) {
      console.warn("Location listener error:", e);
    }
  });
}

/**
 * Get the currently active district synchronously.
 */
export function getActiveDistrict(): string {
  return currentDistrict;
}

/**
 * React hook to subscribe to the active district and its agronomic/weather profile.
 */
export function useActiveDistrict() {
  const [district, setDistrictState] = useState<string>(() => currentDistrict);

  useEffect(() => {
    let mounted = true;
    const listener = (newDistrict: string) => {
      if (mounted) {
        setDistrictState(newDistrict);
      }
    };
    listeners.add(listener);

    return () => {
      mounted = false;
      listeners.delete(listener);
    };
  }, []);

  const profile: DistrictProfile = getDistrictProfile(district);

  return {
    district,
    profile,
    setDistrict: setActiveDistrict,
  };
}
