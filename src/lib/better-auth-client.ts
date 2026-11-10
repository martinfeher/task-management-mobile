import type { createAuthClient } from "better-auth/react";

import { API_BASE_URL } from "@/constants/api";
import { betterAuthExpoStorage } from "@/lib/better-auth-storage";

const BETTER_AUTH_COOKIE_STORE_KEY = "todolist_cookie";
const SESSION_COOKIE_FRAGMENT = "session_token";

type BetterAuthClient = ReturnType<typeof createAuthClient>;

let betterAuthClientSingleton: BetterAuthClient | null = null;

/** Lazy init so the app boots without loading expo-secure-store at import time. */
export function getBetterAuthClient(): BetterAuthClient {
  if (betterAuthClientSingleton) {
    return betterAuthClientSingleton;
  }

  const { createAuthClient } =
    require("better-auth/react") as typeof import("better-auth/react");
  const { expoClient } =
    require("@better-auth/expo/client") as typeof import("@better-auth/expo/client");

  betterAuthClientSingleton = createAuthClient({
    baseURL: API_BASE_URL,
    plugins: [
      expoClient({
        scheme: "todolist",
        storagePrefix: "todolist",
        storage: betterAuthExpoStorage,
      }),
    ],
  });

  return betterAuthClientSingleton;
}

type BetterAuthClientWithExpoCookie = BetterAuthClient & {
  getCookie?: () => Promise<string>;
};

export async function getBetterAuthSessionCookie(): Promise<string | null> {
  const client = getBetterAuthClient() as BetterAuthClientWithExpoCookie;
  if (typeof client.getCookie !== "function") {
    return null;
  }
  const cookie = await client.getCookie();
  return cookie.length > 0 ? cookie : null;
}

type StoredAuthCookieEntry = {
  value?: string;
  expires?: string | null;
};

function parseStoredAuthCookies(
  raw: string,
): Record<string, StoredAuthCookieEntry> | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, StoredAuthCookieEntry>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function extractSessionTokenFromCookieHeader(cookieHeader: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.includes(SESSION_COOKIE_FRAGMENT)) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const value = trimmed.slice(separator + 1).trim();
    return value.length > 0 ? value : null;
  }
  return null;
}

/** Bearer token equals the Better Auth `session_token` cookie value (see bearer plugin). */
export async function getBetterAuthBearerToken(): Promise<string | null> {
  const headerCookie = await getBetterAuthSessionCookie();
  if (headerCookie) {
    const fromHeader = extractSessionTokenFromCookieHeader(headerCookie);
    if (fromHeader) {
      return fromHeader;
    }
  }

  const raw = await betterAuthExpoStorage.getItemAsync(
    BETTER_AUTH_COOKIE_STORE_KEY,
  );
  if (!raw) {
    return null;
  }

  const parsed = parseStoredAuthCookies(raw);
  if (!parsed) {
    return null;
  }

  for (const [name, entry] of Object.entries(parsed)) {
    if (!name.includes(SESSION_COOKIE_FRAGMENT)) {
      continue;
    }
    if (entry.expires) {
      const expiresAt = new Date(entry.expires).getTime();
      if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
        continue;
      }
    }
    const value = entry.value?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}
