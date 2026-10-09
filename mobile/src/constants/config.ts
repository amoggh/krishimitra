import Constants from "expo-constants";
import { Platform } from "react-native";

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

// On Web browser, connect to localhost:8000. On phone, use LAN IP.
export const API_BASE_URL =
  Platform.OS === "web"
    ? "http://localhost:8000/api/v1"
    : process.env.EXPO_PUBLIC_API_URL ??
      extra?.apiUrl ??
      "http://localhost:8000/api/v1";

export const APP_NAME = "KrushiMitra";
