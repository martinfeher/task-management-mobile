export type TaskDueUrgency = "overdue" | "today" | "thisWeek" | "later" | "none";

export type TaskDueUrgencyStyle = {
  urgency: TaskDueUrgency;
  color: string;
  accentColor: string;
};

export const TASK_DUE_URGENCY_COLORS = {
  overdue: "#ef4444",
  today: "#f97316",
  thisWeek: "#22c55e",
  later: "#98979c",
  none: "transparent",
} as const;

export const TASK_DUE_URGENCY_LABELS = {
  overdue: "Overdue",
  today: "Today",
  thisWeek: "This week",
  later: "Later",
} as const;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  return next;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getWeekStartMonday(date: Date) {
  const day = startOfDay(date);
  const weekday = day.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  day.setDate(day.getDate() + diff);
  return day;
}

function getWeekEndSunday(date: Date) {
  const weekStart = getWeekStartMonday(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return weekEnd;
}

export function getTaskDueUrgency(dueDate: string | null): TaskDueUrgency {
  if (!dueDate) return "none";

  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return "none";

  const today = startOfDay(new Date());
  const dueDay = startOfDay(parsed);

  if (dueDay.getTime() < today.getTime()) return "overdue";
  if (isSameDay(dueDay, today)) return "today";

  const weekEnd = getWeekEndSunday(today);
  if (dueDay.getTime() <= weekEnd.getTime()) return "thisWeek";

  return "later";
}

export function getTaskDueUrgencyStyle(
  dueDate: string | null,
): TaskDueUrgencyStyle {
  const urgency = getTaskDueUrgency(dueDate);
  const color =
    urgency === "none"
      ? TASK_DUE_URGENCY_COLORS.later
      : TASK_DUE_URGENCY_COLORS[urgency];

  return {
    urgency,
    color,
    accentColor: urgency === "none" ? "transparent" : color,
  };
}
