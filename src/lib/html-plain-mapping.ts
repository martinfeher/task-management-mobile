type TextRange = { start: number; end: number };

function decodeBasicEntity(html: string, index: number) {
  if (html[index] !== "&") {
    return { length: 1 };
  }

  if (html.startsWith("&amp;", index)) return { length: 5 };
  if (html.startsWith("&lt;", index)) return { length: 4 };
  if (html.startsWith("&gt;", index)) return { length: 4 };
  if (html.startsWith("&quot;", index)) return { length: 6 };
  if (html.startsWith("&nbsp;", index)) return { length: 6 };

  const semi = html.indexOf(";", index);
  if (semi === -1) return { length: 1 };
  return { length: semi - index + 1 };
}

function readTagName(tagInner: string) {
  const trimmed = tagInner.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) {
    return trimmed.slice(1).split(/\s/)[0]?.toLowerCase() ?? "";
  }
  return trimmed.split(/\s/)[0]?.toLowerCase() ?? "";
}

/**
 * Build plain-text boundary indices aligned with `detailsHtmlToPlainText`.
 * `starts[i]` is the HTML index where plain character `i` starts.
 * `starts[plainLength]` is the HTML index after the final character (and any
 * trailing tags), usable as a selection end when it reaches the very end.
 * `ends[i]` is the HTML index immediately after plain character `i`'s bytes,
 * *before* any subsequent closing tags — needed so a selection ending mid-line
 * (e.g. right at the end of an underlined word) doesn't swallow the closing
 * tag into the selected range.
 */
export function buildPlainHtmlBoundaries(html: string) {
  const starts: number[] = [];
  const ends: number[] = [];
  let htmlIndex = 0;

  while (htmlIndex < html.length) {
    if (html[htmlIndex] === "<") {
      const tagEnd = html.indexOf(">", htmlIndex);
      if (tagEnd === -1) break;

      const tagSlice = html.slice(htmlIndex, tagEnd + 1);
      const tagInner = html.slice(htmlIndex + 1, tagEnd);
      const tagName = readTagName(tagInner);
      const isClosing = tagInner.trimStart().startsWith("/");

      if (/^<br\s*\/?>$/i.test(tagSlice)) {
        starts.push(htmlIndex);
        ends.push(htmlIndex);
        htmlIndex = tagEnd + 1;
        continue;
      }

      if (isClosing && (tagName === "p" || tagName === "div")) {
        starts.push(htmlIndex);
        ends.push(htmlIndex);
        htmlIndex = tagEnd + 1;
        continue;
      }

      htmlIndex = tagEnd + 1;
      continue;
    }

    if (html.startsWith("\u200B", htmlIndex)) {
      htmlIndex += 1;
      continue;
    }

    starts.push(htmlIndex);
    htmlIndex += decodeBasicEntity(html, htmlIndex).length;
    ends.push(htmlIndex);
  }

  starts.push(htmlIndex);
  return { starts, ends };
}

/** Map plain-text indices (as shown in TextInput) to HTML string indices. */
export function plainRangeToHtmlRange(
  html: string,
  plainStart: number,
  plainEnd: number,
): TextRange | null {
  if (plainStart >= plainEnd) return null;

  const { starts, ends } = buildPlainHtmlBoundaries(html);
  const plainLength = starts.length - 1;

  if (plainEnd > plainLength || plainStart < 0) {
    return null;
  }

  const start = starts[plainStart];
  // Always stop right after the last selected character, before any closing
  // tags that follow it (even at the very end of the content) — otherwise a
  // selection ending exactly at a format boundary (e.g. the last letter of an
  // underlined word) would swallow the closing tag into the selected range
  // and toggle-off checks below would never see it.
  const end = ends[plainEnd - 1];

  if (start == null || end == null || start >= end) {
    return null;
  }

  return { start, end };
}
