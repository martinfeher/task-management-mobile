import type { TaskLabel } from "@/types/todo";

export type LabelLike = Pick<TaskLabel, "id" | "label" | "color">;

export type LabelColor = {
  dot: string;
};

export const LABEL_PRESET_COLORS: LabelColor[] = [
  { dot: "#4873c7" },
  { dot: "#22c55e" },
  { dot: "#f59e0b" },
  { dot: "#ec4899" },
  { dot: "#8b5cf6" },
  { dot: "#f97316" },
  { dot: "#06b6d4" },
  { dot: "#ef4444" },
  { dot: "#6366f1" },
  { dot: "#84cc16" },
];

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function normalizeHex(color: string) {
  const trimmed = color.trim();
  if (!trimmed.startsWith("#")) {
    return `#${trimmed}`;
  }
  return trimmed;
}

function findPresetByDot(dot: string) {
  const normalized = normalizeHex(dot).toLowerCase();
  return LABEL_PRESET_COLORS.find(
    (entry) => entry.dot.toLowerCase() === normalized,
  );
}

export function getLabelColorKey(label: LabelLike) {
  return label.label.trim().toLowerCase() || label.id;
}

export function getLabelColor(label: LabelLike): LabelColor {
  if (label.color) {
    const preset = findPresetByDot(label.color);
    if (preset) return preset;
    return { dot: normalizeHex(label.color) };
  }

  const key = getLabelColorKey(label);
  return LABEL_PRESET_COLORS[hashString(key) % LABEL_PRESET_COLORS.length];
}

export function getLabelDotColor(label: LabelLike) {
  return getLabelColor(label).dot;
}
