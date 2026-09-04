import {
  cssFontFamilyToMobileId,
  pickMobileFontFamily,
  usesCustomFontFamily,
} from "@/lib/detail-fonts-mobile";
import type { TextFontFamilyId } from "@/lib/text-font-families";

export type TextRunStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  color?: string;
  highlightColor?: string;
  fontSize?: number;
  fontFamilyId?: TextFontFamilyId;
};

export type TextRun = {
  text: string;
  style: TextRunStyle;
};

type ActiveStyle = TextRunStyle;

const TAG_STYLE: Record<string, Partial<ActiveStyle>> = {
  b: { bold: true },
  strong: { bold: true },
  i: { italic: true },
  em: { italic: true },
  u: { underline: true },
  s: { strikethrough: true },
  strike: { strikethrough: true },
  del: { strikethrough: true },
  code: { code: true },
};

function decodeEntity(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

function extractStyleAttributeValue(attr: string) {
  const quoted =
    attr.match(/style\s*=\s*"([^"]*)"/i) ?? attr.match(/style\s*=\s*'([^']*)'/i);
  return quoted?.[1] ?? attr;
}

function parseSpanStyle(attr: string): Partial<ActiveStyle> {
  const style: Partial<ActiveStyle> = {};
  const styleContent = extractStyleAttributeValue(attr);
  const colorMatch = styleContent.match(/(?:^|;|\s)color:\s*([^;"']+)/i);
  const backgroundMatch = styleContent.match(/background-color:\s*([^;"']+)/i);
  const sizeMatch = styleContent.match(/font-size:\s*(\d+(?:\.\d+)?)px/i);
  const fontFamilyMatch = styleContent.match(/font-family:\s*([^;]+)/i);
  if (colorMatch?.[1]) style.color = colorMatch[1].trim();
  if (backgroundMatch?.[1]) style.highlightColor = backgroundMatch[1].trim();
  if (sizeMatch?.[1]) style.fontSize = Number(sizeMatch[1]);
  if (fontFamilyMatch?.[1]) {
    const fontFamilyId = cssFontFamilyToMobileId(fontFamilyMatch[1].trim());
    if (fontFamilyId) style.fontFamilyId = fontFamilyId;
  }
  return style;
}

function mergeStyles(stack: ActiveStyle[]): ActiveStyle {
  return stack.reduce<ActiveStyle>((acc, item) => ({ ...acc, ...item }), {});
}

function pushRun(runs: TextRun[], text: string, style: ActiveStyle) {
  if (!text) return;
  runs.push({ text, style: { ...style } });
}

export function htmlToTextRuns(html: string): TextRun[] {
  const source = html.trim();
  if (!source) return [];

  const runs: TextRun[] = [];
  const stack: ActiveStyle[] = [{}];
  const tokenPattern = /<\/?([a-z0-9]+)([^>]*)>|([^<]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(source)) !== null) {
    const [, tagName, rawAttrs, textChunk] = match;
    if (textChunk) {
      pushRun(runs, decodeEntity(textChunk), mergeStyles(stack));
      continue;
    }

    const tag = tagName.toLowerCase();
    const isClosing = match[0].startsWith("</");

    if (tag === "br") {
      pushRun(runs, "\n", mergeStyles(stack));
      continue;
    }

    if (tag === "p" || tag === "div") {
      if (isClosing && runs.length > 0) {
        pushRun(runs, "\n", mergeStyles(stack));
      }
      continue;
    }

    if (isClosing) {
      if (stack.length > 1) stack.pop();
      continue;
    }

    if (tag === "span") {
      stack.push(parseSpanStyle(rawAttrs));
      continue;
    }

    const nextStyle = TAG_STYLE[tag];
    if (nextStyle) {
      stack.push(nextStyle);
    }
  }

  return runs;
}

export function runToTextStyle(
  runStyle: TextRunStyle,
  base?: { fontSize?: number; lineHeight?: number; color?: string },
) {
  const fontFamily = pickMobileFontFamily(runStyle.fontFamilyId, {
    bold: runStyle.bold,
    italic: runStyle.italic,
    code: runStyle.code,
  });
  const useSystemTypography = !fontFamily || !usesCustomFontFamily(fontFamily);

  const style = {
    fontSize: runStyle.fontSize ?? base?.fontSize ?? 17,
    lineHeight: base?.lineHeight ?? 26,
    color: runStyle.color ?? base?.color ?? "#374151",
    fontWeight: useSystemTypography
      ? runStyle.bold
        ? ("700" as const)
        : ("400" as const)
      : undefined,
    fontStyle: useSystemTypography
      ? runStyle.italic
        ? ("italic" as const)
        : ("normal" as const)
      : undefined,
    textDecorationLine:
      runStyle.underline && runStyle.strikethrough
        ? ("underline line-through" as const)
        : runStyle.underline
          ? ("underline" as const)
          : runStyle.strikethrough
            ? ("line-through" as const)
            : ("none" as const),
    fontFamily,
    backgroundColor:
      runStyle.highlightColor ??
      (runStyle.code ? "rgba(17, 24, 39, 0.08)" : undefined),
    borderRadius: runStyle.code || runStyle.highlightColor ? 3 : undefined,
  };

  return style;
}

/**
 * Mirror styles aligned with the formatted Text runs. Uses real fontWeight /
 * fontStyle so bold/italic stay crisp (textShadow-based faux bold looked fuzzy
 * on iOS, especially through the transparent TextInput overlay).
 */
export function runToMirrorTextStyle(
  runStyle: TextRunStyle,
  base?: { fontSize?: number; lineHeight?: number; color?: string },
) {
  return runToTextStyle(runStyle, base);
}

/**
 * Mirror styles used while the transparent TextInput is focused. Keeps the same
 * metrics as the plain TextInput so double-tap selection stays accurate, but
 * still renders color/highlight/decoration from the stored HTML.
 */
export function runToEditingMirrorStyle(
  runStyle: TextRunStyle,
  base?: { fontSize?: number; lineHeight?: number; color?: string },
) {
  const fontSize = base?.fontSize ?? 17;
  const lineHeight = base?.lineHeight ?? 26;

  return {
    fontSize,
    lineHeight,
    color: runStyle.color ?? base?.color ?? "#374151",
    fontWeight: "400" as const,
    fontStyle: "normal" as const,
    textDecorationLine:
      runStyle.underline && runStyle.strikethrough
        ? ("underline line-through" as const)
        : runStyle.underline
          ? ("underline" as const)
          : runStyle.strikethrough
            ? ("line-through" as const)
            : ("none" as const),
    backgroundColor:
      runStyle.highlightColor ??
      (runStyle.code ? "rgba(17, 24, 39, 0.08)" : undefined),
    borderRadius: runStyle.code || runStyle.highlightColor ? 3 : undefined,
  };
}

export function htmlHasInlineFormatting(html: string) {
  return /<(b|strong|i|em|u|s|strike|del|code|span)\b/i.test(html);
}

/** True when HTML has span-based styling native enriched cannot render (color, highlight, fonts). */
export function htmlNeedsFormattingMirror(html: string) {
  const defaultTextColor = "#374151";
  return htmlToTextRuns(html).some((run) => {
    const color = run.style.color?.toLowerCase();
    return (
      Boolean(run.style.highlightColor) ||
      Boolean(color && color !== defaultTextColor) ||
      Boolean(run.style.fontSize) ||
      Boolean(run.style.fontFamilyId)
    );
  });
}

export function getPlainTextStyleSegments(html: string) {
  const runs = htmlToTextRuns(html);
  let offset = 0;
  return runs.map((run) => {
    const start = offset;
    offset += run.text.length;
    return { start, end: offset, style: run.style };
  });
}
