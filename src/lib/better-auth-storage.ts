import { requireOptionalNativeModule } from "expo-modules-core";

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

const memoryStore = new Map<string, string>();

/** SecureStore-compatible adapter; falls back to memory if the native module is missing (rebuild dev client for persistence). */
export const betterAuthExpoStorage = {
  getItem(key: string): string | null {
    return memoryStore.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    memoryStore.set(key, value);
    void betterAuthExpoStorage.setItemAsync(key, value);
  },
  async getItemAsync(key: string): Promise<string | null> {
    if (secureStoreNative?.getValueWithKeyAsync) {
      try {
        const value = await secureStoreNative.getValueWithKeyAsync(key, {});
        if (value != null) {
          memoryStore.set(key, value);
          return value;
        }
      } catch {
        // fall through
      }
    }
    return memoryStore.get(key) ?? null;
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    memoryStore.set(key, value);
    if (secureStoreNative?.setValueWithKeyAsync) {
      try {
        await secureStoreNative.setValueWithKeyAsync(key, value, {});
      } catch {
        // ignore
      }
    }
  },
};
