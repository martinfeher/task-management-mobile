import type {
  BlockNode,
  InlineNode,
  ListItemContentNode,
  Mark,
  TaskDoc,
  TextNode,
} from "@/lib/task-document/types";

/**
 * Serializes a TaskDoc into HTML that `react-native-enriched` can parse
 * (p/h1–h3, ul/ol/li, inline b/i/u/s/code/span). Inverse path on save is
 * `htmlToDoc` → `docToHtml` for canonical `.detail-line` storage.
 */

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string) {
  return escapeHtml(text);
}

function markStyle(mark: Mark): string | null {
  switch (mark.type) {
    case "highlight":
      return `background-color: ${mark.attrs.color};`;
    case "textStyle": {
      const parts: string[] = [];
      if (mark.attrs.color) parts.push(`color: ${mark.attrs.color};`);
      if (mark.attrs.fontFamily) parts.push(`font-family: ${mark.attrs.fontFamily};`);
      if (mark.attrs.fontSize) parts.push(`font-size: ${mark.attrs.fontSize};`);
      return parts.length > 0 ? parts.join(" ") : null;
    }
    default:
      return null;
  }
}

function renderTextNode(node: TextNode): string {
  let html = escapeHtml(node.text);
  const marks = node.marks ?? [];

  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        html = `<b>${html}</b>`;
        break;
      case "italic":
        html = `<i>${html}</i>`;
        break;
      case "underline":
        html = `<u>${html}</u>`;
        break;
      case "strike":
        html = `<s>${html}</s>`;
        break;
      case "link":
        html = `<a href="${escapeAttr(mark.attrs.href)}">${html}</a>`;
        break;
      default:
        break;
    }
  }

  const styleParts = marks.map(markStyle).filter((value): value is string => Boolean(value));
  if (styleParts.length > 0) {
    html = `<span style="${styleParts.join(" ")}">${html}</span>`;
  }

  return html || "<br>";
}

function renderInlineNode(node: InlineNode): string {
  return node.type === "hardBreak" ? "<br>" : renderTextNode(node);
}

function renderInline(content: InlineNode[] | undefined): string {
  if (!content || content.length === 0) return "<br>";
  const html = content.map(renderInlineNode).join("");
  return html || "<br>";
}

function renderListItemContent(node: ListItemContentNode): string {
  return renderInline(node.content);
}

function renderBlock(block: BlockNode): string {
  switch (block.type) {
    case "paragraph":
      return `<p>${renderInline(block.content)}</p>`;
    case "heading":
      return `<h${block.attrs.level}>${renderInline(block.content)}</h${block.attrs.level}>`;
    case "codeBlock": {
      const text = (block.content ?? []).map((node) => node.text).join("");
      const escaped = escapeHtml(text).replace(/\n/g, "<br>");
      return `<p><code>${escaped || "<br>"}</code></p>`;
    }
    case "image": {
      const { src, alt, width, height } = block.attrs;
      const styleParts: string[] = ["max-width: 100%;"];
      if (width) styleParts.push(`width: ${width}px;`);
      if (height) styleParts.push(`height: ${height}px;`);
      return `<p><img src="${escapeAttr(src)}" alt="${escapeAttr(alt ?? "Embedded image")}" style="${styleParts.join(" ")}"></p>`;
    }
    case "bulletList":
      return `<ul>${block.content
        .map((item) => `<li>${renderListItemContent(item.content[0])}</li>`)
        .join("")}</ul>`;
    case "orderedList":
      return `<ol>${block.content
        .map((item) => `<li>${renderListItemContent(item.content[0])}</li>`)
        .join("")}</ol>`;
    case "taskList":
      return `<ul>${block.content
        .map((item) => `<li>${renderListItemContent(item.content[0])}</li>`)
        .join("")}</ul>`;
    default:
      return "";
  }
}

export function docToEnrichedHtml(doc: TaskDoc): string {
  if (!doc.content || doc.content.length === 0) return "";
  return doc.content.map(renderBlock).join("");
}
