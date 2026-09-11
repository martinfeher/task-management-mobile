import type { SelectedView, SidebarData, TaskListData } from "@/types/todo";

const TASKS_TTL_MS = 30_000;
const SIDEBAR_TTL_MS = 30_000;

type SessionStore = {
  sidebar: SidebarData | null;
  sidebarFetchedAt: number;
  tasksByViewKey: Map<string, { data: TaskListData; fetchedAt: number }>;
};

const STORE_KEY = "__todoSdk57AppDataSession";

function getStore(): SessionStore {
  const globalScope = globalThis as typeof globalThis & {
    [STORE_KEY]?: SessionStore;
  };

  if (!globalScope[STORE_KEY]) {
    globalScope[STORE_KEY] = {
      sidebar: null,
      sidebarFetchedAt: 0,
      tasksByViewKey: new Map(),
    };
  }

  return globalScope[STORE_KEY];
}

export function getSelectedViewKey(view: SelectedView | null) {
  if (!view) return null;
  if (view.type === "list" || view.type === "label") {
    return `${view.type}:${view.id}`;
  }
  return view.type;
}

export function readSidebarSession() {
  const store = getStore();
  if (!store.sidebar) return null;
  if (Date.now() - store.sidebarFetchedAt > SIDEBAR_TTL_MS) {
    store.sidebar = null;
    store.sidebarFetchedAt = 0;
    return null;
  }
  return store.sidebar;
}

export function writeSidebarSession(sidebar: SidebarData) {
  const store = getStore();
  store.sidebar = sidebar;
  store.sidebarFetchedAt = Date.now();
}

export function readTasksSession(view: SelectedView) {
  const key = getSelectedViewKey(view);
  if (!key) return null;

  const entry = getStore().tasksByViewKey.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > TASKS_TTL_MS) {
    getStore().tasksByViewKey.delete(key);
    return null;
  }

  return entry.data;
}

export function writeTasksSession(view: SelectedView, data: TaskListData) {
  const key = getSelectedViewKey(view);
  if (!key) return;
  getStore().tasksByViewKey.set(key, {
    data,
    fetchedAt: Date.now(),
  });
}

export function clearTasksSession(view?: SelectedView) {
  const store = getStore();
  if (!view) {
    store.tasksByViewKey.clear();
    return;
  }

  const key = getSelectedViewKey(view);
  if (key) {
    store.tasksByViewKey.delete(key);
  }
}

export function clearAllTaskSessions() {
  getStore().tasksByViewKey.clear();
}
