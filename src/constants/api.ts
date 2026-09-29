import { Platform } from "react-native";

const API_URL = "http://192.168.0.5:3000";

function getDefaultApiUrl() {
  if (Platform.OS === "web") {
    return "http://localhost:3000";
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }

  return API_URL;
}

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? getDefaultApiUrl();
