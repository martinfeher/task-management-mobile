import { isDevelopmentApplicationEnv } from "@/lib/application-env";
import { DEV_MOBILE_SESSION_SECRET_HEADER } from "@/lib/dev-mobile-session-constants";

/**
 * Dev-only silent sign-in via server-minted session (see todolistWeb
 * POST /api/dev/mobile-session). Requires EXPO_PUBLIC_DEV_MOBILE_SESSION_SECRET.
 */
export function isDevMobileSessionEnabled(): boolean {
  if (!__DEV__) {
    return false;
  }
  if (!isDevelopmentApplicationEnv()) {
    return false;
  }
  if (process.env.EXPO_PUBLIC_DEV_MOBILE_SESSION === "false") {
    return false;
  }
  const secret = process.env.EXPO_PUBLIC_DEV_MOBILE_SESSION_SECRET?.trim();
  return Boolean(secret);
}

export function getDevMobileSessionRequestHeaders(): Record<string, string> | null {
  if (!isDevMobileSessionEnabled()) {
    return null;
  }
  const secret = process.env.EXPO_PUBLIC_DEV_MOBILE_SESSION_SECRET?.trim();
  if (!secret) {
    return null;
  }
  return {
    [DEV_MOBILE_SESSION_SECRET_HEADER]: secret,
  };
}
