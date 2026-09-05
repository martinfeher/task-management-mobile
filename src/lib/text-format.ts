import {
  detailsHtmlToPlainText,
} from "@/lib/task-content";
import { getPlainTextStyleSegments } from "@/lib/html-to-text-runs";
import {
  TEXT_FONT_FAMILY_OPTIONS,
  type TextFontFamilyId,
} from "@/lib/text-font-families";

export type { TextFontFamilyId };
export { TEXT_FONT_FAMILY_OPTIONS };

export type TextBlockType = "text" | "h1" | "h2" | "h3";

export type TextFormatAction =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "code"
  | "superscript"
  | "subscript"
  | "link"
  | "checklist"
  | "bullet"
  | "numbered"
  | "color"
  | "highlight"
  | "fontSize"
  | "lineHeight"
  | "blockType"
  | "fontFamily"
  | "clearFormatting";

export const TEXT_BLOCK_OPTIONS = [
  { type: "text", label: "Body text" },
  { type: "h1", label: "Heading 1" },
  { type: "h2", label: "Heading 2" },
  { type: "h3", label: "Heading 3" },
] as const satisfies readonly { type: TextBlockType; label: string }[];

const TEXT_BLOCK_TYPE_STYLES: Record<TextBlockType, Record<string, string>> = {
  text: { "font-size": "17px", "font-weight": "400" },
  h1: { "font-size": "24px", "font-weight": "700" },
  h2: { "font-size": "20px", "font-weight": "700" },
  h3: { "font-size": "18px", "font-weight": "600" },
};

/** Subset shown in the mobile format toolbar (matches web toolbar ordering). */
export function getTextFormatFontFamilyOptions() {
  const inter = TEXT_FONT_FAMILY_OPTIONS.find((option) => option.id === "inter");
  const sansSerif = TEXT_FONT_FAMILY_OPTIONS.find((option) => option.id === "sans-serif");
  const serif = TEXT_FONT_FAMILY_OPTIONS.find((option) => option.id === "serif");
  const monospace = TEXT_FONT_FAMILY_OPTIONS.find((option) => option.id === "monospace");
  const sfPro = TEXT_FONT_FAMILY_OPTIONS.find((option) => option.id === "sf-pro");
  const lora = TEXT_FONT_FAMILY_OPTIONS.find((option) => option.id === "lora");
  const greatVibes = TEXT_FONT_FAMILY_OPTIONS.find((option) => option.id === "great-vibes");

  return [inter, sansSerif, serif, monospace, sfPro, lora, greatVibes].filter(
    (option): option is (typeof TEXT_FONT_FAMILY_OPTIONS)[number] => Boolean(option),
  );
}

export const TEXT_COLOR_OPTIONS = [
  { label: "Charcoal", value: "#323232" },
  { label: "Dark gray", value: "#555555" },
  { label: "Gray", value: "#8d8d8d" },
  { label: "Light gray", value: "#c7c7c7" },
  { label: "White", value: "#ffffff" },
  { label: "Purple", value: "#6b22b5" },
  { label: "Magenta", value: "#b624b6" },
  { label: "Red", value: "#ff1e3e" },
  { label: "Orange", value: "#ff5d23" },
  { label: "Yellow", value: "#e9a523" },
  { label: "Green", value: "#1daa3a" },
  { label: "Teal", value: "#19abb6" },
  { label: "Blue", value: "#1d88e5" },
  { label: "Navy", value: "#163a91" },
] as const;

