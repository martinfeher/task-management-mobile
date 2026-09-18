import type { TaskItem } from "@/types/todo";

export const CALENDAR_ALL_DAY_TASK_HEIGHT = 22;
export const CALENDAR_ALL_DAY_TASK_GAP = 4;
export const CALENDAR_ALL_DAY_ROW_PADDING = 8;
export const CALENDAR_ALL_DAY_EMPTY_ROW_HEIGHT = 36;

export function isAllDayCalendarTask(task: TaskItem) {
  return task.dueTimeMinutes == null;
}

export function splitCalendarDayTasks(tasks: TaskItem[]) {
  const allDay: TaskItem[] = [];
  const timed: TaskItem[] = [];

  for (const task of tasks) {
    if (isAllDayCalendarTask(task)) {
      allDay.push(task);
    } else {
      timed.push(task);
    }
  }

  return { allDay, timed };
}

export function getCalendarAllDayRowHeight(maxTaskCount: number) {
  if (maxTaskCount <= 0) {
    return CALENDAR_ALL_DAY_EMPTY_ROW_HEIGHT;
  }

  return (
    CALENDAR_ALL_DAY_ROW_PADDING * 2 +
    maxTaskCount * CALENDAR_ALL_DAY_TASK_HEIGHT +
    (maxTaskCount - 1) * CALENDAR_ALL_DAY_TASK_GAP
  );
}
