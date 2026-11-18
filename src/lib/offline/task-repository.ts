import * as api from "@/lib/api";
import { clearAllTaskSessions } from "@/lib/app-data-session";
import {
  enqueueMutation,
  getLocalTask,
  getAllLocalTasks,
  getMeta,
  getMetaJson,
  hydrateLocalStore,
  patchLocalTask,
  putLocalTask,
  readLocalTaskDetail,
  readLocalView,
  resolveTaskId,
  saveServerTaskDetail,
  saveServerView,
  setLocalViewOrder,
  setMetaJson,
} from "@/lib/offline/local-store";
import { isNetworkError, isOnline } from "@/lib/offline/network-status";
import { extractPreviewImage } from "@/lib/task-preview-image";
import { CLOCK_OFFSET_META_KEY, requestSync, syncNow } from "@/lib/offline/sync-engine";
import {
  createLocalTaskId,
  createRandomId,
  isLocalId,
  reorderEntityId,
  type FieldChanges,
  type LocalTask,
  type SyncField,
} from "@/lib/offline/types";
import type {
  SelectedView,
  SidebarData,
  TaskDetail,
  TaskItem,
  TaskLabel,
  TaskListData,
} from "@/types/todo";

const SIDEBAR_CACHE_KEY = "cache:sidebar";
const LABELS_CACHE_KEY = "cache:labels";
const CREATE_SYNC_TIMEOUT_MS = 6_000;

export class OfflineUnavailableError extends Error {
  constructor(message = "Available when online") {
    super(message);
    this.name = "OfflineUnavailableError";
  }
}

/** Device time corrected by the offset measured against the server clock. */
export function syncTimestamp() {
  const offset = Number(getMeta(CLOCK_OFFSET_META_KEY) ?? 0);
  return Date.now() + (Number.isFinite(offset) ? offset : 0);
}

function afterLocalWrite() {
  clearAllTaskSessions();
  requestSync();
}

function isNotFoundError(error: unknown) {
  return error instanceof Error && /\(404\)/.test(error.message);
}

/** Makes sure the task is cached locally before a local edit is applied to it. */
async function ensureLocalTask(taskId: string): Promise<LocalTask> {
  await hydrateLocalStore();
  const id = resolveTaskId(taskId);
  const existing = getLocalTask(id);
  if (existing) return existing;

  if (isLocalId(id) || !isOnline()) {
    throw new OfflineUnavailableError("This task isn't available offline yet");
  }

  saveServerTaskDetail(await api.fetchTaskDetail(id));
  const fetched = getLocalTask(id);
  if (!fetched) throw new Error("Task not found");
  return fetched;
}

async function applyFieldUpdate(
  taskId: string,
  patch: Partial<LocalTask>,
  values: Partial<Record<SyncField, unknown>>,
) {
  const task = await ensureLocalTask(taskId);
  const at = syncTimestamp();
  const fields: FieldChanges = {};
  for (const [field, value] of Object.entries(values) as [SyncField, unknown][]) {
    fields[field] = { value, at };
  }
  const updated = patchLocalTask(task.id, patch) ?? task;
  enqueueMutation({
    mutationId: createRandomId(),
    kind: "update",
    entityId: task.id,
    at,
    fields,
  });
  afterLocalWrite();
  return updated;
}

// ---------- cached online-only data ----------

export async function fetchSidebarData(options?: { force?: boolean }): Promise<SidebarData> {
  await hydrateLocalStore();
  try {
    const sidebar = await api.fetchSidebarData(options);
    setMetaJson(SIDEBAR_CACHE_KEY, sidebar);
    return sidebar;
  } catch (error) {
    const cached = getMetaJson<SidebarData>(SIDEBAR_CACHE_KEY);
    if (cached) return cached;
    throw error;
  }
}

export function readCachedSidebarData() {
  return getMetaJson<SidebarData>(SIDEBAR_CACHE_KEY);
}

export async function fetchLabels(): Promise<TaskLabel[]> {
  await hydrateLocalStore();
  try {
    const labels = await api.fetchLabels();
    setMetaJson(LABELS_CACHE_KEY, labels);
    return labels;
  } catch (error) {
    const cached = getMetaJson<TaskLabel[]>(LABELS_CACHE_KEY);
    if (cached) return cached;
    throw error;
  }
}

function findLabel(labelId: string): TaskLabel | null {
  const labels = getMetaJson<TaskLabel[]>(LABELS_CACHE_KEY) ?? [];
  const label = labels.find((entry) => entry.id === labelId);
  if (label) return label;
  const sidebarLabel = readCachedSidebarData()?.labels.find((entry) => entry.id === labelId);
  return sidebarLabel
    ? { id: sidebarLabel.id, label: sidebarLabel.label, color: sidebarLabel.color ?? null }
    : null;
}