/** Matches web `HIGHLIGHT_COLOR_OPTIONS` in task-details-panel.tsx */
export const TEXT_HIGHLIGHT_OPTIONS = [
  { label: "None", value: "#ffffff" },
  { label: "Gray", value: "#f3f4f6" },
  { label: "Beige", value: "#f5f0e6" },
  { label: "Peach", value: "#ffedd5" },
  { label: "Yellow", value: "#fef08a" },
  { label: "Mint", value: "#d1fae5" },
  { label: "Blue", value: "#bae6fd" },
  { label: "Purple", value: "#e9d5ff" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Red", value: "#fecaca" },
] as const;

export const TEXT_FONT_SIZE_OPTIONS = [12, 14, 16, 17, 18, 20, 24] as const;

export type TextFontSizeOption = (typeof TEXT_FONT_SIZE_OPTIONS)[number];

export const TEXT_FONT_SIZE_MIN = 8;
export const TEXT_FONT_SIZE_MAX = 96;

export const TEXT_LINE_HEIGHT_MIN = 1;
export const TEXT_LINE_HEIGHT_MAX = 2.5;
export const TEXT_LINE_HEIGHT_STEP = 0.1;
export const DEFAULT_LINE_HEIGHT = 1.5;

export function roundLineHeight(value: number) {
  return Math.round(value / TEXT_LINE_HEIGHT_STEP) * TEXT_LINE_HEIGHT_STEP;
}

type TextRange = { start: number; end: number };

const HTML_INLINE_FORMAT = {
  bold: [
    { open: "<b>", close: "</b>" },
    { open: "<strong>", close: "</strong>" },
  ],
  italic: [
    { open: "<i>", close: "</i>" },
    { open: "<em>", close: "</em>" },
  ],
  underline: [{ open: "<u>", close: "</u>" }],
  strikethrough: [
    { open: "<s>", close: "</s>" },
    { open: "<strike>", close: "</strike>" },
    { open: "<del>", close: "</del>" },
  ],
  code: [{ open: "<code>", close: "</code>" }],
  superscript: [{ open: "<sup>", close: "</sup>" }],
  subscript: [{ open: "<sub>", close: "</sub>" }],
} as const;

type HtmlInlineAction = keyof typeof HTML_INLINE_FORMAT;

const HTML_INLINE_WRAP_TAG = {
  bold: { open: "<b>", close: "</b>" },
  italic: { open: "<i>", close: "</i>" },
  underline: { open: "<u>", close: "</u>" },
  strikethrough: { open: "<s>", close: "</s>" },
  code: { open: "<code>", close: "</code>" },
  superscript: { open: "<sup>", close: "</sup>" },
  subscript: { open: "<sub>", close: "</sub>" },
} as const;

import { plainRangeToHtmlRange } from "@/lib/html-plain-mapping";

function wrapHtmlRange(
  html: string,
  range: TextRange,
  wrapper: { open: string; close: string },
) {
  const selected = html.slice(range.start, range.end);
  return (
    html.slice(0, range.start) +
    wrapper.open +
    selected +
    wrapper.close +
    html.slice(range.end)
  );
}

function applyLink(
  html: string,
  plainText: string,
  range: TextRange,
  url: string,
  linkText?: string,
) {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return { html, plainText, selection: range };

  const selectedPlain = plainText.slice(range.start, range.end);
  const displayText = (linkText ?? selectedPlain).trim();
  if (!displayText) return { html, plainText, selection: range };

  const htmlRange = plainRangeToHtmlRange(html, range.start, range.end);
  if (!htmlRange) return { html, plainText, selection: range };

  const safeUrl = trimmedUrl
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const linkedHtml = `<a href="${safeUrl}">${escapeHtml(displayText)}</a>`;
  const nextHtml =
    html.slice(0, htmlRange.start) + linkedHtml + html.slice(htmlRange.end);
  const nextPlainText = detailsHtmlToPlainText(nextHtml);

  return {
    html: nextHtml,
    plainText: nextPlainText,
    selection: {
      start: range.start,
      end: range.start + displayText.length,
    },
  };
}

function wrapStyledSpan(
  html: string,
  range: TextRange,
  style: Record<string, string>,
) {
  const styleAttr = Object.entries(style)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
  return wrapHtmlRange(html, range, {
    open: `<span style="${styleAttr}">`,
    close: "</span>",
  });
}

function stripHighlightSpans(fragment: string) {
  return fragment
    .replace(/<span style="background-color:[^";]*;?">/gi, "")
    .replace(/<\/span>/gi, "");
}

function stripColorSpans(fragment: string) {
  return fragment
    .replace(/<span style="color:[^";]*;?">/gi, "")
    .replace(/<\/span>/gi, "");
}

function stripInlineTags(fragment: string) {
  return fragment.replace(/<\/?[^>]+>/g, "");
}

const INLINE_FORMATTING_TAGS = new Set([
  "span",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "del",
  "code",
  "sup",
  "sub",
  "a",
]);

function readOpeningInlineTag(html: string, index: number) {
  if (html[index] !== "<") return null;

  const tagEnd = html.indexOf(">", index);
  if (tagEnd === -1) return null;

  const inner = html.slice(index + 1, tagEnd).trim();
  if (!inner || inner.startsWith("/")) return null;

  const name = inner.split(/\s/)[0]?.toLowerCase() ?? "";
  if (!INLINE_FORMATTING_TAGS.has(name)) return null;

  return { name, openStart: index, openEnd: tagEnd + 1 };
}

/** Grow an HTML slice until it fully contains overlapping inline format tags. */
function expandHtmlRangeToInlineTags(html: string, range: TextRange): TextRange {
  let { start, end } = range;
  let changed = true;

  while (changed) {
    changed = false;

    for (let index = 0; index < html.length; ) {
      const tag = readOpeningInlineTag(html, index);
      if (!tag) {
        index += 1;
        continue;
      }

      const closeTag = `</${tag.name}>`;
      const closeIdx = html.indexOf(closeTag, tag.openEnd);
      if (closeIdx === -1) {
        index = tag.openEnd;
        continue;
      }

      const closeEnd = closeIdx + closeTag.length;
      if (start < closeEnd && end > tag.openStart) {
        const nextStart = Math.min(start, tag.openStart);
        const nextEnd = Math.max(end, closeEnd);
        if (nextStart !== start || nextEnd !== end) {
          start = nextStart;
          end = nextEnd;
          changed = true;
        }
      }

      index = tag.openEnd;
    }
  }

  return { start, end };
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clearFormattingInRange(html: string, range: TextRange) {
  const expanded = expandHtmlRangeToInlineTags(html, range);
  const plain = detailsHtmlToPlainText(html.slice(expanded.start, expanded.end));
  return html.slice(0, expanded.start) + escapeHtml(plain) + html.slice(expanded.end);
}

function applyHighlight(html: string, range: TextRange, color: string) {
  let start = range.start;
  let end = range.end;

  const highlightOpenPattern = /<span style="background-color:[^"]*">/gi;
  let match: RegExpExecArray | null;
  while ((match = highlightOpenPattern.exec(html)) !== null) {
    const openEnd = match.index + match[0].length;
    const closeIdx = html.indexOf("</span>", openEnd);
    if (closeIdx === -1) continue;

    const closeEnd = closeIdx + "</span>".length;
    if (start >= match.index && end <= closeEnd) {
      start = match.index;
      end = closeEnd;
      break;
    }
  }

  const selected = stripInlineTags(stripHighlightSpans(html.slice(start, end)));
  if (color === "#ffffff") {
    return html.slice(0, start) + selected + html.slice(end);
  }

  return (
    html.slice(0, start) +
    `<span style="background-color:${color}">` +
    selected +
    "</span>" +
    html.slice(end)
  );
}

const DEFAULT_TEXT_COLOR = "#374151";

function applyColor(html: string, range: TextRange, color: string) {
  let start = range.start;
  let end = range.end;

  const colorOpenPattern = /<span style="color:[^"]*">/gi;
  let match: RegExpExecArray | null;
  while ((match = colorOpenPattern.exec(html)) !== null) {
    const openEnd = match.index + match[0].length;
    const closeIdx = html.indexOf("</span>", openEnd);
    if (closeIdx === -1) continue;

    const closeEnd = closeIdx + "</span>".length;
    if (start >= match.index && end <= closeEnd) {
      start = match.index;
      end = closeEnd;
      break;
    }
  }

  const selected = stripInlineTags(stripColorSpans(html.slice(start, end)));
  if (color.toLowerCase() === DEFAULT_TEXT_COLOR.toLowerCase()) {
    return html.slice(0, start) + selected + html.slice(end);
  }

  return (
    html.slice(0, start) +
    `<span style="color:${color}">` +
    selected +
    "</span>" +
    html.slice(end)
  );
}

