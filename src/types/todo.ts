import type { TaskDoc } from "@/lib/task-document";

export type SidebarListItem = {
  id: string;
  name: string;
  taskCount: number;
};

export type SidebarLabelItem = {
  id: string;
  label: string;
  taskCount: number;
  color?: string | null;
};

export type SidebarData = {
  lists: SidebarListItem[];
  labels: SidebarLabelItem[];
  counts: {
    today: number;
    important: number;
  };
};

export type TaskLabel = {
  id: string;
  label: string;
  color?: string | null;
};

export type TaskItem = {
  id: string;
  name: string;
  completed: boolean;
  dueDate: string | null;
  dueTimeMinutes?: number | null;
  dueDurationMinutes?: number | null;
  calendarColor?: string | null;
  pinned: boolean;
  important: boolean;
  priority: number | null;
  parentId: string | null;
  depth: number;
  labels: TaskLabel[];
  listId: string;
  listName?: string;
};

export type SearchTask = {
  id: string;
  name: string;
  completed: boolean;
  details: string;
  hasDetails: boolean;
  dueDate: string | null;
  pinned: boolean;
  important: boolean;
  parentId: string | null;
  listId: string;
  listName: string;
};

export type TaskListData = {
  title: string;
  pinned: TaskItem[];
  tasks: TaskItem[];
};

export type TaskDetail = {
  id: string;
  name: string;
  completed: boolean;
  details: string;
  /**
   * Canonical ProseMirror/Tiptap-style document for `details`, when the
   * server has computed one (see `todolistWeb`'s `Task.detailsDoc`). This is
   * the long-term single source of truth for rich formatting; `details` HTML
   * is kept as the legacy/edit-surface representation. May be absent for
   * tasks saved before this field was exposed by the API — always validate
   * with `validateTaskDoc` before trusting it, and fall back to
   * `htmlToDoc(details)` when missing or invalid.
   */
  detailsDoc?: TaskDoc | null;
  /** Schema version of `detailsDoc` (see `CURRENT_SCHEMA_VERSION`). */
  schemaVersion?: number;
  dueDate: string | null;
  dueTimeMinutes: number | null;
  dueDurationMinutes: number | null;
  dueTimeZone: string;
  important: boolean;
  pinned: boolean;
  priority: number | null;
  listId: string;
  listName: string;
  labels: TaskLabel[];
};

export type SelectedView =
  | { type: "today" }
  | { type: "important" }
  | { type: "list"; id: string }
  | { type: "label"; id: string }
  | { type: "calendar" };
