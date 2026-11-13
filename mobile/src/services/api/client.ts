import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import { API_BASE_URL } from "@/constants/config";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add authentication token when available
    if (authToken) {
      config.headers.Authorization = "Bearer " + authToken;
    }

    // IMPORTANT:
    // Do not manually set Content-Type for FormData.
    // The browser/Axios will automatically set:
    //
    // multipart/form-data; boundary=----...
    //
    // This boundary is required by FastAPI to correctly
    // parse the uploaded file.
    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData
    ) {
      delete config.headers["Content-Type"];
    } else if (!config.headers["Content-Type"]) {
      // Normal API requests use JSON
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },

  (error: AxiosError<{ detail?: string | object }>) => {
    const detail = error.response?.data?.detail;

    let message = "Network request failed";

    if (typeof detail === "string") {
      message = detail;
    } else if (detail) {
      // FastAPI validation errors can return an object/array.
      // Convert them to readable JSON instead of [object Object].
      message = JSON.stringify(detail);
    } else if (error.message) {
      message = error.message;
    }

    return Promise.reject(new Error(message));
  }
);

export default apiClient;