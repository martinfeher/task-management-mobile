export const DEFAULT_CALENDAR_TASK_COLOR = "#b8b8b8";

/** Website calendar blocks use a light tint of the accent color. */
const CALENDAR_TASK_BACKGROUND_WHITE_MIX = 0.68;

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

function parseHexRgb(hex: string) {
  const normalized = normalizeCalendarColor(hex).slice(1);
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((channel) => channel + channel)
          .join("")
      : normalized.slice(0, 6);

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

function channelToHex(channel: number) {
  return Math.max(0, Math.min(255, Math.round(channel)))
    .toString(16)
    .padStart(2, "0");
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

function mixHexWithWhite(hex: string, whiteRatio: number) {
  const { r, g, b } = parseHexRgb(hex);
  const accentRatio = 1 - whiteRatio;

  return rgbToHex(
    r * accentRatio + 255 * whiteRatio,
    g * accentRatio + 255 * whiteRatio,
    b * accentRatio + 255 * whiteRatio,
  );
}

/** Pastel calendar block background — matches the website schedule view. */
export function getCalendarTaskBackgroundColor(color: string | null | undefined) {
  return mixHexWithWhite(
    normalizeCalendarColor(color),
    CALENDAR_TASK_BACKGROUND_WHITE_MIX,
  );
}

/** Title color derived from the block background at 50% brightness. */
export function decreaseHexBrightness(hex: string, factor = 0.5) {
  const { r, g, b } = parseHexRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}

export function getCalendarTaskTitleColor(backgroundColor: string) {
  return decreaseHexBrightness(backgroundColor, 0.5);
}
