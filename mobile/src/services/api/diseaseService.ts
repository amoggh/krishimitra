import { Platform } from "react-native";
import { apiClient } from "./client";


// ============================================================
// DISEASE PREDICTION
// ============================================================

export type DiseasePrediction = {
  crop: string | null;

  condition: string;

  class_name: string | null;

  is_healthy: boolean | null;

  confidence: number;

  status:
    | "confident"
    | "uncertain";
};


// ============================================================
// PESTICIDE RECOMMENDATION
// ============================================================

export type PesticideRecommendation = {
  active_ingredient: string;
  product_type: string;
  formulation: string | null;
  recommendation_status: string;
  verification_source: string;
  source_url: string | null;
  note: string;
};


// ============================================================
// ONLINE PESTICIDE PRICE
// ============================================================

export type PesticidePrice = {
  product: string;
  active_ingredient: string;
  price: number | null;
  mrp: number | null;
  currency: string;
  pack_size: string | null;
  pack_sizes: string[];
  seller: string;
  source: string;
  source_url: string | null;
  inventory: string | number | null;
  state: string;
  district: string | null;
  checked_at: string;
};


// ============================================================
// FINAL API RESULT
// ============================================================

export type DiseaseResult = {
  success: boolean;
  prediction: DiseasePrediction;
  pesticides: PesticideRecommendation[];
  pesticide_prices: PesticidePrice[];
  pesticide_status: string;
  price_status: string;
  location: {
    state: string;
    district?: string | null;
  };
  price_note: string;
};


// ============================================================
// ANALYZE DISEASE
// ============================================================

export async function analyzeDisease(

  imageUri: string,

  mimeType: string = "image/jpeg",

  state: string = "Karnataka",

  district?: string

): Promise<DiseaseResult> {

  const formData =
    new FormData();


  // ==========================================================
  // WEB
  // ==========================================================

  if (Platform.OS === "web") {

    const imageResponse =
      await fetch(
        imageUri
      );

    if (
      !imageResponse.ok
    ) {

      throw new Error(
        "Unable to read selected image"
      );
    }

    const blob =
      await imageResponse.blob();

    const file =
      new File(
        [blob],
        "leaf.jpg",
        {
          type:
            mimeType ||
            blob.type ||
            "image/jpeg",
        }
      );

    formData.append(
      "file",
      file
    );

  }

  // ==========================================================
  // REACT NATIVE / EXPO
  // ==========================================================

  else {
    formData.append(
      "file",
      {
        uri: imageUri,
        type: mimeType,
        name: "leaf.jpg",
      } as unknown as Blob
    );
  }


  // ==========================================================
  // LOCATION
  // ==========================================================

  formData.append(
    "state",
    state
  );


  if (district) {

    formData.append(
      "district",
      district
    );
  }


  // ==========================================================
  // API REQUEST
  // ==========================================================

  const response =
    await apiClient.post<DiseaseResult>(
      "/disease/predict",

      formData,

      {
        headers: {
          Accept:
            "application/json",
        },

        timeout: 60_000,
      }
    );


  return response.data;
}