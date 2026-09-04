import {
  docToPlainText,
  htmlToDoc,
  isValidTaskDoc,
  type InlineNode,
  type TaskDoc,
} from "@/lib/task-document";
import type { ParsedDetailBlock } from "@/lib/parse-task-details";
import { API_BASE_URL } from "@/constants/api";

type MediaBlock = Extract<ParsedDetailBlock, { type: "image" | "link" }>;

/**
 * Resolves the canonical `TaskDoc` for a task, treating `detailsDoc` (when
 * present and valid) as the source of truth per the long-term rich-text
 * strategy, and deriving it locally from `details` HTML otherwise — e.g.
 * for tasks saved before the API exposed `detailsDoc`, or if the payload
 * ever fails validation. This keeps mobile reading the exact same schema
 * the web app treats as canonical, without depending on the API always
 * having a precomputed doc.
 */
export function resolveTaskDoc(detail: {
  details?: string | null;
  detailsDoc?: unknown;
}): TaskDoc {
  if (detail.detailsDoc && isValidTaskDoc(detail.detailsDoc)) {
    return detail.detailsDoc;
  }

  try {
    return htmlToDoc(detail.details ?? "");
  } catch {
    return { type: "doc", content: [] };
  }
}

/** High-fidelity plain-text preview, preferring `detailsDoc` over regex HTML stripping. */
export function taskDocToPreviewText(detail: {
  details?: string | null;
  detailsDoc?: unknown;
}): string {
  return docToPlainText(resolveTaskDoc(detail));
}

function resolveUri(src: string) {
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("/")) return `${API_BASE_URL}${src}`;
  return `${API_BASE_URL}/${src}`;
}

/**
 * Walks a `TaskDoc` to extract the same `image`/`link` blocks
 * `parse-task-details.ts` extracts via regex from raw HTML, but from the
 * structured doc — more robust for content authored with the web editor's
 * `.detail-line` model (nested list/heading links, styled image attrs).
 */
export function extractMediaBlocksFromDoc(doc: TaskDoc): MediaBlock[] {
  const blocks: MediaBlock[] = [];
  let pendingLink: { text: string; href: string } | null = null;

  const flushLink = () => {
    if (!pendingLink) return;
    const text = pendingLink.text.trim();
    blocks.push({ type: "link", text: text || pendingLink.href, href: pendingLink.href });
    pendingLink = null;
  };

  const visitInline = (content: InlineNode[] | undefined) => {
    for (const node of content ?? []) {
      if (node.type !== "text") {
        flushLink();
        continue;
      }
      const linkMark = node.marks?.find((mark) => mark.type === "link");
      const href = linkMark && linkMark.type === "link" ? linkMark.attrs.href : undefined;

      if (href) {
        if (pendingLink && pendingLink.href === href) {
          pendingLink.text += node.text;
        } else {
          flushLink();
          pendingLink = { text: node.text, href };
        }
      } else {
        flushLink();
      }
    }
    flushLink();
  };

  for (const block of doc.content) {
    if (block.type === "image") {
      blocks.push({ type: "image", uri: resolveUri(block.attrs.src) });
      continue;
    }
    if (block.type === "paragraph" || block.type === "heading") {
      visitInline(block.content);
      continue;
    }
    if (block.type === "bulletList" || block.type === "orderedList" || block.type === "taskList") {
      for (const item of block.content) {
        const first = item.content[0];
        if (first) visitInline(first.content);
      }
    }
  }

  return blocks;
}
