import { docToEnrichedHtml } from "@/lib/doc-to-enriched-html";
import { docToHtml, htmlToDoc } from "@/lib/task-document";
import { taskDetailsHasContent, sanitizeTaskDetailsHtml } from "@/lib/task-details-content";

/** Web `.detail-line` HTML → enriched `<p>`/`<h1>`/`<ul>` HTML for native input. */
export function taskDetailsHtmlToEnrichedHtml(html: string): string {
  if (!taskDetailsHasContent(html)) return "";

  try {
    return docToEnrichedHtml(htmlToDoc(sanitizeTaskDetailsHtml(html)));
  } catch {
    return sanitizeTaskDetailsHtml(html);
  }
}

/** Enriched HTML → canonical `.detail-line` HTML for API persistence. */
export function enrichedHtmlToTaskDetailsHtml(html: string): string {
  if (!taskDetailsHasContent(html)) return "";

  try {
    return sanitizeTaskDetailsHtml(docToHtml(htmlToDoc(html)));
  } catch {
    return sanitizeTaskDetailsHtml(html);
  }
}
