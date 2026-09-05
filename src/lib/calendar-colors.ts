export const DEFAULT_CALENDAR_TASK_COLOR = "#b8b8b8";

/** Preset swatches for calendar timed-task blocks (4×4 grid). Saturation −12%. */
export const CALENDAR_COLOR_OPTIONS = [
  "#e54e4e",
  "#eb7524",
  "#dcac16",
  "#be8610",
  "#82c121",
  "#2cbb61",
  "#1eae9e",
  "#44b9ec",
  "#4685eb",
  "#5750db",
  "#8f65ed",
  "#aa92f3",
  "#e25299",
  "#d03278",
  "#56534f",
  "#667489",
] as const;

export function normalizeCalendarColor(color: string | null | undefined) {
  if (!color) return DEFAULT_CALENDAR_TASK_COLOR;
  const trimmed = color.trim();
  if (!trimmed) return DEFAULT_CALENDAR_TASK_COLOR;
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}
