import { AppState } from "react-native";

import {
  getAllLocalTasks,
  hydrateLocalStore,
  subscribeLocalStore,
} from "@/lib/offline/local-store";
import { reconcileAllReminders } from "@/lib/notifications";
import type { ReminderTaskInput } from "@/lib/task-reminder-plan";

/** Coalesces bursts of store changes (e.g. a sync pull touching many tasks). */
const RECONCILE_DEBOUNCE_MS = 500;

function readReminderTasks(): ReminderTaskInput[] {
  return getAllLocalTasks().map((task) => ({
    id: task.id,
    name: task.name,
    completed: task.completed,
    deleted: task.deleted,
    isNote: task.isNote,
    dueDate: task.dueDate,
    dueTimeMinutes: task.dueTimeMinutes ?? null,
    reminderOffsetMinutes: task.reminderOffsetMinutes ?? null,
  }));
}

async function reconcileFromStore() {
  await hydrateLocalStore();
  await reconcileAllReminders(readReminderTasks());
}

/**
 * Keeps scheduled reminder notifications in step with the local task store. The store
 * is the single choke point for local edits, completion, deletion and sync pulls, so
 * every path (this device or another one) ends up here. Also reconciles on launch and
 * whenever the app returns to the foreground. Returns a cleanup function.
 */
export function startReminderSync() {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void reconcileFromStore();
    }, RECONCILE_DEBOUNCE_MS);
  };

  const unsubscribeStore = subscribeLocalStore((event) => {
    if (event.type === "tasks") schedule();
  });
  const appStateSubscription = AppState.addEventListener("change", (state) => {
    if (state === "active") schedule();
  });

  void reconcileFromStore();

  return () => {
    if (timer) clearTimeout(timer);
    unsubscribeStore();
    appStateSubscription.remove();
    // Only unmounts on sign-out (or a dev reload): drop this account's reminders. A
    // remount reconciles again afterwards, and the calls are serialized in order.
    void reconcileAllReminders([]);
  };
}
