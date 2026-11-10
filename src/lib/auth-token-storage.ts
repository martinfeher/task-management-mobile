import { requireOptionalNativeModule } from "expo-modules-core";

const TOKEN_KEY = "todolist_bearer_token";

type ExpoSecureStoreModule = {
  getValueWithKeyAsync: (
    key: string,
    options?: Record<string, unknown>,
  ) => Promise<string | null>;
  setValueWithKeyAsync: (
    key: string,
    value: string,
    options?: Record<string, unknown>,
  ) => Promise<void>;
  deleteValueWithKeyAsync: (
    key: string,
    options?: Record<string, unknown>,
  ) => Promise<void>;
};

const secureStoreNative =
  requireOptionalNativeModule<ExpoSecureStoreModule>("ExpoSecureStore");

/** In-memory fallback when the dev client was built before expo-secure-store. */
let memoryToken: string | null | undefined;

export function isSecureTokenStorageAvailable() {
  return (
    secureStoreNative != null &&
    typeof secureStoreNative.getValueWithKeyAsync === "function"
  );
}

export async function readAuthToken() {
  if (memoryToken !== undefined) {
    return memoryToken;
  }

  if (isSecureTokenStorageAvailable()) {
    try {
      memoryToken = await secureStoreNative!.getValueWithKeyAsync(TOKEN_KEY, {});
    } catch {
      memoryToken = null;
    }
    return memoryToken;
  }

  memoryToken = null;
  return memoryToken;
}

export async function writeAuthToken(token: string) {
  memoryToken = token;

  if (isSecureTokenStorageAvailable()) {
    await secureStoreNative!.setValueWithKeyAsync(TOKEN_KEY, token, {});
  }
}

export async function removeAuthToken() {
  memoryToken = null;

  if (isSecureTokenStorageAvailable()) {
    try {
      await secureStoreNative!.deleteValueWithKeyAsync(TOKEN_KEY, {});
    } catch {
      // ignore
    }
  }
}
