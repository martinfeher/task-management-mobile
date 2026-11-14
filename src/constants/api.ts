import Constants from "expo-constants";
import { Platform } from "react-native";

const API_PORT = 3000;

function isLoopbackHost(host: string) {
  return host === "localhost" || host === "127.0.0.1";
}

/** Metro / dev-client host (LAN IP). Not valid on a physical device when it is loopback. */
function getPackagerHost() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return hostUri.split(":")[0] ?? null;
  }
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??
    (Constants.manifest as { debuggerHost?: string } | null)?.debuggerHost;
  if (debuggerHost) {
    return debuggerHost.split(":")[0] ?? null;
  }
  return null;
}

function getDevMachineHost() {
  const host = getPackagerHost();
  if (!host || (Constants.isDevice && isLoopbackHost(host))) {
    return null;
  }
  return host;
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

  const devHost = getDevMachineHost();
  if (devHost) {
    return `http://${devHost}:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

function resolveApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

  // Simulator: always localhost so it matches server BETTER_AUTH_URL (OAuth state).
  // .env.local may set a LAN URL for a physical device — ignore that here.
  if (Platform.OS === "ios" && !Constants.isDevice) {
    return `http://localhost:${API_PORT}`;
  }

  if (
    Platform.OS === "ios" &&
    Constants.isDevice &&
    envUrl &&
    (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))
  ) {
    const devHost = getDevMachineHost();
    if (devHost) {
      return `http://${devHost}:${API_PORT}`;
    }
  }

  return envUrl ?? getDefaultApiUrl();
}

export const API_BASE_URL = resolveApiBaseUrl();
