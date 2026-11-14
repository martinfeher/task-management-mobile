import type { AuthUser } from "@/lib/auth-session";
import {
  clearLocalStore,
  getMeta,
  getMetaJson,
  hydrateLocalStore,
  setMeta,
  setMetaJson,
} from "@/lib/offline/local-store";

const OWNER_META_KEY = "ownerUserId";
const AUTH_USER_META_KEY = "auth:user";

/** Keeps one user's offline data and queued changes from ever syncing into another account. */
export async function bindOfflineStoreToUser(user: AuthUser) {
  await hydrateLocalStore();
  const owner = getMeta(OWNER_META_KEY);
  if (owner && owner !== user.id) {
    clearLocalStore();
  }
  setMeta(OWNER_META_KEY, user.id);
  setMetaJson(AUTH_USER_META_KEY, user);
}

export async function readOfflineAuthUser() {
  await hydrateLocalStore();
  return getMetaJson<AuthUser>(AUTH_USER_META_KEY);
}

export async function clearOfflineStore() {
  await hydrateLocalStore();
  clearLocalStore();
}