function findListName(listId: string) {
  return readCachedSidebarData()?.lists.find((list) => list.id === listId)?.name ?? null;
}

// ---------- reads ----------

/** Last known copy of a view (server snapshot plus local edits), without touching the network. */
export async function readCachedTasks(view: SelectedView): Promise<TaskListData | null> {
  await hydrateLocalStore();
  return readLocalView(view);
}

export async function fetchTasks(
  view: SelectedView,
  options?: { force?: boolean },
): Promise<TaskListData> {
  await hydrateLocalStore();

  if (isOnline()) {
    try {
      const data = await api.fetchTasks(view, options);
      return saveServerView(view, data);
    } catch (error) {
      const cached = readLocalView(view);
      if (cached) return cached;
      throw error;
    }
  }

  const cached = readLocalView(view);
  if (cached) return cached;
  throw new OfflineUnavailableError("You're offline and this view hasn't been loaded on this device yet");
}

export async function fetchTaskDetail(taskId: string): Promise<TaskDetail> {
  await hydrateLocalStore();
  const id = resolveTaskId(taskId);

  if (!isLocalId(id) && isOnline()) {
    try {
      const detail = await api.fetchTaskDetail(id);
      return saveServerTaskDetail(detail) ?? detail;
    } catch (error) {
      if (isNotFoundError(error)) {
        patchLocalTask(id, { deleted: true });
        throw error;
      }
      const local = readLocalTaskDetail(id);
      if (local && (isNetworkError(error) || !isOnline() || getLocalTask(id)?.hasDetail)) {
        return local;
      }
      throw error;
    }
  }

  const local = readLocalTaskDetail(id);
  if (local) return local;
  throw new OfflineUnavailableError("This task isn't available offline yet");
}

// ---------- writes ----------

export async function createTask(input: {
  name: string;
  listId: string;
  dueDate?: string | null;
  details?: string;
  priority?: number | null;
  labelIds?: string[];
  parentId?: string | null;
}): Promise<TaskItem> {
  await hydrateLocalStore();
  const id = createLocalTaskId();
  const parentId = input.parentId ? resolveTaskId(input.parentId) : null;
  const parent = parentId ? getLocalTask(parentId) : undefined;
  const listId = parent?.listId ?? input.listId;
  const labels = (input.labelIds ?? [])
    .map((labelId) => findLabel(labelId))
    .filter((label): label is TaskLabel => label != null);

  const task: LocalTask = {
    id,
    name: input.name,
    completed: false,
    dueDate: input.dueDate ?? null,
    dueTimeMinutes: null,
    dueDurationMinutes: null,
    dueRepeat: null,
    calendarColor: null,
    pinned: false,
    important: false,
    priority: input.priority ?? null,
    parentId,
    depth: parentId ? 1 : 0,
    labels,
    listId,
    listName: parent?.listName ?? findListName(listId) ?? undefined,
    details: input.details ?? "",
    detailsDoc: null,
    hasDetail: true,
  };
  putLocalTask(task);

  const at = syncTimestamp();
  const fields: FieldChanges = {
    name: { value: input.name, at },
    listId: { value: listId, at },
  };
  if (parentId) fields.parentId = { value: parentId, at };
  if (input.dueDate) fields.dueDate = { value: input.dueDate, at };
  if (input.details) fields.details = { value: input.details, at };
  if (input.priority != null) fields.priority = { value: input.priority, at };
  if (labels.length > 0) fields.labelIds = { value: labels.map((label) => label.id), at };

  enqueueMutation({ mutationId: createRandomId(), kind: "create", entityId: id, at, fields });
  clearAllTaskSessions();

  if (isOnline()) {
    await Promise.race([
      syncNow().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, CREATE_SYNC_TIMEOUT_MS)),
    ]);
  } else {
    requestSync();
  }

  const saved = getLocalTask(id) ?? task;
  const { deleted: _deleted, hasDetail: _hasDetail, details: _details, detailsDoc: _doc, schemaVersion: _version, ...item } = saved;
  return item;
}

export async function createSubtask(parentId: string, name: string) {
  const parent = await ensureLocalTask(parentId);
  return createTask({ name, listId: parent.listId, parentId: parent.id });
}

export async function toggleTaskCompleted(taskId: string, completed: boolean) {
  await applyFieldUpdate(taskId, { completed }, { completed });
}

export async function toggleTaskImportant(taskId: string, important: boolean) {
  await applyFieldUpdate(taskId, { important }, { important });
}

export async function updateTaskPinned(taskId: string, pinned: boolean) {
  await applyFieldUpdate(taskId, { pinned }, { pinned });
}

export async function updateTaskPriority(taskId: string, priority: number | null) {
  await applyFieldUpdate(taskId, { priority }, { priority });
}

export async function updateTaskCalendarColor(taskId: string, calendarColor: string) {
  const task = await applyFieldUpdate(taskId, { calendarColor }, { calendarColor });
  return { id: task.id, calendarColor: task.calendarColor ?? null };
}

