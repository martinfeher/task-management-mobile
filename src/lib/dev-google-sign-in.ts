import { isDevelopmentApplicationEnv } from "@/lib/application-env";

/** Google OAuth is offered in local dev when APPLICATION_ENV=development. */
export function isDevGoogleSignInEnabled(): boolean {
  return __DEV__ && isDevelopmentApplicationEnv();
}
