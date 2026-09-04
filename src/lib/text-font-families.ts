import { DETAIL_FONT_FAMILY_CSS_VALUES } from "@/lib/task-document/detail-font-families";

export type TextFontFamilyId =
  | "sans-serif"
  | "inter"
  | "sf-pro"
  | "euclid-circular"
  | "serif"
  | "monospace"
  | "lora"
  | "great-vibes";

export const TEXT_FONT_FAMILY_OPTIONS: {
  id: TextFontFamilyId;
  label: string;
  value: string;
}[] = [
  {
    id: "sans-serif",
    label: "Sans Serif",
    value: DETAIL_FONT_FAMILY_CSS_VALUES[0],
  },
  {
    id: "inter",
    label: "Inter",
    value: DETAIL_FONT_FAMILY_CSS_VALUES[1],
  },
  {
    id: "sf-pro",
    label: "SF Pro",
    value: DETAIL_FONT_FAMILY_CSS_VALUES[2],
  },
  {
    id: "euclid-circular",
    label: "Euclid Circular",
    value: DETAIL_FONT_FAMILY_CSS_VALUES[3],
  },
  {
    id: "serif",
    label: "Serif",
    value: DETAIL_FONT_FAMILY_CSS_VALUES[4],
  },
  {
    id: "monospace",
    label: "Monospace",
    value: DETAIL_FONT_FAMILY_CSS_VALUES[5],
  },
  {
    id: "lora",
    label: "Lora",
    value: DETAIL_FONT_FAMILY_CSS_VALUES[6],
  },
  {
    id: "great-vibes",
    label: "Great Vibes",
    value: DETAIL_FONT_FAMILY_CSS_VALUES[7],
  },
];
