const TASK_EDIT_SHEET_BACKGROUND_BASE = "#FFFFFF";

function parseHexRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function channelToHex(channel: number) {
  return Math.max(0, Math.min(255, Math.round(channel)))
    .toString(16)
    .padStart(2, "0");
}

/** Mixes `whitePercent` of white into `hex` (brightens toward #FFFFFF). */
export function brightenHexTowardWhite(hex: string, whitePercent: number) {
  const { r, g, b } = parseHexRgb(hex);
  const mix = whitePercent / 100;
  return `#${channelToHex(r * (1 - mix) + 255 * mix)}${channelToHex(g * (1 - mix) + 255 * mix)}${channelToHex(b * (1 - mix) + 255 * mix)}`.toUpperCase();
}

/** Task edit sheet surface — base #FFFFFF brightened 15% toward white. */
export const TASK_EDIT_SHEET_BACKGROUND = brightenHexTowardWhite(
  TASK_EDIT_SHEET_BACKGROUND_BASE,
  15,
);

const TASK_SHEET_COLLAPSED_HEIGHT_BASE = 0.47;

/** Default collapsed task sheet height (+15%). */
export const TASK_SHEET_MIN_HEIGHT_FRACTION =
  TASK_SHEET_COLLAPSED_HEIGHT_BASE * 1.15;

/** Matches Tailwind `gray-100` — expand / full-screen control circle. */
const TASK_EDIT_EXPAND_ICON_BACKGROUND_BASE = "#F3F4F6";

/** Expand icon circle on task edit (+15% toward white). */
export const TASK_EDIT_EXPAND_ICON_BACKGROUND = brightenHexTowardWhite(
  TASK_EDIT_EXPAND_ICON_BACKGROUND_BASE,
  15,
);