import { API_BASE_URL } from "@/constants/api";

export type ParsedDetailBlock =
  | { type: "text"; text: string }
  | { type: "image"; uri: string }
  | { type: "link"; text: string; href: string };

function resolveUri(src: string) {
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  if (src.startsWith("/")) {
    return `${API_BASE_URL}${src}`;
  }

  return `${API_BASE_URL}/${src}`;
}

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0|\u200B/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseTaskDetails(details: string): ParsedDetailBlock[] {
  const trimmed = details.trim();
  if (
    !trimmed ||
    trimmed === "<br>" ||
    trimmed === "<div><br></div>" ||
    trimmed === "<p><br></p>"
  ) {
    return [];
  }

  const blocks: ParsedDetailBlock[] = [];
  let remaining = trimmed;

  const imagePattern =
    /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const linkPattern =
    /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  const tokens: Array<{ index: number; block: ParsedDetailBlock }> = [];

  for (const match of remaining.matchAll(imagePattern)) {
    const src = match[1];
    if (!src || match.index === undefined) continue;
    tokens.push({
      index: match.index,
      block: { type: "image", uri: resolveUri(src) },
    });
  }

  for (const match of remaining.matchAll(linkPattern)) {
    const href = match[1];
    const text = stripHtml(match[2] ?? "");
    if (!href || match.index === undefined) continue;
    tokens.push({
      index: match.index,
      block: {
        type: "link",
        text: text || href,
        href: resolveUri(href),
      },
    });
  }

  tokens.sort((a, b) => a.index - b.index);

  if (tokens.length === 0) {
    const text = stripHtml(remaining);
    return text ? [{ type: "text", text }] : [];
  }

  let cursor = 0;
  for (const token of tokens) {
    const before = remaining.slice(cursor, token.index);
    const text = stripHtml(before);
    if (text) {
      blocks.push({ type: "text", text });
    }
    blocks.push(token.block);
    const matchLength =
      token.block.type === "image"
        ? remaining.slice(token.index).match(/^<img[^>]*>/i)?.[0]?.length ?? 0
        : remaining.slice(token.index).match(/^<a[\s\S]*?<\/a>/i)?.[0]?.length ?? 0;
    cursor = token.index + matchLength;
  }

  const tail = stripHtml(remaining.slice(cursor));
  if (tail) {
    blocks.push({ type: "text", text: tail });
  }

  return blocks;
}