function toggleHtmlInlineFormat(
  html: string,
  range: TextRange,
  action: HtmlInlineAction,
) {
  for (const { open, close } of HTML_INLINE_FORMAT[action]) {
    const before = html.slice(Math.max(0, range.start - open.length), range.start);
    const after = html.slice(range.end, range.end + close.length);

    if (before === open && after === close) {
      return (
        html.slice(0, range.start - open.length) +
        html.slice(range.start, range.end) +
        html.slice(range.end + close.length)
      );
    }
  }

  return wrapHtmlRange(html, range, HTML_INLINE_WRAP_TAG[action]);
}

function getLineBounds(plainText: string, index: number) {
  const lineStart = plainText.lastIndexOf("\n", index - 1) + 1;
  const nextNewline = plainText.indexOf("\n", lineStart);
  const lineEnd = nextNewline === -1 ? plainText.length : nextNewline;
  return { lineStart, lineEnd };
}

function stripListPrefix(trimmed: string) {
  return trimmed
    .replace(/^☐\s|^☑\s/, "")
    .replace(/^•\s/, "")
    .replace(/^\d+\.\s/, "");
}

function applyLineListFormat(
  plainText: string,
  selection: TextRange,
  type: "checklist" | "bullet" | "numbered",
) {
  const blockStart = getLineBounds(plainText, selection.start).lineStart;
  const blockEnd = getLineBounds(
    plainText,
    Math.max(selection.start, selection.end - 1),
  ).lineEnd;
  const block = plainText.slice(blockStart, blockEnd);
  const lines = block.split("\n");

  let number = 1;
  const nextLines = lines.map((line) => {
    const trimmed = line.trimStart();
    const indent = line.slice(0, line.length - trimmed.length);

    if (type === "checklist") {
      if (trimmed.startsWith("☐ ") || trimmed.startsWith("☑ ")) return line;
      return `${indent}☐ ${stripListPrefix(trimmed)}`;
    }

    if (type === "bullet") {
      if (trimmed.startsWith("• ")) return line;
      return `${indent}• ${stripListPrefix(trimmed)}`;
    }

    if (/^\d+\.\s/.test(trimmed)) return line;
    const nextLine = `${indent}${number}. ${stripListPrefix(trimmed)}`;
    number += 1;
    return nextLine;
  });

  const nextBlock = nextLines.join("\n");
  if (nextBlock === block) {
    return { plainText, selection };
  }

  const nextPlain =
    plainText.slice(0, blockStart) + nextBlock + plainText.slice(blockEnd);
  const delta = nextPlain.length - plainText.length;

  return {
    plainText: nextPlain,
    selection: {
      start: selection.start,
      end: selection.end + delta,
    },
  };
}

