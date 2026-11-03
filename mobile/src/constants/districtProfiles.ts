import type { SoilSummary, WeatherSummary } from "@/types/api";

export interface DistrictProfile {
  district: string;
  location: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  soil: SoilSummary;
  weather: WeatherSummary;
  water_budget_litres_per_acre: number;
  primary_crops: string[];
}

export const DISTRICT_PROFILES: Record<string, DistrictProfile> = {
  Mandya: {
    district: "Mandya",
    location: "Mandya, Karnataka",
    coordinates: { lat: 12.5218, lon: 76.8951 },
    soil: { type: "Red Sandy Loam", ph: 6.5, npk: "moderate" },
    weather: {
      location: "Mandya",
      temp_c: 30,
      condition: "Partly cloudy",
      rain_chance_pct: 45,
    },
    water_budget_litres_per_acre: 16500,
    primary_crops: ["Ragi", "Sugarcane", "Paddy"],
  },
  Mysuru: {
    district: "Mysuru",
    location: "Mysuru, Karnataka",
    coordinates: { lat: 12.2958, lon: 76.6394 },
    soil: { type: "Red Loam", ph: 6.7, npk: "balanced" },
    weather: {
      location: "Mysuru",
      temp_c: 29,
      condition: "Partly cloudy",
      rain_chance_pct: 40,
    },
    water_budget_litres_per_acre: 15200,
    primary_crops: ["Maize", "Cotton", "Ragi", "Tobacco"],
  },
  Belagavi: {
    district: "Belagavi",
    location: "Belagavi, Karnataka",
    coordinates: { lat: 15.8497, lon: 74.4977 },
    soil: { type: "Medium Black Soil (Regur)", ph: 7.4, npk: "N-mod, P-rich" },
    weather: {
      location: "Belagavi",
      temp_c: 28,
      condition: "Partly cloudy",
      rain_chance_pct: 35,
    },
    water_budget_litres_per_acre: 17800,
    primary_crops: ["Sugarcane", "Soybean", "Maize", "Groundnut"],
  },
  "Bengaluru Rural": {
    district: "Bengaluru Rural",
    location: "Bengaluru Rural, Karnataka",
    coordinates: { lat: 13.2337, lon: 77.5671 },
    soil: { type: "Red Sandy Loam", ph: 6.3, npk: "balanced" },
    weather: {
      location: "Bengaluru Rural",
      temp_c: 27,
      condition: "Pleasant & Clear",
      rain_chance_pct: 25,
    },
    water_budget_litres_per_acre: 14200,
    primary_crops: ["Ragi", "Grapes", "Mulberry", "Vegetables"],
  },
  "Bengaluru Urban": {
    district: "Bengaluru Urban",
    location: "Bengaluru Urban, Karnataka",
    coordinates: { lat: 12.9716, lon: 77.5946 },
    soil: { type: "Red Loam", ph: 6.4, npk: "moderate" },
    weather: {
      location: "Bengaluru Urban",
      temp_c: 26,
      condition: "Partly cloudy",
      rain_chance_pct: 30,
    },
    water_budget_litres_per_acre: 13500,
    primary_crops: ["Ragi", "Flowers", "Vegetables"],
  },
  Bagalkote: {
    district: "Bagalkote",
    location: "Bagalkote, Karnataka",
    coordinates: { lat: 16.1691, lon: 75.6615 },
    soil: { type: "Black Clay Loam", ph: 7.8, npk: "N-def, K-high" },
    weather: {
      location: "Bagalkote",
      temp_c: 32,
      condition: "Sunny & Warm",
      rain_chance_pct: 20,
    },
    water_budget_litres_per_acre: 13000,
    primary_crops: ["Jowar", "Sugarcane", "Pomegranate", "Bengal Gram"],
  },
  Ballari: {
    district: "Ballari",
    location: "Ballari, Karnataka",
    coordinates: { lat: 15.1394, lon: 76.9214 },
    soil: { type: "Deep Black Soil", ph: 7.9, npk: "N-def, K-rich" },
    weather: {
      location: "Ballari",
      temp_c: 33,
      condition: "Sunny & Dry",
      rain_chance_pct: 15,
    },
    water_budget_litres_per_acre: 12500,
    primary_crops: ["Cotton", "Paddy", "Chilli", "Maize"],
  },
  Bidar: {
    district: "Bidar",
    location: "Bidar, Karnataka",
    coordinates: { lat: 17.9104, lon: 77.5199 },
    soil: { type: "Lateritic & Deep Black", ph: 7.2, npk: "moderate" },
    weather: {
      location: "Bidar",
      temp_c: 31,
      condition: "Clear sky",
      rain_chance_pct: 25,
    },
    water_budget_litres_per_acre: 14000,
    primary_crops: ["Soybean", "Bengal Gram", "Tur (Arhar)", "Jowar"],
  },
  Chamarajanagar: {
    district: "Chamarajanagar",
    location: "Chamarajanagar, Karnataka",
    coordinates: { lat: 11.9261, lon: 76.9437 },
    soil: { type: "Red Sandy Loam", ph: 6.6, npk: "balanced" },
    weather: {
      location: "Chamarajanagar",
      temp_c: 29,
      condition: "Sunny",
      rain_chance_pct: 25,
    },
    water_budget_litres_per_acre: 13800,
    primary_crops: ["Ragi", "Turmeric", "Banana", "Maize"],
  },
  Chikkaballapur: {
    district: "Chikkaballapur",
    location: "Chikkaballapur, Karnataka",
    coordinates: { lat: 13.4325, lon: 77.7275 },
    soil: { type: "Red Gravelly Sandy Loam", ph: 6.3, npk: "N-mod, P-low" },
    weather: {
      location: "Chikkaballapur",
      temp_c: 28,
      condition: "Partly cloudy",
      rain_chance_pct: 20,
    },
    water_budget_litres_per_acre: 12800,
    primary_crops: ["Ragi", "Groundnut", "Grapes", "Silk/Mulberry"],
  },
  Chikkamagaluru: {
    district: "Chikkamagaluru",
    location: "Chikkamagaluru, Karnataka",
    coordinates: { lat: 13.3161, lon: 75.772 },
    soil: { type: "Hill Laterite & Forest Loam", ph: 5.8, npk: "organic-rich" },
    weather: {
      location: "Chikkamagaluru",
      temp_c: 24,
      condition: "Overcast & Breezy",
      rain_chance_pct: 65,
    },
    water_budget_litres_per_acre: 21000,
    primary_crops: ["Coffee", "Arecanut", "Pepper", "Cardamom"],
  },
  Chitradurga: {
    district: "Chitradurga",
    location: "Chitradurga, Karnataka",
    coordinates: { lat: 14.2251, lon: 76.398 },
    soil: { type: "Red Sandy & Mixed Black", ph: 7.3, npk: "moderate" },
    weather: {
      location: "Chitradurga",
      temp_c: 31,
      condition: "Sunny",
      rain_chance_pct: 20,
    },
    water_budget_litres_per_acre: 12000,
    primary_crops: ["Groundnut", "Pomegranate", "Arecanut", "Maize"],
  },
  "Dakshina Kannada": {
    district: "Dakshina Kannada",
    location: "Dakshina Kannada, Karnataka",
    coordinates: { lat: 12.8703, lon: 74.8806 },
    soil: { type: "Coastal Laterite Soil", ph: 5.5, npk: "acidic, N-med" },
    weather: {
      location: "Dakshina Kannada",
      temp_c: 29,
      condition: "Humid & Showers",
      rain_chance_pct: 75,
    },
    water_budget_litres_per_acre: 24000,
    primary_crops: ["Arecanut", "Paddy", "Cashew", "Coconut"],
  },
  Davanagere: {
    district: "Davanagere",
    location: "Davanagere, Karnataka",
    coordinates: { lat: 14.4644, lon: 75.9218 },
    soil: { type: "Red & Black Clay Loam", ph: 7.1, npk: "balanced" },
    weather: {
      location: "Davanagere",
      temp_c: 30,
      condition: "Partly cloudy",
      rain_chance_pct: 30,
    },
    water_budget_litres_per_acre: 16000,
    primary_crops: ["Maize", "Paddy", "Cotton", "Sugarcane"],
  },
  Dharwad: {
    district: "Dharwad",
    location: "Dharwad, Karnataka",
    coordinates: { lat: 15.4589, lon: 75.0078 },
    soil: { type: "Medium Black Soil", ph: 7.5, npk: "P-rich, K-high" },
    weather: {
      location: "Dharwad",
      temp_c: 29,
      condition: "Partly cloudy",
      rain_chance_pct: 35,
    },
    water_budget_litres_per_acre: 15500,
    primary_crops: ["Soybean", "Bengal Gram", "Chilli", "Groundnut"],
  },
  Gadag: {
    district: "Gadag",
    location: "Gadag, Karnataka",
    coordinates: { lat: 15.4167, lon: 75.6167 },
    soil: { type: "Deep Black Soil", ph: 7.8, npk: "N-def, K-high" },
    weather: {
      location: "Gadag",
      temp_c: 31,
      condition: "Sunny",
      rain_chance_pct: 20,
    },
    water_budget_litres_per_acre: 12800,
    primary_crops: ["Groundnut", "Bengal Gram", "Byadgi Chilli", "Onion"],
  },
  Hassan: {
    district: "Hassan",
    location: "Hassan, Karnataka",
    coordinates: { lat: 13.0033, lon: 76.1004 },
    soil: { type: "Red Loamy Soil", ph: 6.2, npk: "balanced" },
    weather: {
      location: "Hassan",
      temp_c: 26,
      condition: "Pleasant & Cloudy",
      rain_chance_pct: 40,
    },
    water_budget_litres_per_acre: 17500,
    primary_crops: ["Potato", "Ginger", "Maize", "Coffee"],
  },
  Haveri: {
    district: "Haveri",
    location: "Haveri, Karnataka",
    coordinates: { lat: 14.7972, lon: 75.3986 },
    soil: { type: "Red Loam & Black Soil", ph: 7.0, npk: "moderate" },
    weather: {
      location: "Haveri",
      temp_c: 29,
      condition: "Partly cloudy",
      rain_chance_pct: 30,
    },
    water_budget_litres_per_acre: 15200,
    primary_crops: ["Byadgi Chilli", "Maize", "Cotton", "Groundnut"],
  },
  Kalaburagi: {
    district: "Kalaburagi",
    location: "Kalaburagi, Karnataka",
    coordinates: { lat: 17.3297, lon: 76.8343 },
    soil: { type: "Deep Black Clay (Vertisols)", ph: 8.1, npk: "N-low, K-rich" },
    weather: {
      location: "Kalaburagi",
      temp_c: 34,
      condition: "Sunny & Hot",
      rain_chance_pct: 15,
    },
    water_budget_litres_per_acre: 12200,
    primary_crops: ["Tur (Red Gram)", "Bengal Gram", "Jowar", "Bajra"],
  },
  Kodagu: {
    district: "Kodagu",
    location: "Kodagu, Karnataka",
    coordinates: { lat: 12.3375, lon: 75.8069 },
    soil: { type: "Forest Clay & Laterite", ph: 5.4, npk: "organic-rich" },
    weather: {
      location: "Kodagu",
      temp_c: 22,
      condition: "Overcast & Showers",
      rain_chance_pct: 80,
    },
    water_budget_litres_per_acre: 26000,
    primary_crops: ["Coffee", "Black Pepper", "Cardamom", "Paddy"],
  },
  Kolar: {
    district: "Kolar",
    location: "Kolar, Karnataka",
    coordinates: { lat: 13.1367, lon: 78.1291 },
    soil: { type: "Red Sandy Loam", ph: 6.4, npk: "N-mod, P-low" },
    weather: {
      location: "Kolar",
      temp_c: 28,
      condition: "Sunny",
      rain_chance_pct: 20,
    },
    water_budget_litres_per_acre: 13000,
    primary_crops: ["Tomato", "Ragi", "Mango", "Mulberry"],
  },
  Koppal: {
    district: "Koppal",
    location: "Koppal, Karnataka",
    coordinates: { lat: 15.3468, lon: 76.1553 },
    soil: { type: "Mixed Red & Black Soil", ph: 7.7, npk: "moderate" },
    weather: {
      location: "Koppal",
      temp_c: 32,
      condition: "Sunny",
      rain_chance_pct: 20,
    },
    water_budget_litres_per_acre: 13200,
    primary_crops: ["Paddy", "Jowar", "Groundnut", "Pomegranate"],
  },
  Raichur: {
    district: "Raichur",
    location: "Raichur, Karnataka",
    coordinates: { lat: 16.2076, lon: 77.3463 },
    soil: { type: "Deep Black Clay", ph: 8.0, npk: "N-low, K-high" },
    weather: {
      location: "Raichur",
      temp_c: 34,
      condition: "Hot & Clear",
      rain_chance_pct: 15,
    },
    water_budget_litres_per_acre: 12000,
    primary_crops: ["Paddy", "Cotton", "Chilli", "Groundnut"],
  },
  Ramanagara: {
    district: "Ramanagara",
    location: "Ramanagara, Karnataka",
    coordinates: { lat: 12.7209, lon: 77.2799 },
    soil: { type: "Red Gravelly Loam", ph: 6.5, npk: "moderate" },
    weather: {
      location: "Ramanagara",
      temp_c: 28,
      condition: "Partly cloudy",
      rain_chance_pct: 30,
    },
    water_budget_litres_per_acre: 14500,
    primary_crops: ["Ragi", "Silk/Mulberry", "Mango", "Coconut"],
  },
  Shivamogga: {
    district: "Shivamogga",
    location: "Shivamogga, Karnataka",
    coordinates: { lat: 13.9299, lon: 75.5681 },
    soil: { type: "Red Sandy & Lateritic Loam", ph: 6.1, npk: "balanced" },
    weather: {
      location: "Shivamogga",
      temp_c: 27,
      condition: "Scattered showers",
      rain_chance_pct: 60,
    },
    water_budget_litres_per_acre: 19500,
    primary_crops: ["Arecanut", "Paddy", "Maize", "Ginger"],
  },
  Tumakuru: {
    district: "Tumakuru",
    location: "Tumakuru, Karnataka",
    coordinates: { lat: 13.3409, lon: 77.1006 },
    soil: { type: "Red Sandy Loam", ph: 6.6, npk: "N-low, K-mod" },
    weather: {
      location: "Tumakuru",
      temp_c: 29,
      condition: "Partly cloudy",
      rain_chance_pct: 25,
    },
    water_budget_litres_per_acre: 13800,
    primary_crops: ["Coconut", "Arecanut", "Ragi", "Groundnut"],
  },
  Udupi: {
    district: "Udupi",
    location: "Udupi, Karnataka",
    coordinates: { lat: 13.3409, lon: 74.7421 },
    soil: { type: "Coastal Laterite & Sandy Alluvium", ph: 5.6, npk: "acidic, N-med" },
    weather: {
      location: "Udupi",
      temp_c: 28,
      condition: "Humid & Showers",
      rain_chance_pct: 75,
    },
    water_budget_litres_per_acre: 23500,
    primary_crops: ["Paddy", "Coconut", "Cashew", "Arecanut"],
  },
  "Uttara Kannada": {
    district: "Uttara Kannada",
    location: "Uttara Kannada, Karnataka",
    coordinates: { lat: 14.795, lon: 74.686 },
    soil: { type: "Coastal Alluvium & Forest Loam", ph: 5.7, npk: "organic-rich" },
    weather: {
      location: "Uttara Kannada",
      temp_c: 27,
      condition: "Scattered showers",
      rain_chance_pct: 70,
    },
    water_budget_litres_per_acre: 22800,
    primary_crops: ["Arecanut", "Vanilla", "Black Pepper", "Paddy"],
  },
  Vijayapura: {
    district: "Vijayapura",
    location: "Vijayapura, Karnataka",
    coordinates: { lat: 16.8302, lon: 75.71 },
    soil: { type: "Deep Black Clay", ph: 8.0, npk: "N-def, K-high" },
    weather: {
      location: "Vijayapura",
      temp_c: 33,
      condition: "Sunny & Dry",
      rain_chance_pct: 15,
    },
    water_budget_litres_per_acre: 12500,
    primary_crops: ["Grapes", "Jowar", "Bengal Gram", "Lemon"],
  },
  Vijayanagara: {
    district: "Vijayanagara",
    location: "Vijayanagara, Karnataka",
    coordinates: { lat: 15.2689, lon: 76.3909 },
    soil: { type: "Mixed Red & Black Loam", ph: 7.6, npk: "moderate" },
    weather: {
      location: "Vijayanagara",
      temp_c: 32,
      condition: "Sunny",
      rain_chance_pct: 20,
    },
    water_budget_litres_per_acre: 13500,
    primary_crops: ["Maize", "Paddy", "Sugarcane", "Banana"],
  },
  Yadgir: {
    district: "Yadgir",
    location: "Yadgir, Karnataka",
    coordinates: { lat: 16.7628, lon: 77.1442 },
    soil: { type: "Medium to Deep Black Soil", ph: 7.9, npk: "moderate" },
    weather: {
      location: "Yadgir",
      temp_c: 33,
      condition: "Sunny & Warm",
      rain_chance_pct: 20,
    },
    water_budget_litres_per_acre: 12600,
    primary_crops: ["Tur (Red Gram)", "Cotton", "Jowar", "Groundnut"],
  },
};

/**
 * Retrieve the agronomic and weather profile for a Karnataka district.
 * Falls back to Mandya if unknown.
 */
export function getDistrictProfile(district?: string | null): DistrictProfile {
  if (!district) return DISTRICT_PROFILES.Mandya;

  const normalized = district.trim().toLowerCase();
  for (const [key, profile] of Object.entries(DISTRICT_PROFILES)) {
    if (key.toLowerCase() === normalized) {
      return profile;
    }
  }

  // Partial search fallback
  for (const [key, profile] of Object.entries(DISTRICT_PROFILES)) {
    if (
      normalized.includes(key.toLowerCase()) ||
      key.toLowerCase().includes(normalized)
    ) {
      return profile;
    }
  }

  return DISTRICT_PROFILES.Mandya;
}
