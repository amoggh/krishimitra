import { Platform } from "react-native";
import { apiClient } from "./client";
import { API_BASE_URL } from "@/constants/config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TreatmentAdvisory = {
  status?: string;
  message?: string;
  chemical?: string;
  organic?: string;
  spray_dosage?: string;
  management?: string;
};

export type DiseaseCandidate = {
  crop: string;
  condition: string;
  confidence: number;
};

export type DiseasePrediction = {
  crop: string | null;
  condition: string;
  class_name: string | null;
  is_healthy: boolean | null;
  confidence: number;
  status: "confident" | "uncertain";
  entropy?: number;
  margin?: number;
  candidates?: DiseaseCandidate[];
  shooting_guidance?: string[];
  treatment?: TreatmentAdvisory;
};

export type DiseaseResult = {
  success: boolean;
  error_type?: string;
  message?: string;
  details?: string;
  prediction?: DiseasePrediction;
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

  if (Platform.OS === "web") {
    // If it's a data URL, convert safely to Blob
    if (imageUri.startsWith("data:")) {
      const parts = imageUri.split(",");
      const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      formData.append("file", blob, "leaf.jpg");
    } else {
      try {
        const res = await fetch(imageUri);
        const blob = await res.blob();
        formData.append("file", blob, "leaf.jpg");
      } catch {
        formData.append("file", {
          uri: imageUri,
          type: mimeType,
          name: "leaf.jpg",
        } as unknown as Blob);
      }
    }
  } else {
    // React Native / Expo FormData accepts this object shape for file uploads
    formData.append("file", {
      uri: imageUri,
      type: mimeType,
      name: "leaf.jpg",
    } as unknown as Blob);
  }

  // Use fetch directly for multipart uploads to ensure browser appends the multipart boundary correctly
  const endpoint = `${API_BASE_URL}/disease/predict`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
      },
    });

    const resJson = await response.json();
    if (!response.ok) {
      const msg = resJson.detail || resJson.message || `Server returned ${response.status}`;
      throw new Error(msg);
    }
    return resJson;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to connect to backend server";
    throw new Error(errorMsg);
  }
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
