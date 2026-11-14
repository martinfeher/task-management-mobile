import {
  clearStoredAuthToken,
  getStoredAuthToken,
} from "@/lib/auth-session";
import {
  isNetworkError,
  reportNetworkFailure,
  reportNetworkSuccess,
} from "@/lib/offline/network-status";

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

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
    });
  } catch (error) {
    if (isNetworkError(error)) {
      reportNetworkFailure();
    }
    throw error;
  }

  reportNetworkSuccess();

  if (response.status === 401) {
    await clearStoredAuthToken();
    unauthorizedListener?.();
  }

  return response;
}