function isHtmlInlineAction(action: TextFormatAction): action is HtmlInlineAction {
  return action in HTML_INLINE_FORMAT;
}

function applyLineBlockTypeFormat(
  html: string,
  plainText: string,
  selection: TextRange,
  blockType: TextBlockType,
) {
  const blockStart = getLineBounds(plainText, selection.start).lineStart;
  const blockEnd = getLineBounds(
    plainText,
    Math.max(selection.start, selection.end - 1),
  ).lineEnd;
  const htmlRange = plainRangeToHtmlRange(html, blockStart, blockEnd);
  if (!htmlRange) return { html, plainText, selection };

  const nextHtml = wrapStyledSpan(html, htmlRange, TEXT_BLOCK_TYPE_STYLES[blockType]);
  return {
    html: nextHtml,
    plainText: detailsHtmlToPlainText(nextHtml),
    selection,
  };
}

export function applyTextFormat(
  html: string,
  plainText: string,
  selection: TextRange,
  action: TextFormatAction,
  options?: {
    linkUrl?: string;
    linkText?: string;
    color?: string;
    highlightColor?: string;
    fontSize?: number;
    lineHeight?: number;
    blockType?: TextBlockType;
    fontFamily?: string;
  },
) {
  if (action === "checklist" || action === "bullet" || action === "numbered") {
    const result = applyLineListFormat(plainText, selection, action);
    if (result.plainText === plainText) return { html, plainText, selection };

    const nextHtml = result.plainText.replace(/\n/g, "<br>");
    return {
      html: nextHtml,
      plainText: result.plainText,
      selection: result.selection,
    };
  }

  const htmlRange = plainRangeToHtmlRange(html, selection.start, selection.end);
  if (!htmlRange) return { html, plainText, selection };

  if (action === "clearFormatting") {
    const nextHtml = clearFormattingInRange(html, htmlRange);
    return {
      html: nextHtml,
      plainText: detailsHtmlToPlainText(nextHtml),
      selection,
    };
  }

  if (isHtmlInlineAction(action)) {
    const nextHtml = toggleHtmlInlineFormat(html, htmlRange, action);
    return {
      html: nextHtml,
      plainText: detailsHtmlToPlainText(nextHtml),
      selection,
    };
  }

  if (action === "link") {
    return applyLink(
      html,
      plainText,
      selection,
      options?.linkUrl ?? "",
      options?.linkText,
    );
  }

  if (action === "color") {
    const color = options?.color ?? TEXT_COLOR_OPTIONS[0].value;
    const nextHtml = applyColor(html, htmlRange, color);
    return {
      html: nextHtml,
      plainText: detailsHtmlToPlainText(nextHtml),
      selection,
    };
  }

  if (action === "highlight") {
    const highlightColor =
      options?.highlightColor ?? TEXT_HIGHLIGHT_OPTIONS[4].value;
    const nextHtml = applyHighlight(html, htmlRange, highlightColor);
    return {
      html: nextHtml,
      plainText: detailsHtmlToPlainText(nextHtml),
      selection,
    };
  }

  if (action === "fontSize") {
    const fontSize = options?.fontSize ?? 17;
    const nextHtml = wrapStyledSpan(html, htmlRange, {
      "font-size": `${fontSize}px`,
    });
    return {
      html: nextHtml,
      plainText: detailsHtmlToPlainText(nextHtml),
      selection,
    };
  }

  if (action === "lineHeight") {
    const lineHeight = roundLineHeight(options?.lineHeight ?? DEFAULT_LINE_HEIGHT);
    const nextHtml = wrapStyledSpan(html, htmlRange, {
      "line-height": String(lineHeight),
    });
    return {
      html: nextHtml,
      plainText: detailsHtmlToPlainText(nextHtml),
      selection,
    };
  }

  if (action === "blockType") {
    const blockType = options?.blockType ?? "text";
    return applyLineBlockTypeFormat(html, plainText, selection, blockType);
  }

  if (action === "fontFamily") {
    const fontFamily =
      options?.fontFamily ?? getTextFormatFontFamilyOptions()[0]?.value ?? "";
    if (!fontFamily) return { html, plainText, selection };

    const nextHtml = wrapStyledSpan(html, htmlRange, {
      "font-family": fontFamily,
    });
    return {
      html: nextHtml,
      plainText: detailsHtmlToPlainText(nextHtml),
      selection,
    };
  }

  return { html, plainText, selection };
}

