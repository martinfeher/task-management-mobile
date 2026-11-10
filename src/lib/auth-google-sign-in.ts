import * as Linking from "expo-linking";

import { API_BASE_URL } from "@/constants/api";
import {
  getBetterAuthBearerToken,
  getBetterAuthClient,
  getBetterAuthSessionCookie,
} from "@/lib/better-auth-client";
import {
  fetchAuthSession,
  setStoredAuthToken,
  type AuthUser,
} from "@/lib/auth-session";

type AuthErrorBody = {
  message?: string;
  code?: string;
};

function readAuthError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as AuthErrorBody).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
}

function extractSessionTokenFromResponseCookie(
  setCookieHeader: string | null | undefined,
): string | null {
  if (!setCookieHeader) {
    return null;
  }
  const match = /(?:^|,\s*)(?:__Secure-)?better-auth\.session_token=([^;]+)/i.exec(
    setCookieHeader,
  );
  const value = match?.[1]?.trim();
  return value && value.length > 0 ? value : null;
}

function mapBetterAuthUser(user: {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
  };
}

/** Google OAuth via Better Auth + Expo; session is synced to the app bearer token for REST APIs. */
export async function signInWithGoogle(): Promise<AuthUser> {
  const authClient = getBetterAuthClient();
  const { error } = await authClient.signIn.social({
    provider: "google",
    callbackURL: "/",
  });

  if (error) {
    throw new Error(readAuthError(error, "Could not sign in with Google"));
  }

  const session = await authClient.getSession();
  const sessionUser = session.data?.user;

  let token = await getBetterAuthBearerToken();
  if (!token) {
    const cookie = await getBetterAuthSessionCookie();
    if (cookie) {
      const expoOrigin = Linking.createURL("", { scheme: "todolist" });
      const response = await fetch(`${API_BASE_URL}/api/auth/get-session`, {
        headers: {
          cookie,
          "expo-origin": expoOrigin,
        },
      }).catch(() => null);
      token =
        response?.headers.get("set-auth-token")?.trim() ??
        extractSessionTokenFromResponseCookie(
          response?.headers.get("set-cookie"),
        ) ??
        (await getBetterAuthBearerToken());
    }
  }

  if (!token) {
    throw new Error(
      "Google sign-in succeeded but no session token was found. Restart the API and try again.",
    );
  }

  await setStoredAuthToken(token);

  if (sessionUser?.id && sessionUser.email) {
    return mapBetterAuthUser(sessionUser);
  }

  const user = await fetchAuthSession(token);
  if (!user) {
    throw new Error("Signed in with Google but could not load your profile");
  }

  return user;
}

export async function signOutGoogleSession() {
  getBetterAuthClient().signOut().catch(() => undefined);
}
