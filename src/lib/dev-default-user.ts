import Constants from "expo-constants";

/** Default account used for automatic dev sign-in (override in `.env`). */
export const DEFAULT_DEVELOPMENT_USER_EMAIL = "mn.feher@gmail.com";

export function getDefaultDevelopmentUserEmail(): string {
  const fromExtra = Constants.expoConfig?.extra?.devDefaultUserEmail;
  if (typeof fromExtra === "string" && fromExtra.trim().length > 0) {
    return fromExtra.trim();
  }
  return (
    process.env.EXPO_PUBLIC_DEV_DEFAULT_USER_EMAIL?.trim() ||
    process.env.EXPO_PUBLIC_DEV_SIGN_IN_EMAIL?.trim() ||
    DEFAULT_DEVELOPMENT_USER_EMAIL
  );
}