export function hasTextSelection(selection: TextRange) {
  return selection.end > selection.start;
}

export function getEffectiveSelection(
  current: TextRange,
  lastNonCollapsed: TextRange,
) {
  if (current.end > current.start) return current;
  if (lastNonCollapsed.end > lastNonCollapsed.start) return lastNonCollapsed;
  return current;
}

/** Returns whether bold is active at the caret or across the full selection. */
export function getSelectionBoldActive(
  html: string,
  selection: TextRange,
): boolean {
  const segments = getPlainTextStyleSegments(html);

  if (selection.end > selection.start) {
    const overlapping = segments.filter(
      (segment) => segment.end > selection.start && segment.start < selection.end,
    );
    if (overlapping.length === 0) return false;
    return overlapping.every((segment) => segment.style.bold);
  }

  const probeIndex = selection.start > 0 ? selection.start - 1 : selection.start;
  const segment = segments.find(
    (entry) => entry.start <= probeIndex && entry.end > probeIndex,
  );
  return segment?.style.bold ?? false;
}

/** Returns the highlight color when the full selection shares one highlight. */
export function getSelectionHighlightColor(
  html: string,
  selection: TextRange,
): string | null {
  if (!hasTextSelection(selection)) return null;

  const segments = getPlainTextStyleSegments(html);
  const overlapping = segments.filter(
    (segment) => segment.end > selection.start && segment.start < selection.end,
  );
  if (overlapping.length === 0) return null;

  const colors = new Set(
    overlapping
      .map((segment) => segment.style.highlightColor)
      .filter((color): color is string => !!color && color.toLowerCase() !== "#ffffff"),
  );

  if (colors.size !== 1) return null;
  return [...colors][0] ?? null;
}

