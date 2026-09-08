import { addDays, parseDateKey, startOfDay, toDateKey } from "@/lib/task-dates";
import type { TaskItem } from "@/types/todo";

export type TaskRepeatOption =
  | "none"
  | "daily"
  | "weekday"
  | "weekly"
  | "monthly"
  | "custom";

export function normalizeTaskRepeat(value: unknown): TaskRepeatOption | null {
  if (
    value === "daily" ||
    value === "weekday" ||
    value === "weekly" ||
    value === "monthly" ||
    value === "custom"
  ) {
    return value;
  }

  return null;
}

export function matchesRepeatPattern(
  day: Date,
  anchor: Date,
  repeat: TaskRepeatOption,
): boolean {
  if (repeat === "none" || repeat === "custom") return false;

  const dayStart = startOfDay(day);
  const anchorStart = startOfDay(anchor);

  switch (repeat) {
    case "daily":
      return dayStart >= anchorStart;
    case "weekday": {
      const dayOfWeek = dayStart.getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5 && dayStart >= anchorStart;
    }
    case "weekly":
      return (
        dayStart.getDay() === anchorStart.getDay() && dayStart >= anchorStart
      );
    case "monthly":
      return (
        dayStart.getDate() === anchorStart.getDate() && dayStart >= anchorStart
      );
    default:
      return false;
  }
}

function addTaskToDateMap(
  map: Map<string, TaskItem[]>,
  dateKey: string,
  task: TaskItem,
) {
  const existing = map.get(dateKey) ?? [];
  existing.push(task);
  map.set(dateKey, existing);
}

export function buildTaskOccurrence(
  task: TaskItem,
  day: Date,
): TaskItem | null {
  if (!task.dueDate) return null;

  const anchor = parseDateKey(task.dueDate);
  if (!anchor) return null;

  const repeat = task.dueRepeat ?? "none";
  const dayKey = toDateKey(day);
  const anchorKey = task.dueDate.slice(0, 10);

  if (repeat === "none" || repeat === "custom") {
    return anchorKey === dayKey ? task : null;
  }

  if (!matchesRepeatPattern(day, anchor, repeat)) return null;

  if (anchorKey === dayKey) return task;

  return {
    ...task,
    dueDate: dayKey,
  };
}

export function buildTasksByDate(
  tasks: TaskItem[],
  rangeStart: Date,
  rangeEnd: Date,
): Map<string, TaskItem[]> {
  const map = new Map<string, TaskItem[]>();
  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);

  for (const task of tasks) {
    if (!task.dueDate) continue;

    const repeat = task.dueRepeat ?? "none";
    const anchor = parseDateKey(task.dueDate);
    if (!anchor) continue;

    if (repeat === "none" || repeat === "custom") {
      const key = task.dueDate.slice(0, 10);
      if (key >= startKey && key <= endKey) {
        addTaskToDateMap(map, key, task);
      }
      continue;
    }

    let cursor = start;
    while (cursor <= end) {
      const occurrence = buildTaskOccurrence(task, cursor);
      if (occurrence) {
        addTaskToDateMap(map, toDateKey(cursor), occurrence);
      }
      cursor = addDays(cursor, 1);
    }
  }

  return map;
}
