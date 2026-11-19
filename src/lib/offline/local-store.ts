import { loadLocalDb, persistLocalWrites, type LocalDbWrite } from "@/lib/offline/local-db";
import { buildViewData, getViewCacheKey, mergeServerTask } from "@/lib/offline/merge-logic";
import {
  enqueueWithCoalescing,
  hasPendingDelete,
  pendingFieldsFor,
  remapEntryIds,
} from "@/lib/offline/outbox-logic";
import type {
  LocalTask,
  NewOutboxEntry,
  OutboxEntry,
  ServerSyncTask,
  ViewSnapshot,
} from "@/lib/offline/types";
import type { SelectedView, TaskDetail, TaskItem, TaskListData } from "@/types/todo";

export type LocalStoreEvent =
  | { type: "tasks" }
  | { type: "outbox" }
  | { type: "idRemapped"; tempId: string; serverId: string };

type Listener = (event: LocalStoreEvent) => void;

const tasks = new Map<string, LocalTask>();
const views = new Map<string, ViewSnapshot>();
const idMap = new Map<string, string>();
const meta = new Map<string, string>();
let outbox: OutboxEntry[] = [];
let nextSeq = 1;
let hydratePromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function emit(event: LocalStoreEvent) {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.warn("Local store listener failed:", error);
    }
  }
}

