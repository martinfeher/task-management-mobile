import type { LocalTask, ServerSyncTask, SyncField, ViewSnapshot } from "@/lib/offline/types";
import type { SelectedView, TaskItem, TaskListData } from "@/types/todo";

/** Local task keys that hold the value of each sync field. */
const FIELD_KEYS: Record<SyncField, (keyof LocalTask)[]> = {
  name: ["name"],
  details: ["details", "detailsDoc", "schemaVersion"],
  completed: ["completed"],
  important: ["important"],
  pinned: ["pinned"],
  priority: ["priority"],
  calendarColor: ["calendarColor"],
  dueDate: ["dueDate"],
  dueTimeMinutes: ["dueTimeMinutes"],
  dueDurationMinutes: ["dueDurationMinutes"],
  dueRepeat: ["dueRepeat"],
  listId: ["listId", "listName"],
  labelIds: ["labels"],
  parentId: ["parentId", "depth"],
  isNote: ["isNote"],
};

export function serverTaskToLocal(server: ServerSyncTask, previous?: LocalTask): LocalTask {
  const { deletedAt, updatedAt: _updatedAt, ...rest } = server;
  const hasDetail = typeof server.details === "string" || previous?.hasDetail === true;
  return {
    ...previous,
    ...rest,
    dueRepeat: previous?.dueRepeat ?? null,
    deleted: deletedAt != null,
    hasDetail,
  };
}

/**
 * Applies a server copy of a task without clobbering fields that still have
 * unsent local edits. A pending local delete always keeps the task hidden.
 */
export function mergeServerTask(
  local: LocalTask | undefined,
  server: ServerSyncTask,
  pendingFields: Set<SyncField>,
  pendingDelete: boolean,
): LocalTask {
  const merged = serverTaskToLocal(server, local);
  if (local) {
    for (const field of pendingFields) {
      for (const key of FIELD_KEYS[field]) {
        (merged as Record<string, unknown>)[key] = local[key];
      }
    }
  }
  if (pendingDelete) {
    merged.deleted = true;
  }
  return merged;
}

export function getViewCacheKey(view: SelectedView) {
  if (view.type === "list") return `list:${view.id}`;
  if (view.type === "label") return `label:${view.id}`;
  return view.type;
}

function toLocalDateKey(value: string | null | undefined) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function taskMatchesView(task: LocalTask, view: SelectedView, todayKey: string) {
  if (task.deleted || task.completed) return false;
  switch (view.type) {
    case "list":
      return task.listId === view.id;
    case "label":
      return task.labels.some((label) => label.id === view.id);
    case "important":
      return task.important;
    case "calendar":
      return task.dueDate != null;
    case "today":
      return toLocalDateKey(task.dueDate) === todayKey;
  }
}

function toTaskItem(task: LocalTask): TaskItem {
  const {
    deleted: _deleted,
    hasDetail: _hasDetail,
    details: _details,
    detailsDoc: _detailsDoc,
    schemaVersion: _schemaVersion,
    ...item
  } = task;
  return item;
}

/**
 * Builds a view from the last server snapshot plus local edits: tasks with
 * unsent changes are re-checked against the view and locally created tasks
 * that belong to it are added.
 */
export function buildViewData(
  view: SelectedView,
  snapshot: ViewSnapshot | null,
  tasksById: Map<string, LocalTask>,
  dirtyIds: Set<string>,
  todayKey: string,
): TaskListData | null {
  if (!snapshot && dirtyIds.size === 0) return null;

  const usesPinnedSection = view.type === "list";
  const seen = new Set<string>();
  const pinned: TaskItem[] = [];
  const tasks: TaskItem[] = [];

  const place = (task: LocalTask, preferredSection: "pinned" | "tasks") => {
    const section =
      usesPinnedSection && task.depth === 0
        ? task.pinned
          ? "pinned"
          : "tasks"
        : usesPinnedSection
          ? preferredSection
          : "tasks";
    (section === "pinned" ? pinned : tasks).push(toTaskItem(task));
  };

  const addFromSnapshot = (ids: string[], section: "pinned" | "tasks") => {
    for (const id of ids) {
      const task = tasksById.get(id);
      if (!task || seen.has(id)) continue;
      seen.add(id);
      if (task.deleted) continue;
      if (dirtyIds.has(id) && !taskMatchesView(task, view, todayKey)) continue;
      place(task, section);
    }
  };

  if (snapshot) {
    addFromSnapshot(snapshot.pinnedIds, "pinned");
    addFromSnapshot(snapshot.taskIds, "tasks");
  }

  const added: LocalTask[] = [];
  for (const id of dirtyIds) {
    if (seen.has(id)) continue;
    const task = tasksById.get(id);
    if (!task || !taskMatchesView(task, view, todayKey)) continue;
    if (
      usesPinnedSection &&
      task.parentId &&
      !seen.has(task.parentId) &&
      !added.some((entry) => entry.id === task.parentId)
    ) {
      continue;
    }
    added.push(task);
  }

  for (const task of added) {
    const item = toTaskItem(usesPinnedSection ? task : { ...task, depth: 0 });
    const target = usesPinnedSection && task.depth === 0 && task.pinned ? pinned : tasks;
    if (usesPinnedSection && task.parentId) {
      const parentIndex = target.findIndex((entry) => entry.id === task.parentId);
      if (parentIndex >= 0) {
        target.splice(parentIndex + 1, 0, item);
        continue;
      }
    }
    if (view.type === "list" && target === tasks) {
      target.unshift(item);
    } else {
      target.push(item);
    }
  }

  if (view.type === "calendar") {
    tasks.sort((a, b) => {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return aTime - bTime;
    });
  }

  return {
    title: snapshot?.title ?? "",
    pinned,
    tasks,
  };
}
