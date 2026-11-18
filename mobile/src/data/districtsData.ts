import rawDistricts from "./districts.json";

export interface DistrictInfo {
  name?: string;
  zone: string;
  soil: string;
  ph: number;
  ec?: number;
  oc?: number;
  n: number;
  p: number;
  k: number;
  temp?: number;
  rh?: number;
  top_crops?: string[];
  crops?: string[];
  records?: number;
  annual?: number;
  annualRain?: number;
  monthly: number[];
  [key: string]: any;
}

export const DISTRICTS: Record<string, DistrictInfo> = (rawDistricts as unknown) as Record<string, DistrictInfo>;

export const DISTRICT_NAMES = Object.keys(DISTRICTS).sort();
