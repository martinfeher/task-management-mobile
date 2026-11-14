import type { TaskDetail, TaskItem, TaskListData } from "@/types/todo";

/** Task as cached on the device: list fields plus optional detail fields. */
export type LocalTask = TaskItem &
  Partial<Pick<TaskDetail, "details" | "detailsDoc" | "schemaVersion" | "dueTimeZone">> & {
    deleted?: boolean;
    /** True once the full detail payload (notes) has been fetched or edited locally. */
    hasDetail?: boolean;
  };

/** Task fields that sync as independent last-write-wins registers. */
export type SyncField =
  | "name"
  | "details"
  | "completed"
  | "important"
  | "pinned"
  | "priority"
  | "calendarColor"
  | "dueDate"
  | "dueTimeMinutes"
  | "dueDurationMinutes"
  | "dueRepeat"
  | "listId"
  | "labelIds"
  | "parentId"
  | "isNote";

export type FieldChange = { value: unknown; at: number };

export type FieldChanges = Partial<Record<SyncField, FieldChange>>;

export type OutboxStatus = "pending" | "inflight" | "failed";

export type ReorderPayload = {
  listId: string;
  section: "pinned" | "tasks";
  taskIds: string[];
};

export type OutboxEntry = {
  seq: number;
  mutationId: string;
  kind: "create" | "update" | "delete" | "reorder";
  /** Task id, or `reorder:<listId>:<section>` for reorder entries. */
  entityId: string;
  at: number;
  fields?: FieldChanges;
  reorder?: ReorderPayload;
  status: OutboxStatus;
  attempts: number;
  lastError?: string | null;
};

export type NewOutboxEntry = Omit<OutboxEntry, "seq" | "status" | "attempts" | "lastError">;

export type ViewSnapshot = {
  key: string;
  title: string;
  pinnedIds: string[];
  taskIds: string[];
  fetchedAt: number;
};

/** Task shape returned by the server sync endpoints. */
export type ServerSyncTask = Omit<LocalTask, "deleted" | "hasDetail"> & {
  deletedAt: string | null;
  updatedAt: string;
  details?: string;
};

export type SyncPushResult = {
  mutationId: string;
  status: "applied" | "ignored" | "rejected";
  tempId?: string;
  id?: string;
  error?: string;
  task?: ServerSyncTask | null;
};

export type SyncPushResponse = {
  serverNow: string;
  results: SyncPushResult[];
};

export type SyncPullResponse = {
  serverNow: string;
  tasks: ServerSyncTask[];
};

export type { TaskListData };

export const LOCAL_ID_PREFIX = "local_";

export function isLocalId(id: string) {
  return id.startsWith(LOCAL_ID_PREFIX);
}

export function reorderEntityId(listId: string, section: "pinned" | "tasks") {
  return `reorder:${listId}:${section}`;
}

export function createRandomId() {
  const random = () => Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  return `${Date.now().toString(36)}${random()}${random()}`;
}

export function createLocalTaskId() {
  return `${LOCAL_ID_PREFIX}${createRandomId()}`;
}
