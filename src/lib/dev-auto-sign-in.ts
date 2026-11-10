import { isDevelopmentApplicationEnv } from "@/lib/application-env";
import { getDefaultDevelopmentUserEmail } from "@/lib/dev-default-user";

/** Local-only override; add `dev-auto-sign-in.local.ts` (gitignored) with your password. */
let localDevPassword: string | undefined;
if (__DEV__) {
  try {
    localDevPassword = require("./dev-auto-sign-in.local").LOCAL_DEV_SIGN_IN_PASSWORD as
      | string
      | undefined;
  } catch {
    // Optional local credentials file.
  }
}

export type DevAutoSignInCredentials = {
  email: string;
  password: string;
};

export function isDevAutoSignInEnabled(): boolean {
  if (!__DEV__) {
    return false;
  }
  return process.env.EXPO_PUBLIC_DEV_AUTO_SIGN_IN !== "false";
}

/** When true, the manual sign-in screen is hidden; dev credentials or setup is used instead. */
export function shouldShowManualSignInScreen(): boolean {
  if (!__DEV__) {
    return true;
  }
  if (isDevelopmentApplicationEnv() && isDevAutoSignInEnabled()) {
    return false;
  }
  return true;
}

function resolveDevPassword(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_DEV_SIGN_IN_PASSWORD?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const fromLocal =
    typeof localDevPassword === "string" ? localDevPassword.trim() : "";
  return fromLocal.length > 0 ? fromLocal : null;
}

/** Dev-only credentials (never in production builds). */
export function getDevAutoSignInCredentials(): DevAutoSignInCredentials | null {
  if (!isDevAutoSignInEnabled()) {
    return null;
  }

  const password = resolveDevPassword();
  if (!password) {
    return null;
  }

  return {
    email: getDefaultDevelopmentUserEmail(),
    password,
  };
}
