import {
  clearStoredAuthToken,
  getStoredAuthToken,
} from "@/lib/auth-session";

type UnauthorizedListener = () => void;

let unauthorizedListener: UnauthorizedListener | null = null;

export function setApiUnauthorizedListener(listener: UnauthorizedListener | null) {
  unauthorizedListener = listener;
}

export async function apiFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await getStoredAuthToken();
  const headers = new Headers(init?.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    await clearStoredAuthToken();
    unauthorizedListener?.();
  }

  return response;
}
