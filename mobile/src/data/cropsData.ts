import rawCrops from "./crops.json";

export interface CropWeekPlan {
  0: number; // week number
  1: string; // stage name
  2: string; // description
}

export interface CropInfo {
  id: string;
  name: string;
  kn: string;
  hue: string;
  seasons: string[];
  days: number;
  etc: number; // water needed in mm
  ph: [number, number];
  ky: number;
  minCover: number;
  good: string[];
  poor: string[];
  yield: [number, number, number]; // [low, mid, high] quintals/acre
  yVol: number;
  price: number; // INR/quintal
  pVol: number;
  msp?: number;
  cost: number; // INR/acre
  difficulty: number;
  labour: number;
  ds: string;
  blurb: string;
  beginner: string;
  seed: string;
  plan: [number, string, string][];
}

export const CROPS: CropInfo[] = rawCrops as CropInfo[];

export const CROP_BY_ID: Record<string, CropInfo> = Object.fromEntries(
  CROPS.map((c) => [c.id, c])
);

export const DATASET_NAME_TO_ID: Record<string, string | string[]> = {
  "Finger Millet": "ragi",
  Maize: "maize",
  Groundnut: "groundnut",
  Pulses: ["tur", "chickpea", "greengram"],
  Sorghum: "jowar",
  Rice: "paddy",
  Cotton: "cotton",
  Onion: "onion",
  Sugarcane: "sugarcane",
};
