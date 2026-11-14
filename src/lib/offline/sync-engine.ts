import { useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { API_BASE_URL } from "@/constants/api";
import { apiFetch } from "@/lib/api-fetch";
import { clearAllTaskSessions } from "@/lib/app-data-session";
import { getStoredAuthToken } from "@/lib/auth-session";
import {
  completeOutboxEntries,
  discardFailedEntries,
  failOutboxEntry,
  getFailedMutations,
  getMeta,
  getPendingMutationCount,
  hydrateLocalStore,
  patchLocalTask,
  remapTaskId,
  retryFailedEntries,
  revertInflightEntries,
  saveServerTasks,
  setMeta,
  subscribeLocalStore,
  takeOutboxBatch,
} from "@/lib/offline/local-store";
import {
  isNetworkError,
  isOnline,
  startNetworkMonitoring,
  subscribeNetworkStatus,
} from "@/lib/offline/network-status";
import type {
  OutboxEntry,
  SyncPullResponse,
  SyncPushResponse,
} from "@/lib/offline/types";
import { clearDedupeCache } from "@/lib/request-dedupe";

const PUSH_BATCH_SIZE = 50;
const ENQUEUE_DEBOUNCE_MS = 1_000;
const PERIODIC_SYNC_MS = 60_000;
const MAX_BACKOFF_MS = 60_000;
const PULL_OVERLAP_MS = 5_000;
const LAST_PULLED_META_KEY = "lastPulledAt";
export const CLOCK_OFFSET_META_KEY = "clockOffsetMs";

export type SyncStatus = {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncedAt: number | null;
  lastError: string | null;
};

type SyncListener = (event: { changed: boolean }) => void;

class SyncHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SyncHttpError";
  }
}

let status: SyncStatus = {
  online: true,
  syncing: false,
  pendingCount: 0,
  failedCount: 0,
  lastSyncedAt: null,
  lastError: null,
};
const statusListeners = new Set<() => void>();
const syncListeners = new Set<SyncListener>();

let running: Promise<void> | null = null;
let rerunRequested = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let backoffMs = 0;
let stopEngine: (() => void) | null = null;

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  for (const listener of statusListeners) listener();
}

function refreshCounts() {
  setStatus({
    pendingCount: getPendingMutationCount(),
    failedCount: getFailedMutations().length,
    online: isOnline(),
  });
}

export function getSyncStatus() {
  return status;
}

export function useSyncStatus() {
  return useSyncExternalStore(
    (listener) => {
      statusListeners.add(listener);
      return () => {
        statusListeners.delete(listener);
      };
    },
    getSyncStatus,
    getSyncStatus,
  );
}

