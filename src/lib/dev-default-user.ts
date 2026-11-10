import Constants from "expo-constants";

/**
 * Default account for dev auto sign-in (override via EXPO_PUBLIC_DEV_DEFAULT_USER_EMAIL).
 *
 * DB lookup (Postgres `user` / `account`, local todolistWeb):
 * - test@test.io → provider `google` only; `account.password` is NULL.
 * - There is no stored email/password for this user; plaintext cannot be read from the DB.
 * - Mobile email sign-in needs a `credential` account or use mobiletest1794071382@example.com
 *   with password in `dev-auto-sign-in.local.ts`.
 */
export const DEFAULT_DEVELOPMENT_USER_EMAIL = "test@test.io";

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
