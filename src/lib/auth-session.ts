import { API_BASE_URL } from "@/constants/api";
import {
  readAuthToken,
  removeAuthToken,
  writeAuthToken,
} from "@/lib/auth-token-storage";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type AuthErrorBody = {
  message?: string;
  code?: string;
};

function readAuthTokenFromResponse(response: Response) {
  return response.headers.get("set-auth-token");
}

export async function getStoredAuthToken() {
  return readAuthToken();
}

export async function setStoredAuthToken(token: string) {
  await writeAuthToken(token);
}

export async function clearStoredAuthToken() {
  await removeAuthToken();
}

const SESSION_FETCH_TIMEOUT_MS = 12_000;

export async function fetchAuthSession(token: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SESSION_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/get-session`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { user?: AuthUser } | null;
  return data?.user ?? null;
}

async function persistTokenFromAuthResponse(response: Response) {
  const token = readAuthTokenFromResponse(response);
  if (token) {
    await setStoredAuthToken(token);
  }
  return token;
}

function authErrorMessage(body: AuthErrorBody, fallback: string) {
  if (typeof body.message === "string" && body.message.length > 0) {
    return body.message;
  }
  return fallback;
}

export async function signInWithEmail(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as AuthErrorBody;

  if (!response.ok) {
    throw new Error(authErrorMessage(body, "Invalid email or password"));
  }

  const token = await persistTokenFromAuthResponse(response);
  if (!token) {
    throw new Error("Sign-in succeeded but no session token was returned");
  }

  const user = await fetchAuthSession(token);
  if (!user) {
    throw new Error("Signed in but could not load your profile");
  }

  return user;
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  name: string;
}) {
  const response = await fetch(`${API_BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email.trim(),
      password: input.password,
      name: input.name.trim() || input.email.trim().split("@")[0] || "User",
    }),
  });

  const body = (await response.json().catch(() => ({}))) as AuthErrorBody;

  if (!response.ok) {
    throw new Error(authErrorMessage(body, "Could not create your account"));
  }

  const token = await persistTokenFromAuthResponse(response);
  if (!token) {
    throw new Error("Account created but no session token was returned");
  }

  const user = await fetchAuthSession(token);
  if (!user) {
    throw new Error("Account created but could not load your profile");
  }

  return user;
}

export async function signOutOnServer() {
  const token = await getStoredAuthToken();
  if (token) {
    await fetch(`${API_BASE_URL}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => undefined);
  }
  await clearStoredAuthToken();
}