export async function toggleTaskLabel(
  taskId: string,
  labelId: string,
  assigned: boolean,
): Promise<TaskLabel[]> {
  const task = await ensureLocalTask(taskId);
  const withoutLabel = task.labels.filter((label) => label.id !== labelId);
  let labels = withoutLabel;
  if (assigned) {
    const label = findLabel(labelId) ?? task.labels.find((entry) => entry.id === labelId);
    if (!label) {
      if (!isOnline()) throw new OfflineUnavailableError();
      await fetchLabels();
    }
    const resolved = label ?? findLabel(labelId);
    if (!resolved) throw new Error("Label not found");
    labels = [...withoutLabel, resolved].sort((a, b) => a.label.localeCompare(b.label));
  }
  await applyFieldUpdate(task.id, { labels }, { labelIds: labels.map((label) => label.id) });
  return labels;
}

export async function moveTaskToList(
  taskId: string,
  listId: string,
): Promise<{ listId: string; listName: string }> {
  const task = await ensureLocalTask(taskId);
  const listName = findListName(listId) ?? (task.listId === listId ? (task.listName ?? "") : "");
  await applyFieldUpdate(task.id, { listId, listName }, { listId });
  for (const child of getAllLocalTasks()) {
    if (child.parentId === task.id) patchLocalTask(child.id, { listId, listName });
  }
  return { listId, listName };
}

export async function updateTaskName(taskId: string, name: string) {
  await applyFieldUpdate(taskId, { name }, { name });
}

export async function updateTaskDetails(taskId: string, details: string) {
  await applyFieldUpdate(
    taskId,
    { details, detailsDoc: null, hasDetail: true, previewImage: extractPreviewImage(details) },
    { details },
  );
}

export async function updateTaskSchedule(
  taskId: string,
  update: {
    dueDate?: string | null;
    dueTimeMinutes?: number | null;
    dueDurationMinutes?: number | null;
    dueRepeat?: string | null;
  },
) {
  const patch: Partial<LocalTask> = {};
  const values: Partial<Record<SyncField, unknown>> = {};
  if (update.dueDate !== undefined) {
    patch.dueDate = update.dueDate;
    values.dueDate = update.dueDate;
  }
  if (update.dueTimeMinutes !== undefined) {
    patch.dueTimeMinutes = update.dueTimeMinutes;
    values.dueTimeMinutes = update.dueTimeMinutes;
  }
  if (update.dueDurationMinutes !== undefined) {
    patch.dueDurationMinutes = update.dueDurationMinutes;
    values.dueDurationMinutes = update.dueDurationMinutes;
  }
  if (update.dueRepeat !== undefined) {
    patch.dueRepeat = update.dueRepeat as LocalTask["dueRepeat"];
    values.dueRepeat = update.dueRepeat;
  }
  const task = await applyFieldUpdate(taskId, patch, values);
  return {
    id: task.id,
    dueDate: task.dueDate,
    dueTimeMinutes: task.dueTimeMinutes ?? null,
    dueDurationMinutes: task.dueDurationMinutes ?? null,
    dueRepeat: task.dueRepeat ?? null,
    dueTimeZone: task.dueTimeZone ?? "floating",
  };
}

export async function updateTaskDueDate(taskId: string, dueDate: string | null) {
  return updateTaskSchedule(taskId, { dueDate });
}

export async function reorderTasks(input: {
  listId: string;
  section: "pinned" | "tasks";
  taskIds: string[];
}) {
  await hydrateLocalStore();
  const taskIds = input.taskIds.map(resolveTaskId);
  setLocalViewOrder({ type: "list", id: input.listId }, input.section, taskIds);
  enqueueMutation({
    mutationId: createRandomId(),
    kind: "reorder",
    entityId: reorderEntityId(input.listId, input.section),
    at: syncTimestamp(),
    reorder: { listId: input.listId, section: input.section, taskIds },
  });
  afterLocalWrite();
}

export async function deleteTask(taskId: string) {
  const task = await ensureLocalTask(taskId);
  patchLocalTask(task.id, { deleted: true });
  for (const child of getAllLocalTasks()) {
    if (child.parentId === task.id) patchLocalTask(child.id, { deleted: true });
  }
  enqueueMutation({
    mutationId: createRandomId(),
    kind: "delete",
    entityId: task.id,
    at: syncTimestamp(),
  });
  afterLocalWrite();
}

/** File uploads can't be queued; they need the server id and a live connection. */
export async function uploadTaskVoiceNote(
  taskId: string,
  file: { uri: string; name: string; type: string },
) {
  const id = resolveTaskId(taskId);
  if (!isOnline() || isLocalId(id)) {
    throw new OfflineUnavailableError();
  }
  return api.uploadTaskVoiceNote(id, file);
}

export { resolveTaskId };
