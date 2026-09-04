import {
  docToHtml,
  docToPlainText,
  htmlToDoc,
  type BlockNode,
} from "@/lib/task-document";
import { resolveTaskDoc } from "@/lib/task-doc";

const EMPTY_DETAILS_HTML = new Set([
  "",
  "<br>",
  "<div><br></div>",
  "<p><br></p>",
  "<html><p></p></html>",
  "<html>\n<p></p>\n</html>",
]);

function blockIsEmpty(block: BlockNode): boolean {
  if (block.type === "image") return false;
  return docToPlainText({ type: "doc", content: [block] }).trim().length === 0;
}

/**
 * Strip leading/trailing empty lines and collapse consecutive blank lines.
 * Native rich-text round-trips can accumulate tens of thousands of empty
 * `.detail-line` blocks that push real content off-screen.
 */
export function sanitizeTaskDetailsHtml(html: string): string {
  if (!html.trim()) return "";

  try {
    const content = [...htmlToDoc(html).content];

    while (content.length > 0 && blockIsEmpty(content[0]!)) {
      content.shift();
    }
    while (content.length > 0 && blockIsEmpty(content[content.length - 1]!)) {
      content.pop();
    }

    const collapsed: BlockNode[] = [];
    let consecutiveEmpty = 0;
    for (const block of content) {
      if (blockIsEmpty(block)) {
        consecutiveEmpty += 1;
        if (consecutiveEmpty <= 1) collapsed.push(block);
        continue;
      }
      consecutiveEmpty = 0;
      collapsed.push(block);
    }

    while (
      collapsed.length > 0 &&
      blockIsEmpty(collapsed[collapsed.length - 1]!)
    ) {
      collapsed.pop();
    }

    if (collapsed.length === 0) return "";
    return docToHtml({ type: "doc", content: collapsed });
  } catch {
    return html;
  }
}

/** Matches web `task-details-content.ts` — shared empty/content checks. */
export function taskDetailsHasContent(details: string) {
  const trimmed = details.trim();
  if (!trimmed || EMPTY_DETAILS_HTML.has(trimmed)) {
    return false;
  }

  if (
    trimmed.includes("detail-image-wrapper") ||
    /<img[\s>]/i.test(trimmed)
  ) {
    return true;
  }

  const text = trimmed
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|\u00a0|\u200B/g, " ")
    .trim();

  return text.length > 0;
}

/** Prefer `detailsDoc` when valid; otherwise use legacy `details` HTML. */
export function resolveTaskDetailsHtml(detail: {
  details?: string | null;
  detailsDoc?: unknown;
}): string {
  const fromDoc = sanitizeTaskDetailsHtml(docToHtml(resolveTaskDoc(detail)));
  if (taskDetailsHasContent(fromDoc)) {
    return fromDoc;
  }

  const details = detail.details ?? "";
  return taskDetailsHasContent(details)
    ? sanitizeTaskDetailsHtml(details)
    : "";
}

/** Avoid overwriting meaningful saved details with an empty native snapshot. */
export function shouldPersistTaskDetails(
  nextDetails: string,
  savedDetails: string,
) {
  if (nextDetails === savedDetails) return false;

  return !(
    !taskDetailsHasContent(nextDetails) && taskDetailsHasContent(savedDetails)
  );
}

export function resolveTaskDetailsForSave(
  nextDetails: string,
  savedDetails: string,
) {
  const sanitizedNext = sanitizeTaskDetailsHtml(nextDetails);
  const sanitizedSaved = sanitizeTaskDetailsHtml(savedDetails);
  return shouldPersistTaskDetails(sanitizedNext, sanitizedSaved)
    ? sanitizedNext
    : sanitizedSaved;
}