const DEFAULT_FONT_SIZE = 17;

/** Returns the font size when the full selection shares one size (falls back to the default). */
export function getSelectionFontSize(
  html: string,
  selection: TextRange,
): number | null {
  if (!hasTextSelection(selection)) return null;

  const segments = getPlainTextStyleSegments(html);
  const overlapping = segments.filter(
    (segment) => segment.end > selection.start && segment.start < selection.end,
  );
  if (overlapping.length === 0) return null;

  const sizes = new Set(
    overlapping.map((segment) => segment.style.fontSize ?? DEFAULT_FONT_SIZE),
  );

  if (sizes.size !== 1) return null;
  return [...sizes][0] ?? null;
}

/** Returns the line-height multiplier when the full selection shares one value. */
export function getSelectionLineHeight(
  html: string,
  selection: TextRange,
): number | null {
  if (!hasTextSelection(selection)) return null;

  const segments = getPlainTextStyleSegments(html);
  const overlapping = segments.filter(
    (segment) => segment.end > selection.start && segment.start < selection.end,
  );
  if (overlapping.length === 0) return null;

  const lineHeights = new Set(
    overlapping.map((segment) => segment.style.lineHeight ?? DEFAULT_LINE_HEIGHT),
  );

  if (lineHeights.size !== 1) return null;
  return [...lineHeights][0] ?? null;
}

function fontFamilyIdToCssValue(
  fontFamilyId: TextFontFamilyId | undefined,
): string | null {
  if (!fontFamilyId) return null;
  return (
    TEXT_FONT_FAMILY_OPTIONS.find((option) => option.id === fontFamilyId)?.value ??
    null
  );
}

/** Returns the font-family CSS value when the caret or full selection shares one family. */
export function getSelectionFontFamily(
  html: string,
  selection: TextRange,
): string | null {
  const segments = getPlainTextStyleSegments(html);

  if (selection.end > selection.start) {
    const overlapping = segments.filter(
      (segment) => segment.end > selection.start && segment.start < selection.end,
    );
    if (overlapping.length === 0) return null;
    const ids = overlapping.map((segment) => segment.style.fontFamilyId);
    const unique = new Set(ids);
    if (unique.size !== 1) return null;
    return fontFamilyIdToCssValue([...unique][0]);
  }

  const probeIndex = selection.start > 0 ? selection.start - 1 : selection.start;
  const segment = segments.find(
    (entry) => entry.start <= probeIndex && entry.end > probeIndex,
  );
  return fontFamilyIdToCssValue(segment?.style.fontFamilyId);
}

export { plainRangeToHtmlRange } from "@/lib/html-plain-mapping";
