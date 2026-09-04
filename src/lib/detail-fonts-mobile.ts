import { Platform } from "react-native";

import { resolveDetailFontFamilyCss } from "@/lib/task-document/detail-font-families";
import {
  TEXT_FONT_FAMILY_OPTIONS,
  type TextFontFamilyId,
} from "@/lib/text-font-families";

type CustomFontId = Extract<
  TextFontFamilyId,
  "inter" | "sf-pro" | "lora" | "great-vibes"
>;

const CUSTOM_FONT_FACES: Record<
  CustomFontId,
  {
    regular: string;
    bold: string;
    regularItalic: string;
    boldItalic: string;
  }
> = {
  inter: {
    regular: "Inter_400Regular",
    bold: "Inter_700Bold",
    regularItalic: "Inter_400Regular_Italic",
    boldItalic: "Inter_700Bold_Italic",
  },
  "sf-pro": {
    regular: "SFProText-Regular",
    bold: "SFProText-Bold",
    regularItalic: "SFProText-RegularItalic",
    boldItalic: "SFProText-BoldItalic",
  },
  lora: {
    regular: "Lora_400Regular",
    bold: "Lora_700Bold",
    regularItalic: "Lora_400Regular_Italic",
    boldItalic: "Lora_700Bold_Italic",
  },
  "great-vibes": {
    regular: "GreatVibes_400Regular",
    bold: "GreatVibes_400Regular",
    regularItalic: "GreatVibes_400Regular",
    boldItalic: "GreatVibes_400Regular",
  },
};

function normalizeFontFamilyName(value: string) {
  return value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchFontFamilyId(raw: string): TextFontFamilyId | undefined {
  const resolved = resolveDetailFontFamilyCss(raw);
  if (resolved) {
    return TEXT_FONT_FAMILY_OPTIONS.find((option) => option.value === resolved)?.id;
  }

  const normalized = normalizeFontFamilyName(raw);
  if (!normalized) return undefined;

  for (const option of TEXT_FONT_FAMILY_OPTIONS) {
    if (normalized.includes(option.id.replace(/-/g, " "))) {
      return option.id;
    }
  }

  if (/\binter\b/.test(normalized)) return "inter";
  if (normalized.includes("sf pro") || normalized.includes("sf-pro")) return "sf-pro";
  if (/\blora\b/.test(normalized)) return "lora";
  if (normalized.includes("great vibes") || normalized.includes("great-vibes")) {
    return "great-vibes";
  }
  if (normalized.includes("monospace") || normalized.includes("menlo")) {
    return "monospace";
  }
  if (normalized.includes("georgia") || normalized.includes("serif")) {
    return "serif";
  }
  if (
    normalized.includes("sans-serif") ||
    normalized.includes("system-ui") ||
    normalized.includes("ui-sans-serif")
  ) {
    return "sans-serif";
  }

  return undefined;
}

export function cssFontFamilyToMobileId(raw: string | undefined) {
  if (!raw?.trim()) return undefined;
  return matchFontFamilyId(raw);
}

export function pickMobileFontFamily(
  fontId: TextFontFamilyId | undefined,
  opts: { bold?: boolean; italic?: boolean; code?: boolean },
): string | undefined {
  if (opts.code || fontId === "monospace") {
    return Platform.select({ ios: "Menlo", default: "monospace" });
  }

  if (!fontId || fontId === "sans-serif" || fontId === "euclid-circular") {
    return undefined;
  }

  if (fontId === "serif") {
    return Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" });
  }

  const faces = CUSTOM_FONT_FACES[fontId as CustomFontId];
  if (!faces) return undefined;

  if (opts.bold && opts.italic) return faces.boldItalic;
  if (opts.bold) return faces.bold;
  if (opts.italic) return faces.regularItalic;
  return faces.regular;
}

export function pickToolbarPreviewFontFamily(fontId: TextFontFamilyId) {
  return pickMobileFontFamily(fontId, {}) ?? undefined;
}

export function usesCustomFontFamily(fontFamily: string | undefined) {
  if (!fontFamily) return false;
  return Object.values(CUSTOM_FONT_FACES).some((faces) =>
    Object.values(faces).includes(fontFamily),
  );
}
