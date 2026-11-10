import Constants from "expo-constants";

function readApplicationEnv(): string | undefined {
  const fromExtra = Constants.expoConfig?.extra?.applicationEnv;
  if (typeof fromExtra === "string" && fromExtra.length > 0) {
    return fromExtra.trim();
  }
  const fromPublic = process.env.EXPO_PUBLIC_APPLICATION_ENV?.trim();
  if (fromPublic) {
    return fromPublic;
  }
  return undefined;
}

/** True in dev builds when `.env` has `APPLICATION_ENV=development` (via app config `extra`). */
export function isDevelopmentApplicationEnv(): boolean {
  if (!__DEV__) {
    return false;
  }
  return readApplicationEnv() === "development";
}
