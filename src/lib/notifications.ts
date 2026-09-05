import Constants from "expo-constants";
import { Platform } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

let notificationsModule: NotificationsModule | null | undefined;
let handlerConfigured = false;
let permissionRequested = false;

function canUseNotifications() {
  return !(Platform.OS === "android" && Constants.appOwnership === "expo");
}

async function getNotifications(): Promise<NotificationsModule | null> {
  if (!canUseNotifications()) return null;

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

function getReminderDate(dueDate: string, dueTimeMinutes: number | null) {
  const date = new Date(`${dueDate.slice(0, 10)}T12:00:00`);
  if (dueTimeMinutes != null) {
    date.setHours(Math.floor(dueTimeMinutes / 60), dueTimeMinutes % 60, 0, 0);
  } else {
    date.setHours(9, 0, 0, 0);
  }
  return date;
}

export async function scheduleTaskReminder(input: {
  taskId: string;
  taskName: string;
  dueDate: string | null;
  dueTimeMinutes?: number | null;
}) {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await Notifications.cancelScheduledNotificationAsync(input.taskId).catch(() => undefined);

  if (!input.dueDate) return;

  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  const triggerDate = getReminderDate(input.dueDate, input.dueTimeMinutes ?? null);
  if (triggerDate.getTime() <= Date.now()) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("task-reminders", {
      name: "Task reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: input.taskId,
    content: {
      title: "Task reminder",
      body: input.taskName,
      data: { taskId: input.taskId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: Platform.OS === "android" ? "task-reminders" : undefined,
    },
  });
}

export async function applyTaskReminder(input: {
  taskId: string;
  taskName: string;
  dueDate: string | null;
  dueTimeMinutes?: number | null;
  reminderEnabled?: boolean;
}) {
  if (input.reminderEnabled && input.dueDate) {
    await scheduleTaskReminder({
      taskId: input.taskId,
      taskName: input.taskName,
      dueDate: input.dueDate,
      dueTimeMinutes: input.dueTimeMinutes,
    });
    return;
  }

  await cancelTaskReminder(input.taskId);
}

export async function cancelTaskReminder(taskId: string) {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await Notifications.cancelScheduledNotificationAsync(taskId).catch(() => undefined);
}
