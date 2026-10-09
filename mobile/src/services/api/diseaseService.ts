import { apiClient } from "./client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DiseasePrediction = {
  crop: string | null;
  condition: string;
  class_name: string | null;
  is_healthy: boolean | null;
  confidence: number;
  status: "confident" | "uncertain";
};

export type DiseaseResult = {
  success: boolean;
  prediction: DiseasePrediction;
};

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * Send a leaf image to the backend and return the disease prediction.
 *
 * @param imageUri  Expo image URI (file:// or content://)
 * @param mimeType  Optional MIME type hint (defaults to image/jpeg)
 */
export async function analyzeDisease(
  imageUri: string,
  mimeType: string = "image/jpeg"
): Promise<DiseaseResult> {
  const formData = new FormData();

  // React Native / Expo FormData accepts this object shape for file uploads
  formData.append("file", {
    uri: imageUri,
    type: mimeType,
    name: "leaf.jpg",
  } as unknown as Blob);

  const response = await apiClient.post<DiseaseResult>(
    "/disease/predict",
    formData,
    {
      headers: {
        // Let axios/fetch set the correct multipart boundary automatically
        "Content-Type": "multipart/form-data",
      },
      // Disease inference can be slow on first call after a cold start
      timeout: 60_000,
    }
  );

  return response.data;
}

/**
 * Check whether the backend model is loaded and ready.
 */
export async function getDiseaseModelStatus(): Promise<{
  model_loaded: boolean;
  confidence_threshold: number;
  num_classes: number;
}> {
  const response = await apiClient.get("/disease/status");
  return response.data;
}
