import {
  cssFontFamilyToMobileId,
  pickMobileFontFamily,
} from "@/lib/detail-fonts-mobile";
import { TEXT_FONT_FAMILY_OPTIONS } from "@/lib/text-format";

const MOBILE_FONT_TO_CANONICAL = buildMobileFontToCanonicalMap();

function buildMobileFontToCanonicalMap() {
  const map = new Map<string, string>();

  for (const option of TEXT_FONT_FAMILY_OPTIONS) {
    for (const bold of [false, true] as const) {
      for (const italic of [false, true] as const) {
        const mobileFont = pickMobileFontFamily(option.id, { bold, italic });
        if (mobileFont) {
          map.set(mobileFont, option.value);
        }
      }
    }
  }

  return map;
}

function replaceHtmlFontFamilies(
  html: string,
  replacer: (cssValue: string) => string | undefined,
) {
  return html.replace(
    /font-family:\s*([^;"']+(?:\s*,\s*[^;"']+)*)/gi,
    (fullMatch, cssValue: string) => {
      const next = replacer(cssValue.trim());
      return next ? `font-family: ${next}` : fullMatch;
    },
  );
}

/** Map web/canonical font-family CSS to loaded React Native font names for native HTML views. */
export function mobileDisplayHtmlFromCanonical(html: string) {
  return replaceHtmlFontFamilies(html, (cssValue) => {
    const fontId = cssFontFamilyToMobileId(cssValue);
    return pickMobileFontFamily(fontId, {}) ?? undefined;
  });
}

/** Restore canonical font-family CSS values before persisting or syncing with web. */
export function canonicalHtmlFromMobileDisplay(html: string) {
  return replaceHtmlFontFamilies(html, (cssValue) => {
    const canonical = MOBILE_FONT_TO_CANONICAL.get(cssValue.trim());
    if (canonical) return canonical;

    const fontId = cssFontFamilyToMobileId(cssValue);
    if (!fontId) return undefined;

    const option = TEXT_FONT_FAMILY_OPTIONS.find((item) => item.id === fontId);
    return option?.value;
  });
}