/** Fires after a sync pass; `changed` is true when server data was applied locally. */
export function subscribeSyncEvents(listener: SyncListener) {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

function updateClockOffset(sentAt: number, receivedAt: number, serverNow: string) {
  const serverTime = Date.parse(serverNow);
  if (!Number.isFinite(serverTime)) return;
  const offset = Math.round(serverTime - (sentAt + receivedAt) / 2);
  setMeta(CLOCK_OFFSET_META_KEY, String(offset));
}

async function requestJson<T>(path: string, body?: unknown): Promise<{ data: T; sentAt: number; receivedAt: number }> {
  const sentAt = Date.now();
  const response = await apiFetch(`${API_BASE_URL}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const receivedAt = Date.now();
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new SyncHttpError(response.status, text || `Sync request failed (${response.status})`);
  }
  return { data: (await response.json()) as T, sentAt, receivedAt };
}

function serializeEntry(entry: OutboxEntry) {
  return {
    mutationId: entry.mutationId,
    kind: entry.kind,
    entityId: entry.entityId,
    at: entry.at,
    ...(entry.fields ? { fields: entry.fields } : {}),
    ...(entry.reorder ? { reorder: entry.reorder } : {}),
  };
}

async function pushOutbox(): Promise<boolean> {
  let changed = false;

  for (;;) {
    const batch = takeOutboxBatch(PUSH_BATCH_SIZE);
    if (batch.length === 0) return changed;

    let response: { data: SyncPushResponse; sentAt: number; receivedAt: number };
    try {
      response = await requestJson<SyncPushResponse>("/api/sync/push", {
        mutations: batch.map(serializeEntry),
      });
    } catch (error) {
      if (error instanceof SyncHttpError && error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 408 && error.status !== 429) {
        for (const entry of batch) failOutboxEntry(entry.seq, error.message);
        continue;
      }
      throw error;
    }

    const { data, sentAt, receivedAt } = response;
    updateClockOffset(sentAt, receivedAt, data.serverNow);

    const bySeq = new Map(batch.map((entry) => [entry.mutationId, entry]));
    for (const result of data.results) {
      const entry = bySeq.get(result.mutationId);
      if (!entry) continue;
      bySeq.delete(result.mutationId);

      if (result.status === "rejected") {
        failOutboxEntry(entry.seq, result.error ?? "Rejected by server");
        if (result.task) saveServerTasks([result.task]);
        changed = true;
        continue;
      }

      if (entry.kind === "create" && result.id && result.id !== entry.entityId) {
        remapTaskId(result.tempId ?? entry.entityId, result.id);
      }
      completeOutboxEntries([entry.seq]);
      if (result.task) saveServerTasks([result.task]);
      changed = true;
    }

    // Anything the server didn't answer for goes back in the queue.
    if (bySeq.size > 0) revertInflightEntries();
  }
}

async function pullChanges(): Promise<boolean> {
  const since = getMeta(LAST_PULLED_META_KEY);
  const query = since ? `?since=${encodeURIComponent(since)}` : "";
  const { data, sentAt, receivedAt } = await requestJson<SyncPullResponse>(`/api/sync/pull${query}`);
  updateClockOffset(sentAt, receivedAt, data.serverNow);
  saveServerTasks(data.tasks);

  const serverTime = Date.parse(data.serverNow);
  if (Number.isFinite(serverTime)) {
    setMeta(LAST_PULLED_META_KEY, new Date(serverTime - PULL_OVERLAP_MS).toISOString());
  }
  return data.tasks.length > 0;
}

function scheduleRetry() {
  if (retryTimer) clearTimeout(retryTimer);
  backoffMs = backoffMs === 0 ? 2_000 : Math.min(backoffMs * 2, MAX_BACKOFF_MS);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void syncNow();
  }, backoffMs);
}

async function runSyncPass() {
  await hydrateLocalStore();
  const token = await getStoredAuthToken();
  if (!token) return;

  setStatus({ syncing: true });
  try {
    const pushed = await pushOutbox();
    const pulled = await pullChanges();
    backoffMs = 0;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    const changed = pushed || pulled;
    if (changed) {
      clearAllTaskSessions();
      clearDedupeCache("tasks:");
      clearDedupeCache("sidebar:");
    }
    setStatus({ lastSyncedAt: Date.now(), lastError: null });
    for (const listener of syncListeners) listener({ changed });
  } catch (error) {
    revertInflightEntries();
    if (error instanceof SyncHttpError && error.status === 401) {
      // apiFetch already cleared the token and notified the auth layer.
      setStatus({ lastError: "Signed out" });
      return;
    }
    setStatus({
      lastError: isNetworkError(error)
        ? "Offline"
        : error instanceof Error
          ? error.message
          : "Sync failed",
    });
    scheduleRetry();
  } finally {
    setStatus({ syncing: false });
    refreshCounts();
  }
}

/** Runs a sync pass now (or joins the one in progress, then runs again). */
export function syncNow(): Promise<void> {
  if (running) {
    rerunRequested = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        rerunRequested = false;
        await runSyncPass();
      } while (rerunRequested);
    } finally {
      running = null;
    }
  })();
  return running;
}

export function requestSync(delayMs = ENQUEUE_DEBOUNCE_MS) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (!isOnline() && getPendingMutationCount() === 0) return;
    void syncNow();
  }, delayMs);
}

export function retryFailedSync() {
  retryFailedEntries();
  refreshCounts();
  void syncNow();
}

/** Drops changes the server rejected; locally created tasks among them are removed. */
export function discardFailedSync() {
  for (const entry of getFailedMutations()) {
    if (entry.kind === "create") patchLocalTask(entry.entityId, { deleted: true });
  }
  discardFailedEntries();
  refreshCounts();
  void syncNow();
}

export function startSyncEngine() {
  if (stopEngine) return stopEngine;

  startNetworkMonitoring();
  void hydrateLocalStore().then(() => {
    refreshCounts();
    requestSync(0);
  });

  const unsubscribeNetwork = subscribeNetworkStatus((online) => {
    setStatus({ online });
    if (online) {
      backoffMs = 0;
      requestSync(0);
    }
  });

  const unsubscribeStore = subscribeLocalStore((event) => {
    if (event.type === "outbox") refreshCounts();
  });

  const appStateSubscription = AppState.addEventListener("change", (state) => {
    if (state === "active") requestSync(0);
  });

  const interval = setInterval(() => requestSync(0), PERIODIC_SYNC_MS);

  stopEngine = () => {
    unsubscribeNetwork();
    unsubscribeStore();
    appStateSubscription.remove();
    clearInterval(interval);
    if (debounceTimer) clearTimeout(debounceTimer);
    if (retryTimer) clearTimeout(retryTimer);
    debounceTimer = null;
    retryTimer = null;
    stopEngine = null;
  };
  return stopEngine;
}

export function stopSyncEngine() {
  stopEngine?.();
}
