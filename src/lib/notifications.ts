import Constants from "expo-constants";
import { Platform } from "react-native";

import {
  planReminders,
  type ReminderTaskInput,
  type ScheduledReminder,
} from "@/lib/task-reminder-plan";

type NotificationsModule = typeof import("expo-notifications");

const REMINDER_CHANNEL_ID = "task-reminders";

let notificationsModule: NotificationsModule | null | undefined;
let handlerConfigured = false;
let permissionRequested = false;
let channelReady = false;
let reconcileChain: Promise<void> = Promise.resolve();

/** False where local notifications can't run (Android Expo Go). */
export function notificationsSupported() {
  return !(Platform.OS === "android" && Constants.appOwnership === "expo");
}

async function getNotifications(): Promise<NotificationsModule | null> {
  if (!notificationsSupported()) return null;

  if (notificationsModule !== undefined) {
    return notificationsModule;
  }

  try {
    notificationsModule = await import("expo-notifications");
    if (!handlerConfigured) {
      notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      handlerConfigured = true;
    }
    return notificationsModule;
  } catch {
    notificationsModule = null;
    return null;
  }
}

export async function ensureNotificationPermissions() {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  if (permissionRequested) {
    const settings = await Notifications.getPermissionsAsync();
    return settings.granted;
  }

  permissionRequested = true;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function ensureReminderChannel(Notifications: NotificationsModule) {
  if (Platform.OS !== "android" || channelReady) return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: "Task reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  channelReady = true;
}

function readScheduledReminders(
  requests: Awaited<ReturnType<NotificationsModule["getAllScheduledNotificationsAsync"]>>,
): ScheduledReminder[] {
  const reminders: ScheduledReminder[] = [];
  for (const request of requests) {
    const data = request.content.data as { taskId?: unknown; fireAt?: unknown } | null;
    // Only notifications created for tasks are ours to manage.
    if (!data || typeof data.taskId !== "string") continue;
    reminders.push({
      id: request.identifier,
      fireAt: typeof data.fireAt === "number" ? data.fireAt : null,
      name: request.content.body ?? null,
    });
  }
  return reminders;
}

async function runReconcile(tasks: ReminderTaskInput[]) {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  // Never prompt from a background reconcile; the prompt happens at launch and when a
  // reminder is picked in the date sheet.
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) return;

  const scheduled = readScheduledReminders(await Notifications.getAllScheduledNotificationsAsync());
  const plan = planReminders(tasks, scheduled);
  if (plan.cancel.length === 0 && plan.schedule.length === 0) return;

  await Promise.all(
    plan.cancel.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)),
  );

  if (plan.schedule.length === 0) return;
  await ensureReminderChannel(Notifications);

  for (const reminder of plan.schedule) {
    // Scheduling with an existing identifier replaces it, but cancel first to be explicit.
    await Notifications.cancelScheduledNotificationAsync(reminder.id).catch(() => undefined);
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: {
        title: "Task reminder",
        body: reminder.name,
        data: { taskId: reminder.id, fireAt: reminder.fireAt },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(reminder.fireAt),
        channelId: Platform.OS === "android" ? REMINDER_CHANNEL_ID : undefined,
      },
    }).catch((error) => {
      console.warn("Failed to schedule task reminder:", error);
    });
  }
}

/**
 * Makes the device's scheduled notifications match the reminders stored on tasks:
 * cancels notifications for tasks that are completed, deleted, rescheduled or had the
 * reminder removed, and schedules the missing ones. Calls are serialized.
 */
export function reconcileAllReminders(tasks: ReminderTaskInput[]) {
  reconcileChain = reconcileChain
    .then(() => runReconcile(tasks))
    .catch((error) => {
      console.warn("Failed to reconcile task reminders:", error);
    });
  return reconcileChain;
}