export function subscribeLocalStore(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hydrateLocalStore() {
  if (!hydratePromise) {
    hydratePromise = loadLocalDb().then((contents) => {
      for (const task of contents.tasks) tasks.set(task.id, task);
      for (const view of contents.views) views.set(view.key, view);
      for (const [tempId, serverId] of contents.idMap) idMap.set(tempId, serverId);
      for (const [key, value] of Object.entries(contents.meta)) meta.set(key, value);
      outbox = contents.outbox;
      nextSeq = outbox.reduce((max, entry) => Math.max(max, entry.seq), 0) + 1;
    });
  }
  return hydratePromise;
}

function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function dirtyTaskIds() {
  const ids = new Set<string>();
  for (const entry of outbox) {
    if (entry.kind !== "reorder") ids.add(entry.entityId);
  }
  return ids;
}

// ---------- reads ----------

export function resolveTaskId(id: string) {
  return idMap.get(id) ?? id;
}

export function getLocalTask(id: string) {
  return tasks.get(resolveTaskId(id));
}

export function getAllLocalTasks() {
  return [...tasks.values()];
}

export function readLocalView(view: SelectedView): TaskListData | null {
  return buildViewData(
    view,
    views.get(getViewCacheKey(view)) ?? null,
    tasks,
    dirtyTaskIds(),
    todayKey(),
  );
}

export function readLocalTaskDetail(id: string): TaskDetail | null {
  const task = getLocalTask(id);
  if (!task || task.deleted) return null;
  return {
    id: task.id,
    name: task.name,
    completed: task.completed,
    details: task.details ?? "",
    detailsDoc: task.detailsDoc ?? null,
    schemaVersion: task.schemaVersion,
    dueDate: task.dueDate,
    dueTimeMinutes: task.dueTimeMinutes ?? null,
    dueDurationMinutes: task.dueDurationMinutes ?? null,
    dueRepeat: task.dueRepeat ?? null,
    reminderOffsetMinutes: task.reminderOffsetMinutes ?? null,
    dueTimeZone: task.dueTimeZone ?? "floating",
    important: task.important,
    pinned: task.pinned,
    priority: task.priority,
    listId: task.listId,
    listName: task.listName ?? "",
    labels: task.labels,
    calendarColor: task.calendarColor ?? null,
  };
}

export function getOutbox(): readonly OutboxEntry[] {
  return outbox;
}

export function getPendingMutationCount() {
  return outbox.filter((entry) => entry.status !== "failed").length;
}

export function getFailedMutations() {
  return outbox.filter((entry) => entry.status === "failed");
}

export function getMeta(key: string) {
  return meta.get(key) ?? null;
}

export function getMetaJson<T>(key: string): T | null {
  const value = meta.get(key);
  if (value == null) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

// ---------- server data ----------

function mergeFromServer(server: ServerSyncTask, writes: LocalDbWrite[], options?: { keepShape?: boolean }) {
  const id = resolveTaskId(server.id);
  const local = tasks.get(id);
  const merged = mergeServerTask(
    local,
    { ...server, id },
    pendingFieldsFor(outbox, id),
    hasPendingDelete(outbox, id),
  );
  if (local && options?.keepShape) {
    merged.depth = local.depth;
  }
  if (local && !server.listName && local.listName) {
    merged.listName = local.listName;
  }
  tasks.set(id, merged);
  writes.push({ type: "putTasks", tasks: [merged] });
  return merged;
}

function itemToServerTask(item: TaskItem): ServerSyncTask {
  return { ...item, deletedAt: null, updatedAt: "" };
}

/** Stores a freshly fetched view and returns it with local edits applied. */
export function saveServerView(view: SelectedView, data: TaskListData): TaskListData {
  const writes: LocalDbWrite[] = [];
  const keepShape = view.type !== "list";
  for (const item of [...data.pinned, ...data.tasks]) {
    mergeFromServer(itemToServerTask(item), writes, { keepShape });
  }
  const snapshot: ViewSnapshot = {
    key: getViewCacheKey(view),
    title: data.title,
    pinnedIds: data.pinned.map((task) => task.id),
    taskIds: data.tasks.map((task) => task.id),
    fetchedAt: Date.now(),
  };
  views.set(snapshot.key, snapshot);
  writes.push({ type: "putView", view: snapshot });
  persistLocalWrites(writes);
  return readLocalView(view) ?? data;
}

export function saveServerTaskDetail(detail: TaskDetail) {
  const writes: LocalDbWrite[] = [];
  const local = getLocalTask(detail.id);
  mergeFromServer(
    {
      ...detail,
      parentId: local?.parentId ?? null,
      depth: local?.depth ?? 0,
      isNote: local?.isNote,
      deletedAt: null,
      updatedAt: "",
    },
    writes,
  );
  persistLocalWrites(writes);
  return readLocalTaskDetail(detail.id);
}

export function saveServerTasks(serverTasks: ServerSyncTask[]) {
  if (serverTasks.length === 0) return;
  const writes: LocalDbWrite[] = [];
  for (const server of serverTasks) {
    mergeFromServer(server, writes);
  }
  persistLocalWrites(writes);
  emit({ type: "tasks" });
}

// ---------- local edits ----------

export function putLocalTask(task: LocalTask) {
  tasks.set(task.id, task);
  persistLocalWrites([{ type: "putTasks", tasks: [task] }]);
  emit({ type: "tasks" });
}

export function patchLocalTask(id: string, patch: Partial<LocalTask>) {
  const resolved = resolveTaskId(id);
  const current = tasks.get(resolved);
  if (!current) return null;
  const next = { ...current, ...patch, id: resolved };
  tasks.set(resolved, next);
  persistLocalWrites([{ type: "putTasks", tasks: [next] }]);
  emit({ type: "tasks" });
  return next;
}

export function setLocalViewOrder(view: SelectedView, section: "pinned" | "tasks", ids: string[]) {
  const key = getViewCacheKey(view);
  const current = views.get(key);
  const snapshot: ViewSnapshot = {
    key,
    title: current?.title ?? "",
    pinnedIds: section === "pinned" ? ids : (current?.pinnedIds ?? []),
    taskIds: section === "tasks" ? ids : (current?.taskIds ?? []),
    fetchedAt: current?.fetchedAt ?? Date.now(),
  };
  views.set(key, snapshot);
  persistLocalWrites([{ type: "putView", view: snapshot }]);
}

// ---------- outbox ----------

export function enqueueMutation(entry: NewOutboxEntry) {
  const result = enqueueWithCoalescing(outbox, entry, nextSeq);
  if (result.upserted.some((upserted) => upserted.seq === nextSeq)) {
    nextSeq += 1;
  }
  outbox = result.entries;
  persistLocalWrites([
    ...(result.removedSeqs.length > 0 ? [{ type: "deleteOutbox" as const, seqs: result.removedSeqs }] : []),
    ...(result.upserted.length > 0 ? [{ type: "putOutbox" as const, entries: result.upserted }] : []),
  ]);
  emit({ type: "outbox" });
}

function updateEntries(seqs: number[], update: (entry: OutboxEntry) => OutboxEntry) {
  const seqSet = new Set(seqs);
  const changed: OutboxEntry[] = [];
  outbox = outbox.map((entry) => {
    if (!seqSet.has(entry.seq)) return entry;
    const next = update(entry);
    changed.push(next);
    return next;
  });
  persistLocalWrites([{ type: "putOutbox", entries: changed }]);
  emit({ type: "outbox" });
}

/** Takes the oldest pending entries and marks them in flight. */
export function takeOutboxBatch(limit: number) {
  const batch = outbox.filter((entry) => entry.status === "pending").slice(0, limit);
  if (batch.length === 0) return [];
  updateEntries(
    batch.map((entry) => entry.seq),
    (entry) => ({ ...entry, status: "inflight", attempts: entry.attempts + 1 }),
  );
  const seqs = new Set(batch.map((entry) => entry.seq));
  return outbox.filter((entry) => seqs.has(entry.seq));
}

export function completeOutboxEntries(seqs: number[]) {
  if (seqs.length === 0) return;
  const seqSet = new Set(seqs);
  outbox = outbox.filter((entry) => !seqSet.has(entry.seq));
  persistLocalWrites([{ type: "deleteOutbox", seqs }]);
  emit({ type: "outbox" });
}

export function revertInflightEntries() {
  const inflight = outbox.filter((entry) => entry.status === "inflight").map((entry) => entry.seq);
  if (inflight.length === 0) return;
  updateEntries(inflight, (entry) => ({ ...entry, status: "pending" }));
}

export function failOutboxEntry(seq: number, error: string) {
  updateEntries([seq], (entry) => ({ ...entry, status: "failed", lastError: error }));
}

export function retryFailedEntries() {
  const failed = outbox.filter((entry) => entry.status === "failed").map((entry) => entry.seq);
  if (failed.length === 0) return;
  updateEntries(failed, (entry) => ({ ...entry, status: "pending", lastError: null }));
}

export function discardFailedEntries() {
  const failed = outbox.filter((entry) => entry.status === "failed").map((entry) => entry.seq);
  completeOutboxEntries(failed);
}

/** Moves everything keyed by a temporary id onto the id the server assigned. */
export function remapTaskId(tempId: string, serverId: string) {
  if (tempId === serverId) return;
  const writes: LocalDbWrite[] = [];

  idMap.set(tempId, serverId);
  writes.push({ type: "putIdMap", tempId, serverId });

  const task = tasks.get(tempId);
  if (task) {
    tasks.delete(tempId);
    const moved = { ...task, id: serverId };
    tasks.set(serverId, moved);
    writes.push({ type: "deleteTasks", ids: [tempId] }, { type: "putTasks", tasks: [moved] });
  }

  const childWrites: LocalTask[] = [];
  for (const child of tasks.values()) {
    if (child.parentId === tempId) {
      const next = { ...child, parentId: serverId };
      tasks.set(child.id, next);
      childWrites.push(next);
    }
  }
  if (childWrites.length > 0) writes.push({ type: "putTasks", tasks: childWrites });

  for (const view of views.values()) {
    if (!view.pinnedIds.includes(tempId) && !view.taskIds.includes(tempId)) continue;
    const swap = (ids: string[]) => ids.map((id) => (id === tempId ? serverId : id));
    const next = { ...view, pinnedIds: swap(view.pinnedIds), taskIds: swap(view.taskIds) };
    views.set(view.key, next);
    writes.push({ type: "putView", view: next });
  }

  const remapped = remapEntryIds(outbox, tempId, serverId);
  outbox = remapped.entries;
  if (remapped.changed.length > 0) writes.push({ type: "putOutbox", entries: remapped.changed });

  persistLocalWrites(writes);
  emit({ type: "idRemapped", tempId, serverId });
  emit({ type: "tasks" });
}

// ---------- meta ----------

export function setMeta(key: string, value: string) {
  meta.set(key, value);
  persistLocalWrites([{ type: "putMeta", key, value }]);
}

export function setMetaJson(key: string, value: unknown) {
  setMeta(key, JSON.stringify(value));
}

export function clearLocalStore() {
  tasks.clear();
  views.clear();
  idMap.clear();
  meta.clear();
  outbox = [];
  nextSeq = 1;
  persistLocalWrites([{ type: "clear" }]);
  emit({ type: "outbox" });
  emit({ type: "tasks" });
}
