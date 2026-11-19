/**
 * Pure planning logic for task reminder notifications. It has no Expo imports so it
 * can be unit tested; `notifications.ts` applies the resulting plan.
 */

/** iOS keeps at most 64 pending local notifications; stay below it. */
export const MAX_SCHEDULED_REMINDERS = 60;

const MS_PER_MINUTE = 60_000;

export type ReminderTaskInput = {
  id: string;
  name: string;
  completed: boolean;
  deleted?: boolean;
  isNote?: boolean;
  dueDate: string | null;
  dueTimeMinutes?: number | null;
  /** Minutes before the due time to notify (0 = on time). Null/absent = no reminder. */
  reminderOffsetMinutes?: number | null;
};

/** A reminder notification that is already scheduled on the device. */
export type ScheduledReminder = {
  id: string;
  fireAt: number | null;
  name: string | null;
};

export type DesiredReminder = {
  id: string;
  name: string;
  /** Epoch ms at which the notification should fire. */
  fireAt: number;
};

export type ReminderPlan = {
  /** Scheduled notification ids that no longer apply. */
  cancel: string[];
  /** Reminders to (re)schedule; an existing notification with the same id is replaced. */
  schedule: DesiredReminder[];
};

function parseDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/**
 * When the reminder for a task should fire, in the device's local time, or null when the
 * task has no active reminder (no due time, no offset, completed, deleted) or the moment
 * has already passed. A reminder needs a due time, mirroring the date sheet's rule.
 */
export function getReminderFireAt(task: ReminderTaskInput, now: number = Date.now()): number | null {
  if (task.completed || task.deleted || task.isNote) return null;
  if (!task.dueDate) return null;
  if (task.reminderOffsetMinutes == null || task.reminderOffsetMinutes < 0) return null;
  if (task.dueTimeMinutes == null) return null;

  const date = parseDateKey(task.dueDate);
  if (!date) return null;

  const hours = Math.floor(task.dueTimeMinutes / 60);
  const minutes = task.dueTimeMinutes % 60;
  const due = new Date(date.year, date.month - 1, date.day, hours, minutes, 0, 0).getTime();
  if (Number.isNaN(due)) return null;

  const fireAt = due - task.reminderOffsetMinutes * MS_PER_MINUTE;
  return fireAt > now ? fireAt : null;
}

/**
 * Diffs the reminders every task wants against what is scheduled and returns what to
 * cancel and what to (re)schedule. Only the soonest `max` reminders are kept so the
 * platform's pending-notification cap is never exceeded.
 */
export function planReminders(
  tasks: ReminderTaskInput[],
  scheduled: ScheduledReminder[],
  now: number = Date.now(),
  max: number = MAX_SCHEDULED_REMINDERS,
): ReminderPlan {
  const wanted = new Map<string, DesiredReminder>();
  for (const task of tasks) {
    const fireAt = getReminderFireAt(task, now);
    if (fireAt == null) continue;
    wanted.set(task.id, { id: task.id, name: task.name, fireAt });
  }

  const desired = [...wanted.values()].sort((a, b) => a.fireAt - b.fireAt).slice(0, max);
  const desiredById = new Map(desired.map((reminder) => [reminder.id, reminder]));
  const scheduledById = new Map(scheduled.map((reminder) => [reminder.id, reminder]));

  const cancel = scheduled
    .filter((reminder) => !desiredById.has(reminder.id))
    .map((reminder) => reminder.id);

  const schedule = desired.filter((reminder) => {
    const existing = scheduledById.get(reminder.id);
    if (!existing) return true;
    return existing.fireAt !== reminder.fireAt || existing.name !== reminder.name;
  });

  return { cancel, schedule };
}
