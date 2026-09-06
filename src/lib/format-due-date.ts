export function formatDueTime(dueTimeMinutes: number | null | undefined) {
  if (dueTimeMinutes == null) return null;

  const hours = Math.floor(dueTimeMinutes / 60);
  const minutes = dueTimeMinutes % 60;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatTaskDueDateParts(
  value: string | null,
  dueTimeMinutes?: number | null,
) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDay = startOfDay(date);

  let dateLabel: string;
  if (isSameDay(dueDay, today)) {
    dateLabel = "Today";
  } else if (isSameDay(dueDay, tomorrow)) {
    dateLabel = "Tomorrow";
  } else {
    dateLabel = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(date);
  }

  return {
    dateLabel,
    timeLabel: formatDueTime(dueTimeMinutes),
  };
}

export function formatTaskDueDate(
  value: string | null,
  dueTimeMinutes?: number | null,
) {
  const parts = formatTaskDueDateParts(value, dueTimeMinutes);
  if (!parts) return null;

  return parts.timeLabel
    ? `${parts.dateLabel}, ${parts.timeLabel}`
    : parts.dateLabel;
}

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
