import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { router, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";

import {
  readSidebarSession,
  readTasksSession,
  writeSidebarSession,
  writeTasksSession,
  getSelectedViewKey,
} from "@/lib/app-data-session";
import { reorderSidebarTopLevel as reorderSidebarTopLevelRequest } from "@/lib/api";
import { getLocalTask, subscribeLocalStore } from "@/lib/offline/local-store";
import { startSyncEngine, subscribeSyncEvents } from "@/lib/offline/sync-engine";
import {
  createTask as createTaskRequest,
  deleteTask as deleteTaskRequest,
  fetchSidebarData,
  fetchTasks,
  readCachedSidebarData,
  readCachedTasks,
  reorderTasks as reorderTasksRequest,
  toggleTaskCompleted as toggleTaskCompletedRequest,
} from "@/lib/offline/task-repository";
import { findInboxList } from "@/lib/inbox-list";
import {
  computeSidebarTopLevelAfterReorder,
  getSidebarTopLevelPositionUpdates,
} from "@/lib/sidebar-list-layout";
import { normalizeTaskRepeat } from "@/lib/task-repeat";
import type {
  SelectedView,
  SidebarData,
  TaskItem,
  TaskListData,
} from "@/types/todo";

function isSameSelectedView(a: SelectedView | null, b: SelectedView) {
  if (!a || a.type !== b.type) return false;
  if (a.type === "list" || a.type === "label") {
    return b.type === a.type && a.id === b.id;
  }
  return true;
}

function getTodayDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type CreateTaskInput = {
  name: string;
  description?: string;
  dueDate?: string | null;
  priority?: number | null;
  labelIds?: string[];
  listId?: string;
};

export type ComposerDraft = {
  dueDate?: string | null;
  listId?: string;
  priority?: number | null;
  labelIds?: string[];
};

type AppContextValue = {
  sidebarData: SidebarData | null;
  sidebarLoading: boolean;
  sidebarRefreshing: boolean;
  sidebarError: string | null;
  selectedView: SelectedView | null;
  taskData: TaskListData | null;
  taskLoading: boolean;
  taskRefreshing: boolean;
  taskError: string | null;
  addTaskComposerOpen: boolean;
  addTaskStayOnPage: boolean;
  composerDraft: ComposerDraft | null;
  taskAddedToast: string | null;
  addTaskComposerHeight: number;
  lastTabHref: string;
  loadSidebar: (isRefresh?: boolean) => Promise<void>;
  selectView: (view: SelectedView, options?: { goToTasks?: boolean }) => void;
  /** Select a sidebar view, animate the lists drawer closed, then open Tasks. */
  selectViewFromDrawer: (view: SelectedView) => void;
  flushDrawerCloseAction: () => void;
  loadTasksForView: (view: SelectedView, isRefresh?: boolean) => Promise<void>;
  openTask: (
    task: TaskItem,
    options?: { fromCalendar?: boolean; fromUpcoming?: boolean },
  ) => void;
  handleTaskCompleted: (taskId?: string) => void;
  completeTask: (taskId: string) => Promise<void>;
  uncompleteTask: (taskId: string) => Promise<void>;
  /** The task whose completion can currently be undone from the bottom toast. */
  completionUndo: CompletionUndo | null;
  /** Offers an undo toast for a task that was just completed. */
  showCompletionUndo: (taskId: string, taskName: string) => void;
  dismissCompletionUndo: () => void;
  /** Re-opens the task from the undo toast and refreshes the lists. */
  undoCompletion: () => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<string | null>;
  openAddTaskComposer: (draft?: ComposerDraft) => void;
  closeAddTaskComposer: () => void;
  startAddingTask: (options?: { stayOnPage?: boolean; draft?: ComposerDraft }) => void;
  clearTaskAddedToast: () => void;
  setAddTaskComposerHeight: (height: number) => void;
  openSearchModal: () => void;
  suppressNextSearchOpen: () => void;
  consumeSearchOpenSuppressed: () => boolean;
  setLastTabHref: (href: string) => void;
  listsDrawerOpen: boolean;
  setListsDrawerOpen: (open: boolean) => void;
  /** Stable handler for drawer swipe-open; must not be recreated each render. */
  openListsDrawerPanel: () => void;
  closeListsDrawer: (options?: { goToTasksTab?: boolean }) => void;
  /** Close the lists drawer and open Tasks for the current drawer selection. */
  openTasksForDrawerSelection: () => void;
  /** Navigate to Lists tab (drawer opens from there). */
  openListsDrawer: () => void;
  /** Slide the lists drawer open (used when the Lists tab gains focus). */
  animateListsDrawerOpen: () => void;
  reorderSidebarTopLevel: (sourceIndex: number, dropIndex: number) => void;
  reorderTasks: (section: "tasks" | "pinned", tasks: TaskItem[]) => void;
  calendarTasks: TaskItem[];
  calendarLoading: boolean;
  calendarRefreshing: boolean;
  loadCalendarTasks: (isRefresh?: boolean) => Promise<void>;
  patchCalendarTask: (taskId: string, patch: Partial<TaskItem>) => void;
  replaceCalendarTasks: (tasks: TaskItem[]) => void;
  calendarColorEpoch: number;
  setCalendarTaskColor: (taskId: string, calendarColor: string) => void;
};

export type CompletionUndo = {
  taskId: string;
  taskName: string;
  /** Changes on every completion so the toast restarts its countdown. */
  token: number;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarData, setSidebarData] = useState<SidebarData | null>(null);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [sidebarRefreshing, setSidebarRefreshing] = useState(false);
  const [sidebarError, setSidebarError] = useState<string | null>(null);

  const [selectedView, setSelectedView] = useState<SelectedView | null>(null);
  const [taskData, setTaskData] = useState<TaskListData | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskRefreshing, setTaskRefreshing] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [addTaskComposerOpen, setAddTaskComposerOpen] = useState(false);
  const [addTaskStayOnPage, setAddTaskStayOnPage] = useState(false);
  const [composerDraft, setComposerDraft] = useState<ComposerDraft | null>(null);
  const [taskAddedToast, setTaskAddedToast] = useState<string | null>(null);
  const [completionUndo, setCompletionUndo] = useState<CompletionUndo | null>(null);
  const completionUndoTokenRef = useRef(0);
  const [addTaskComposerHeight, setAddTaskComposerHeight] = useState(0);
  const [lastTabHref, setLastTabHref] = useState("/");
  const lastTabHrefRef = useRef("/");
  const selectedViewRef = useRef<SelectedView | null>(null);
  const sidebarDataRef = useRef<SidebarData | null>(null);
  const taskDataRef = useRef<TaskListData | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressSearchOpenRef = useRef(false);
  const suppressSearchOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [listsDrawerOpen, setListsDrawerOpen] = useState(false);
  const listsDrawerOpenRef = useRef(false);
  const pendingAfterDrawerCloseRef = useRef<(() => void) | null>(null);
  const skipNextSelectedViewLoadRef = useRef(false);
  const [calendarTasks, setCalendarTasks] = useState<TaskItem[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarRefreshing, setCalendarRefreshing] = useState(false);
  const [calendarColorEpoch, setCalendarColorEpoch] = useState(0);

  selectedViewRef.current = selectedView;
  sidebarDataRef.current = sidebarData;
  taskDataRef.current = taskData;
  lastTabHrefRef.current = lastTabHref;
  listsDrawerOpenRef.current = listsDrawerOpen;

  const selectedViewKey = useMemo(
    () => getSelectedViewKey(selectedView),
    [selectedView],
  );

  const loadSidebar = useCallback(async (isRefresh = false) => {
    const cachedSidebar = !isRefresh ? readSidebarSession() : null;
    if (cachedSidebar) {
      setSidebarData(cachedSidebar);
      setSidebarError(null);
      setSidebarLoading(false);
      setSidebarRefreshing(false);
      return;
    }

    const storedSidebar = !isRefresh && !sidebarDataRef.current ? readCachedSidebarData() : null;
    if (storedSidebar) {
      setSidebarData(storedSidebar);
    }

    if (isRefresh) {
      setSidebarRefreshing(true);
    } else if (!storedSidebar) {
      setSidebarLoading(true);
    }

    setSidebarError(null);

    try {
      const sidebar = await fetchSidebarData({ force: isRefresh });
      writeSidebarSession(sidebar);
      setSidebarData(sidebar);
    } catch (loadError) {
      if (!storedSidebar && !sidebarDataRef.current) {
        const message =
          loadError instanceof Error ? loadError.message : "Failed to load lists";
        setSidebarError(message);
      }
    } finally {
      setSidebarLoading(false);
      setSidebarRefreshing(false);
    }
  }, []);

  const loadTasksForView = useCallback(async (view: SelectedView, isRefresh = false) => {
    const cachedTasks = !isRefresh ? readTasksSession(view) : null;
    if (cachedTasks) {
      setTaskData(cachedTasks);
      setTaskError(null);
      setTaskLoading(false);
      setTaskRefreshing(false);
      return;
    }

    const storedTasks = !isRefresh ? await readCachedTasks(view) : null;
    if (storedTasks) {
      setTaskData(storedTasks);
    }

    if (isRefresh) {
      setTaskRefreshing(true);
    } else if (!storedTasks) {
      setTaskLoading(true);
    }

    setTaskError(null);

    try {
      const tasks = await fetchTasks(view, { force: isRefresh });
      writeTasksSession(view, tasks);
      setTaskData(tasks);
    } catch (loadError) {
      if (!storedTasks) {
        const message =
          loadError instanceof Error ? loadError.message : "Failed to load tasks";
        setTaskError(message);
        setTaskData(null);
      }
    } finally {
      setTaskLoading(false);
      setTaskRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!pathname || pathname.includes("search")) return;
    setLastTabHref(pathname);
  }, [pathname]);

  useEffect(() => {
    void loadSidebar();
  }, [loadSidebar]);

  useEffect(() => startSyncEngine(), []);

  useEffect(() => {
    let localTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribeSync = subscribeSyncEvents(({ changed }) => {
      if (!changed) return;
      const view = selectedViewRef.current;
      if (view) {
        void fetchTasks(view, { force: true })
          .then((tasks) => {
            if (isSameSelectedView(selectedViewRef.current, view)) {
              writeTasksSession(view, tasks);
              setTaskData(tasks);
            }
          })
          .catch(() => undefined);
      }
      void fetchSidebarData({ force: true })
        .then((sidebar) => {
          writeSidebarSession(sidebar);
          setSidebarData(sidebar);
        })
        .catch(() => undefined);
    });

    // Local edits made elsewhere (task detail, calendar) show up without a network round trip.
    const unsubscribeLocal = subscribeLocalStore((event) => {
      if (event.type !== "tasks") return;
      if (localTimer) clearTimeout(localTimer);
      localTimer = setTimeout(() => {
        localTimer = null;
        const view = selectedViewRef.current;
        if (!view) return;
        void readCachedTasks(view).then((tasks) => {
          if (tasks && isSameSelectedView(selectedViewRef.current, view)) {
            setTaskData(tasks);
          }
        });
      }, 150);
    });

    return () => {
      if (localTimer) clearTimeout(localTimer);
      unsubscribeSync();
      unsubscribeLocal();
    };
  }, []);

  useEffect(() => {
    const view = selectedViewRef.current;
    if (!view || !selectedViewKey) return;
    if (skipNextSelectedViewLoadRef.current) {
      skipNextSelectedViewLoadRef.current = false;
      return;
    }
    void loadTasksForView(view);
  }, [loadTasksForView, selectedViewKey]);

  const selectView = useCallback(
    (view: SelectedView, options?: { goToTasks?: boolean }) => {
      let viewChanged = false;
      setSelectedView((current) => {
        if (isSameSelectedView(current, view)) {
          return current;
        }
        viewChanged = true;
        return view;
      });

      if (!viewChanged) {
        if (options?.goToTasks !== false) {
          router.navigate("/tasks");
        }
        return;
      }

      setTaskData(null);
      if (options?.goToTasks !== false) {
        router.navigate("/tasks");
      }
    },
    [],
  );

  const openTask = useCallback(
    (
      task: TaskItem,
      options?: { fromCalendar?: boolean; fromUpcoming?: boolean },
    ) => {
      router.push({
        pathname: "/task/[id]",
        params: {
          id: task.id,
          name: task.name,
          listName: task.listName ?? "",
          dueDate: task.dueDate ?? "",
          ...(options?.fromCalendar
            ? {
                fromCalendar: "1",
                calendarColor: task.calendarColor ?? "",
                dueTimeMinutes:
                  task.dueTimeMinutes != null
                    ? String(task.dueTimeMinutes)
                    : "",
                dueDurationMinutes:
                  task.dueDurationMinutes != null
                    ? String(task.dueDurationMinutes)
                    : "",
                dueRepeat: task.dueRepeat ?? "",
                ...(options.fromUpcoming ? { fromUpcoming: "1" } : null),
              }
            : null),
        },
      });
    },
    [],
  );

  const handleTaskCompleted = useCallback(
    (taskId?: string) => {
      if (taskId) {
        setTaskData((current) =>
          current
            ? {
                ...current,
                pinned: current.pinned.filter((task) => task.id !== taskId),
                tasks: current.tasks.filter((task) => task.id !== taskId),
              }
            : current,
        );
      }

      if (!selectedView) {
        void loadSidebar(true);
        return;
      }

      void loadTasksForView(selectedView, true);
      void loadSidebar(true);
    },
    [loadSidebar, loadTasksForView, selectedView],
  );

  const showCompletionUndo = useCallback((taskId: string, taskName: string) => {
    completionUndoTokenRef.current += 1;
    setCompletionUndo({
      taskId,
      taskName,
      token: completionUndoTokenRef.current,
    });
  }, []);

  const dismissCompletionUndo = useCallback(() => {
    setCompletionUndo(null);
  }, []);

  const completeTask = useCallback(
    async (taskId: string) => {
      const taskName = getLocalTask(taskId)?.name ?? "";
      setTaskData((current) =>
        current
          ? {
              ...current,
              pinned: current.pinned.map((task) =>
                task.id === taskId ? { ...task, completed: true } : task,
              ),
              tasks: current.tasks.map((task) =>
                task.id === taskId ? { ...task, completed: true } : task,
              ),
            }
          : current,
      );

      await new Promise((resolve) => setTimeout(resolve, 450));

      setTaskData((current) =>
        current
          ? {
              ...current,
              pinned: current.pinned.filter((task) => task.id !== taskId),
              tasks: current.tasks.filter((task) => task.id !== taskId),
            }
          : current,
      );

      try {
        await toggleTaskCompletedRequest(taskId, true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showCompletionUndo(taskId, taskName);
        void loadSidebar(true);
      } catch {
        const view = selectedViewRef.current;
        if (view) {
          void loadTasksForView(view, true);
        }
      }
    },
    [loadSidebar, loadTasksForView, showCompletionUndo],
  );

  const uncompleteTask = useCallback(
    async (taskId: string) => {
      // Re-opening the task by hand makes the pending undo offer redundant.
      setCompletionUndo((current) => (current?.taskId === taskId ? null : current));
      try {
        await toggleTaskCompletedRequest(taskId, false);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const view = selectedViewRef.current;
        if (view) {
          await loadTasksForView(view, true);
        }
        void loadSidebar(true);
      } catch {
        const view = selectedViewRef.current;
        if (view) {
          void loadTasksForView(view, true);
        }
      }
    },
    [loadSidebar, loadTasksForView],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      setTaskData((current) =>
        current
          ? {
              ...current,
              pinned: current.pinned.filter((task) => task.id !== taskId),
              tasks: current.tasks.filter((task) => task.id !== taskId),
            }
          : current,
      );

      try {
        await deleteTaskRequest(taskId);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        handleTaskCompleted(taskId);
      } catch {
        const view = selectedViewRef.current;
        if (view) {
          void loadTasksForView(view, true);
        }
      }
    },
    [handleTaskCompleted, loadTasksForView],
  );

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      const trimmed = input.name.trim();
      if (!trimmed) return null;

      const currentView = selectedViewRef.current;
      const lists = sidebarDataRef.current?.lists ?? [];
      const currentTasks = taskDataRef.current;

      const targetList =
        input.listId
          ? (lists.find((list) => list.id === input.listId) ?? null)
          : currentView?.type === "list"
            ? (lists.find((list) => list.id === currentView.id) ?? null)
            : findInboxList(lists);

      const listId =
        targetList?.id ??
        currentTasks?.tasks[0]?.listId ??
        currentTasks?.pinned[0]?.listId ??
        null;

      if (!listId) return null;

      const listName =
        targetList?.name ??
        currentTasks?.tasks[0]?.listName ??
        currentTasks?.pinned[0]?.listName ??
        "Inbox";

      const dueDate =
        input.dueDate !== undefined
          ? input.dueDate
          : currentView?.type === "today"
            ? getTodayDateValue()
            : null;

      const created = await createTaskRequest({
        name: trimmed,
        listId,
        dueDate,
        details: input.description?.trim() || undefined,
        priority: input.priority,
        labelIds: input.labelIds,
      });

      if (currentView) {
        await loadTasksForView(currentView, true);
      }
      await loadSidebar(true);

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setTaskAddedToast(listName);

      return created.id;
    },
    [loadSidebar, loadTasksForView],
  );

  const openAddTaskComposer = useCallback((draft?: ComposerDraft) => {
    setComposerDraft(draft ?? null);
    setAddTaskComposerOpen(true);
  }, []);

  const closeAddTaskComposer = useCallback(() => {
    setAddTaskComposerOpen(false);
    setAddTaskStayOnPage(false);
    setComposerDraft(null);
    setAddTaskComposerHeight(0);
  }, []);

  const clearTaskAddedToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setTaskAddedToast(null);
  }, []);

  const openSearchModal = useCallback(() => {
    if (suppressSearchOpenRef.current) return;
    router.navigate("/search");
  }, []);

  const suppressNextSearchOpen = useCallback(() => {
    suppressSearchOpenRef.current = true;
    if (suppressSearchOpenTimerRef.current) {
      clearTimeout(suppressSearchOpenTimerRef.current);
    }
    // Expire so a later intentional Search tab press still works.
    suppressSearchOpenTimerRef.current = setTimeout(() => {
      suppressSearchOpenRef.current = false;
      suppressSearchOpenTimerRef.current = null;
    }, 1000);
  }, []);

  const consumeSearchOpenSuppressed = useCallback(() => {
    if (!suppressSearchOpenRef.current) return false;
    suppressSearchOpenRef.current = false;
    if (suppressSearchOpenTimerRef.current) {
      clearTimeout(suppressSearchOpenTimerRef.current);
      suppressSearchOpenTimerRef.current = null;
    }
    return true;
  }, []);

  const flushDrawerCloseAction = useCallback(() => {
    const action = pendingAfterDrawerCloseRef.current;
    pendingAfterDrawerCloseRef.current = null;
    if (!action) return;

    const href = lastTabHrefRef.current;
    if (
      href.includes("/tasks") ||
      href.includes("/calendar") ||
      href.includes("/search")
    ) {
      return;
    }

    action();
  }, []);

  const closeListsDrawer = useCallback((options?: { goToTasksTab?: boolean }) => {
    if (options?.goToTasksTab === false) {
      pendingAfterDrawerCloseRef.current = null;
    } else {
      pendingAfterDrawerCloseRef.current = () => router.navigate("/tasks");
    }
    setListsDrawerOpen(false);
  }, []);

  const selectViewFromDrawer = useCallback(
    (view: SelectedView) => {
      skipNextSelectedViewLoadRef.current = true;
      const viewChanged = !isSameSelectedView(selectedViewRef.current, view);
      if (viewChanged) {
        setTaskData(null);
        setSelectedView(view);
        void loadTasksForView(view);
      }
      router.navigate("/tasks");
      setListsDrawerOpen(false);
    },
    [loadTasksForView],
  );

  const openListsDrawerPanel = useCallback(() => {
    listsDrawerOpenRef.current = true;
    setListsDrawerOpen(true);
  }, []);

  const animateListsDrawerOpen = useCallback(() => {
    if (listsDrawerOpenRef.current) {
      setListsDrawerOpen(true);
      return;
    }

    listsDrawerOpenRef.current = false;
    setListsDrawerOpen(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        listsDrawerOpenRef.current = true;
        setListsDrawerOpen(true);
      });
    });
  }, []);

  const openListsDrawer = useCallback(() => {
    const onTasks = lastTabHrefRef.current.includes("/tasks");

    if (onTasks && !listsDrawerOpenRef.current) {
      openListsDrawerPanel();
      window.setTimeout(() => {
        router.navigate("/");
      }, 320);
      return;
    }

    router.navigate("/");
  }, [openListsDrawerPanel]);

  const openTasksForDrawerSelection = useCallback(() => {
    if (!listsDrawerOpenRef.current) {
      return;
    }

    listsDrawerOpenRef.current = false;
    setListsDrawerOpen(false);

    const view = selectedViewRef.current;
    if (view) {
      router.navigate("/tasks");
      return;
    }

    const firstList = sidebarDataRef.current?.lists[0];
    if (firstList) {
      selectViewFromDrawer({ type: "list", id: firstList.id });
      return;
    }

    pendingAfterDrawerCloseRef.current = null;
    router.navigate("/tasks");
  }, [selectViewFromDrawer]);

  const startAddingTask = useCallback(
    (options?: { stayOnPage?: boolean; draft?: ComposerDraft }) => {
      const stayOnPage = options?.stayOnPage === true;
      const currentView = selectedViewRef.current;
      const draft: ComposerDraft = {
        ...(currentView?.type === "list" ? { listId: currentView.id } : {}),
        ...options?.draft,
      };

      setAddTaskStayOnPage(stayOnPage);
      setComposerDraft(Object.keys(draft).length > 0 ? draft : null);

      if (!stayOnPage) {
        router.navigate("/tasks");
      }

      setAddTaskComposerOpen(true);

      if (stayOnPage || currentView?.type === "list") {
        return;
      }

      void (async () => {
        let lists = sidebarDataRef.current?.lists ?? [];
        if (lists.length === 0) {
          try {
            const sidebar = await fetchSidebarData();
            setSidebarData(sidebar);
            lists = sidebar.lists;
          } catch {
            return;
          }
        }

        const inbox = findInboxList(lists);
        if (!inbox) return;

        setSelectedView((current) =>
          isSameSelectedView(current, { type: "list", id: inbox.id })
            ? current
            : { type: "list", id: inbox.id },
        );
      })();
    },
    [],
  );

  const reorderSidebarTopLevel = useCallback(
    (sourceIndex: number, dropIndex: number) => {
      const current = sidebarDataRef.current;
      if (!current) return;

      const inboxId = findInboxList(current.lists)?.id ?? null;
      const folders = current.folders ?? [];
      const result = computeSidebarTopLevelAfterReorder(
        folders,
        current.lists,
        inboxId,
        sourceIndex,
        dropIndex,
      );

      if (!result.changed) return;

      const nextSidebar = {
        ...current,
        lists: result.lists,
        folders: result.folders,
      };

      setSidebarData(nextSidebar);
      writeSidebarSession(nextSidebar);

      const updates = getSidebarTopLevelPositionUpdates(
        result.folders,
        result.lists,
        inboxId,
      );

      void reorderSidebarTopLevelRequest(updates).catch((error) => {
        console.warn("Failed to persist sidebar order:", error);
        void loadSidebar(true);
      });
    },
    [loadSidebar],
  );

  const reorderTasks = useCallback((section: "tasks" | "pinned", tasks: TaskItem[]) => {
    const view = selectedViewRef.current;
    setTaskData((current) => {
      if (!current) return current;

      const next = {
        ...current,
        [section]: tasks,
      };

      if (view) {
        writeTasksSession(view, next);
      }

      return next;
    });

    if (view?.type !== "list") return;

    void reorderTasksRequest({
      listId: view.id,
      section,
      taskIds: tasks.map((task) => task.id),
    }).catch((error) => {
      console.warn("Failed to persist task order:", error);
      void loadTasksForView(view, true);
    });
  }, [loadTasksForView]);

  const loadCalendarTasks = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setCalendarRefreshing(true);
    } else {
      setCalendarLoading(true);
    }

    try {
      const data = await fetchTasks(
        { type: "calendar" },
        { force: isRefresh },
      );
      setCalendarTasks((current) => {
        const previousById = new Map(current.map((task) => [task.id, task]));
        return data.tasks.map((task) => {
          const previous = previousById.get(task.id);
          const previousColor = previous?.calendarColor ?? null;
          const nextColor = task.calendarColor ?? null;
          const calendarColor =
            previousColor != null && previousColor !== nextColor
              ? previousColor
              : nextColor;

          return {
            ...task,
            calendarColor,
            dueRepeat:
              normalizeTaskRepeat(task.dueRepeat) ??
              previous?.dueRepeat ??
              null,
          };
        });
      });
    } catch {
      setCalendarTasks([]);
    } finally {
      setCalendarLoading(false);
      setCalendarRefreshing(false);
    }
  }, []);

  const patchCalendarTask = useCallback(
    (taskId: string, patch: Partial<TaskItem>) => {
      setCalendarTasks((current) =>
        current.map((task) =>
          task.id === taskId ? { ...task, ...patch } : task,
        ),
      );
    },
    [],
  );

  const replaceCalendarTasks = useCallback((tasks: TaskItem[]) => {
    setCalendarTasks(tasks);
  }, []);

  const setCalendarTaskColor = useCallback((taskId: string, calendarColor: string) => {
    setCalendarTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, calendarColor } : task,
      ),
    );
    setCalendarColorEpoch((epoch) => epoch + 1);
    setTaskData((current) =>
      current
        ? {
            ...current,
            pinned: current.pinned.map((task) =>
              task.id === taskId ? { ...task, calendarColor } : task,
            ),
            tasks: current.tasks.map((task) =>
              task.id === taskId ? { ...task, calendarColor } : task,
            ),
          }
        : current,
    );
  }, []);

  const undoCompletion = useCallback(async () => {
    const pending = completionUndo;
    if (!pending) return;
    setCompletionUndo(null);
    await uncompleteTask(pending.taskId);
    // The calendar keeps its own task list that the list reload above doesn't touch.
    void loadCalendarTasks(true);
  }, [completionUndo, loadCalendarTasks, uncompleteTask]);

  const value = useMemo<AppContextValue>(
    () => ({
      sidebarData,
      sidebarLoading,
      sidebarRefreshing,
      sidebarError,
      selectedView,
      taskData,
      taskLoading,
      taskRefreshing,
      taskError,
      addTaskComposerOpen,
      addTaskStayOnPage,
      composerDraft,
      taskAddedToast,
      addTaskComposerHeight,
      lastTabHref,
      loadSidebar,
      selectView,
      selectViewFromDrawer,
      flushDrawerCloseAction,
      loadTasksForView,
      openTask,
      handleTaskCompleted,
      completeTask,
      uncompleteTask,
      completionUndo,
      showCompletionUndo,
      dismissCompletionUndo,
      undoCompletion,
      deleteTask,
      createTask,
      openAddTaskComposer,
      closeAddTaskComposer,
      startAddingTask,
      clearTaskAddedToast,
      setAddTaskComposerHeight,
      openSearchModal,
      suppressNextSearchOpen,
      consumeSearchOpenSuppressed,
      setLastTabHref,
      listsDrawerOpen,
      setListsDrawerOpen,
      openListsDrawerPanel,
      closeListsDrawer,
      openTasksForDrawerSelection,
      openListsDrawer,
      animateListsDrawerOpen,
      reorderSidebarTopLevel,
      reorderTasks,
      calendarTasks,
      calendarLoading,
      calendarRefreshing,
      loadCalendarTasks,
      patchCalendarTask,
      replaceCalendarTasks,
      calendarColorEpoch,
      setCalendarTaskColor,
    }),
    [
      sidebarData,
      sidebarLoading,
      sidebarRefreshing,
      sidebarError,
      selectedView,
      taskData,
      taskLoading,
      taskRefreshing,
      taskError,
      addTaskComposerOpen,
      addTaskStayOnPage,
      composerDraft,
      taskAddedToast,
      addTaskComposerHeight,
      lastTabHref,
      loadSidebar,
      selectView,
      selectViewFromDrawer,
      flushDrawerCloseAction,
      loadTasksForView,
      openTask,
      handleTaskCompleted,
      completeTask,
      uncompleteTask,
      completionUndo,
      showCompletionUndo,
      dismissCompletionUndo,
      undoCompletion,
      deleteTask,
      createTask,
      openAddTaskComposer,
      closeAddTaskComposer,
      startAddingTask,
      clearTaskAddedToast,
      openSearchModal,
      suppressNextSearchOpen,
      consumeSearchOpenSuppressed,
      listsDrawerOpen,
      setListsDrawerOpen,
      openListsDrawerPanel,
      closeListsDrawer,
      openTasksForDrawerSelection,
      openListsDrawer,
      animateListsDrawerOpen,
      reorderSidebarTopLevel,
      reorderTasks,
      calendarTasks,
      calendarLoading,
      calendarRefreshing,
      loadCalendarTasks,
      patchCalendarTask,
      replaceCalendarTasks,
      calendarColorEpoch,
      setCalendarTaskColor,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
