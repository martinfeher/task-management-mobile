import Constants from "expo-constants";
import { Platform } from "react-native";

const API_PORT = 3000;

function getPackagerHost() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) {
    return null;
  }
  return hostUri.split(":")[0] ?? null;
}

function getDefaultApiUrl() {
  if (Platform.OS === "web") {
    return `http://localhost:${API_PORT}`;
  }

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${API_PORT}`;
  }

  // iOS Simulator shares the Mac network stack; localhost reaches the dev server.
  if (!Constants.isDevice) {
    return `http://localhost:${API_PORT}`;
  }

  const packagerHost = getPackagerHost();
  if (packagerHost) {
    return `http://${packagerHost}:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

function resolveApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

  if (
    Platform.OS === "ios" &&
    Constants.isDevice &&
    envUrl &&
    (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))
  ) {
    const packagerHost = getPackagerHost();
    if (packagerHost) {
      return `http://${packagerHost}:${API_PORT}`;
    }
  }

  return envUrl ?? getDefaultApiUrl();
}

export const API_BASE_URL = resolveApiBaseUrl();
