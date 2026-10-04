import { plainRangeToHtmlRange } from "@/lib/html-plain-mapping";

/** Convert stored HTML to plain text for search, save comparison, and undo snapshots. */
export function detailsHtmlToPlainText(details: string) {
  let text = details
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n");

  text = text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\u200B/g, " ");

  return text.replace(/\n{3,}/g, "\n\n");
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Convert plain-text notes back to HTML for storage.
 * Preserves existing <img> tags from the previous HTML so mobile edits
 * don't wipe attachments when only the text changes.
 */
export function plainTextToDetailsHtml(text: string, previousHtml = "") {
  const normalized = text.replace(/\r\n/g, "\n");
  const textHtml = normalized
    ? escapeHtml(normalized).replace(/\n/g, "<br>")
    : "";

  const images = [...previousHtml.matchAll(/<img\b[^>]*>/gi)].map(
    (match) => match[0],
  );
  const audioWrappers = [
    ...previousHtml.matchAll(
      /<div class="detail-audio-wrapper"[\s\S]*?<\/div>/gi,
    ),
  ].map((match) => match[0]);

  const attachmentHtml = [...images.map((img) => `<div class="detail-image-wrapper">${img}</div>`), ...audioWrappers].join("");

  if (attachmentHtml.length === 0) {
    return textHtml;
  }

  return textHtml ? `${textHtml}${attachmentHtml}` : attachmentHtml;
}

/** @deprecated Use plainTextToDetailsHtml — kept for callers mid-migration. */
export function mergePlainTextEditIntoHtml(
  html: string,
  previousPlain: string,
  nextPlain: string,
  caretFormats?: { bold?: boolean },
) {
  if (previousPlain === nextPlain) return html;
  if (!html) {
    let textHtml = plainTextToDetailsHtml(nextPlain, html);
    if (caretFormats?.bold && nextPlain) {
      const escaped = escapeHtml(nextPlain.replace(/\r\n/g, "\n")).replace(/\n/g, "<br>");
      textHtml = `<b>${escaped}</b>`;
    }
    return textHtml;
  }

  let start = 0;
  while (
    start < previousPlain.length &&
    start < nextPlain.length &&
    previousPlain[start] === nextPlain[start]
  ) {
    start += 1;
  }

  let prevEnd = previousPlain.length;
  let nextEnd = nextPlain.length;
  while (
    prevEnd > start &&
    nextEnd > start &&
    previousPlain[prevEnd - 1] === nextPlain[nextEnd - 1]
  ) {
    prevEnd -= 1;
    nextEnd -= 1;
  }

  const htmlRange = plainRangeToHtmlRange(html, start, prevEnd);
  if (!htmlRange) {
    return plainTextToDetailsHtml(nextPlain, html);
  }

  let inserted = escapeHtml(nextPlain.slice(start, nextEnd));
  if (inserted && caretFormats?.bold) {
    inserted = `<b>${inserted}</b>`;
  }

  return html.slice(0, htmlRange.start) + inserted + html.slice(htmlRange.end);
}
