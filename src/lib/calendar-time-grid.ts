import { toDateKey } from "@/lib/task-dates";

export const CALENDAR_HOUR_START = 6;
export const CALENDAR_HOUR_END = 23;
export const CALENDAR_HOUR_HEIGHT = 56;
export const CALENDAR_TIME_LABEL_WIDTH = 44;
export const CALENDAR_DEFAULT_DURATION_MINUTES = 60;
export const CALENDAR_TIME_SLOT_MINUTES = 15;
export const CALENDAR_MIN_DURATION_MINUTES = 15;

export function formatCalendarHourLabel(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
  }).format(date);
}

export function getCalendarDisplayHours(
  hourStart = CALENDAR_HOUR_START,
  hourEnd = CALENDAR_HOUR_END,
) {
  return Array.from({ length: hourEnd - hourStart + 1 }, (_, index) => hourStart + index);
}

export function getCalendarGridHeightPx(
  hourStart = CALENDAR_HOUR_START,
  hourEnd = CALENDAR_HOUR_END,
  hourHeight = CALENDAR_HOUR_HEIGHT,
) {
  return (hourEnd - hourStart + 1) * hourHeight;
}

export function getTopForCalendarMinutes(
  minutes: number,
  hourStart = CALENDAR_HOUR_START,
  hourHeight = CALENDAR_HOUR_HEIGHT,
) {
  return (minutes / 60 - hourStart) * hourHeight;
}

export function getHeightForCalendarDuration(
  durationMinutes: number | null | undefined,
  hourHeight = CALENDAR_HOUR_HEIGHT,
) {
  const duration =
    durationMinutes && durationMinutes > 0
      ? durationMinutes
      : CALENDAR_DEFAULT_DURATION_MINUTES;
  return Math.max(28, (duration / 60) * hourHeight);
}

export function getCurrentMinutesFromMidnight(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

export const CALENDAR_PAST_TASK_BACKGROUND_OPACITY = 0.83;

export function isCalendarTimedTaskPast(
  dateKey: string,
  endMinutes: number,
  now = new Date(),
) {
  const todayKey = toDateKey(now);
  if (dateKey < todayKey) return true;
  if (dateKey > todayKey) return false;
  return endMinutes < getCurrentMinutesFromMidnight(now);
}

export function snapToCalendarTimeSlot(
  minutes: number,
  slotMinutes = CALENDAR_TIME_SLOT_MINUTES,
) {
  const snapped = Math.round(minutes / slotMinutes) * slotMinutes;
  const minMinutes = CALENDAR_HOUR_START * 60;
  const maxMinutes = (CALENDAR_HOUR_END + 1) * 60 - slotMinutes;
  return Math.max(minMinutes, Math.min(maxMinutes, snapped));
}

export function getMinutesFromCalendarTop(
  top: number,
  hourStart = CALENDAR_HOUR_START,
  hourHeight = CALENDAR_HOUR_HEIGHT,
) {
  return (top / hourHeight + hourStart) * 60;
}

export function getDurationFromCalendarHeight(
  height: number,
  hourHeight = CALENDAR_HOUR_HEIGHT,
) {
  return Math.max(
    CALENDAR_MIN_DURATION_MINUTES,
    Math.round(((height / hourHeight) * 60) / CALENDAR_TIME_SLOT_MINUTES) *
      CALENDAR_TIME_SLOT_MINUTES,
  );
}

export function getCalendarSlotHeightPx(
  hourHeight = CALENDAR_HOUR_HEIGHT,
  slotMinutes = CALENDAR_TIME_SLOT_MINUTES,
) {
  return (slotMinutes / 60) * hourHeight;
}

export function formatCalendarTimeLabel(minutes: number) {
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatCalendarTimeRange(
  startMinutes: number,
  durationMinutes: number,
) {
  const endMinutes = startMinutes + durationMinutes;
  return `${formatCalendarTimeLabel(startMinutes)} – ${formatCalendarTimeLabel(endMinutes)}`;
}

export function getCalendarTaskContentLayout(
  availableHeight: number,
  lineHeight: number,
) {
  const lineCapacity = Math.max(0, Math.floor(availableHeight / lineHeight));
  const showTime = lineCapacity >= 2;
  const expandedLayout = lineCapacity > 3;

  let titleMaxLines = 1;
  if (expandedLayout) {
    titleMaxLines = showTime ? lineCapacity - 1 : lineCapacity;
  } else if (showTime) {
    titleMaxLines = lineCapacity - 1;
  } else {
    titleMaxLines = Math.min(2, Math.max(1, lineCapacity));
  }

  return {
    lineCapacity,
    showTime,
    expandedLayout,
    titleMaxLines: Math.max(1, titleMaxLines),
  };
}

export function getSnappedTopFromDrag(
  baseTop: number,
  dragOffsetY: number,
  hourStart = CALENDAR_HOUR_START,
  hourHeight = CALENDAR_HOUR_HEIGHT,
) {
  "worklet";
  const proposedTop = baseTop + dragOffsetY;
  const minutes = (proposedTop / hourHeight + hourStart) * 60;
  const snapped = Math.round(minutes / CALENDAR_TIME_SLOT_MINUTES) * CALENDAR_TIME_SLOT_MINUTES;
  const minMinutes = hourStart * 60;
  const maxMinutes = (CALENDAR_HOUR_END + 1) * 60 - CALENDAR_TIME_SLOT_MINUTES;
  const clampedMinutes = Math.max(minMinutes, Math.min(maxMinutes, snapped));
  return (clampedMinutes / 60 - hourStart) * hourHeight;
}

export function getSnappedColumnShift(dragOffsetX: number, columnWidth: number) {
  "worklet";
  return Math.round(dragOffsetX / Math.max(columnWidth, 1));
}

export function getSnappedResizeHeight(
  baseHeight: number,
  dragOffsetY: number,
  maxHeight: number,
  hourHeight = CALENDAR_HOUR_HEIGHT,
) {
  "worklet";
  const minHeight = Math.max(28, (CALENDAR_MIN_DURATION_MINUTES / 60) * hourHeight);
  const proposed = Math.max(minHeight, Math.min(maxHeight, baseHeight + dragOffsetY));
  const duration = Math.max(
    CALENDAR_MIN_DURATION_MINUTES,
    Math.round(((proposed / hourHeight) * 60) / CALENDAR_TIME_SLOT_MINUTES) *
      CALENDAR_TIME_SLOT_MINUTES,
  );
  return Math.max(minHeight, (duration / 60) * hourHeight);
}

export function getMinutesFromSnappedTop(
  snappedTop: number,
  hourStart = CALENDAR_HOUR_START,
  hourHeight = CALENDAR_HOUR_HEIGHT,
) {
  "worklet";
  const minutes = (snappedTop / hourHeight + hourStart) * 60;
  return Math.round(minutes / CALENDAR_TIME_SLOT_MINUTES) * CALENDAR_TIME_SLOT_MINUTES;
}

export function getDurationFromSnappedHeight(
  snappedHeight: number,
  hourHeight = CALENDAR_HOUR_HEIGHT,
) {
  "worklet";
  return Math.max(
    CALENDAR_MIN_DURATION_MINUTES,
    Math.round(((snappedHeight / hourHeight) * 60) / CALENDAR_TIME_SLOT_MINUTES) *
      CALENDAR_TIME_SLOT_MINUTES,
  );
}
