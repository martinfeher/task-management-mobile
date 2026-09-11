const DEFAULT_DEDUPE_MS = 8_000;

type DedupeStore = {
  inFlight: Map<string, Promise<unknown>>;
  recent: Map<string, { value: unknown; fetchedAt: number }>;
};

const STORE_KEY = "__todoSdk57RequestDedupe";

function getStore(): DedupeStore {
  const globalScope = globalThis as typeof globalThis & {
    [STORE_KEY]?: DedupeStore;
  };

  if (!globalScope[STORE_KEY]) {
    globalScope[STORE_KEY] = {
      inFlight: new Map(),
      recent: new Map(),
    };
  }

  return globalScope[STORE_KEY];
}

export function clearDedupeCache(prefix?: string) {
  const store = getStore();
  if (!prefix) {
    store.inFlight.clear();
    store.recent.clear();
    return;
  }

  for (const key of store.inFlight.keys()) {
    if (key.startsWith(prefix)) {
      store.inFlight.delete(key);
    }
  }

  for (const key of store.recent.keys()) {
    if (key.startsWith(prefix)) {
      store.recent.delete(key);
    }
  }
}

export async function dedupeRequest<T>(
  cacheKey: string,
  request: () => Promise<T>,
  options?: { dedupeMs?: number; force?: boolean },
): Promise<T> {
  const dedupeMs = options?.dedupeMs ?? DEFAULT_DEDUPE_MS;
  const store = getStore();

  if (!options?.force) {
    const inFlight = store.inFlight.get(cacheKey);
    if (inFlight) {
      return inFlight as Promise<T>;
    }

    const recent = store.recent.get(cacheKey);
    if (recent && Date.now() - recent.fetchedAt < dedupeMs) {
      return recent.value as T;
    }
  } else {
    store.inFlight.delete(cacheKey);
    store.recent.delete(cacheKey);
  }

  const promise = request()
    .then((value) => {
      store.recent.set(cacheKey, {
        value,
        fetchedAt: Date.now(),
      });
      return value;
    })
    .finally(() => {
      if (store.inFlight.get(cacheKey) === promise) {
        store.inFlight.delete(cacheKey);
      }
    });

  store.inFlight.set(cacheKey, promise);
  return promise;
}
