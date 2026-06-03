import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  extra?.apiUrl ??
  "http://localhost:8000/api/v1";

export const APP_NAME = "KrushiMitra";
