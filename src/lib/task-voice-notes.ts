import { API_BASE_URL } from "@/constants/api";

export type PendingVoiceNote = {
  id: string;
  localUri: string;
  durationMs: number;
  mimeType: string;
};

export type ParsedAudioBlock = {
  type: "audio";
  id: string;
  uri: string;
  durationMs?: number;
  filename: string;
};

const AUDIO_WRAPPER_PATTERN =
  /<div class="detail-audio-wrapper"[^>]*data-audio-id="([^"]+)"[^>]*(?:data-duration-ms="(\d+)")?[^>]*>[\s\S]*?<audio[^>]+src=["']([^"']+)["'][^>]*>/gi;

export function formatVoiceNoteDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function resolveTaskMediaUri(src: string) {
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  if (src.startsWith("/")) {
    return `${API_BASE_URL}${src}`;
  }

  return `${API_BASE_URL}/${src}`;
}

export function buildVoiceNoteDetailsSnippet(
  publicUrl: string,
  audioId: string,
  durationMs: number,
) {
  return `<div class="detail-audio-wrapper" contenteditable="false" data-audio-id="${audioId}" data-duration-ms="${durationMs}"><audio controls preload="metadata" src="${publicUrl}" class="detail-audio"></audio></div>`;
}

export function appendVoiceNotesToDetailsHtml(
  baseDetails: string,
  snippets: string[],
) {
  const joined = snippets.join("");
  const base = baseDetails.trim();
  if (!joined) return base;
  if (!base) return joined;
  return `${base}${joined}`;
}

export function extractAudioWrappersFromHtml(html: string) {
  return [...html.matchAll(/<div class="detail-audio-wrapper"[\s\S]*?<\/div>/gi)].map(
    (match) => match[0],
  );
}

export function parseAudioBlocksFromDetails(details: string): ParsedAudioBlock[] {
  const blocks: ParsedAudioBlock[] = [];

  for (const match of details.matchAll(AUDIO_WRAPPER_PATTERN)) {
    const id = match[1];
    const durationMs = match[2] ? Number.parseInt(match[2], 10) : undefined;
    const src = match[3];
    if (!id || !src) continue;

    const filename = src.split("/").pop() ?? id;
    blocks.push({
      type: "audio",
      id,
      uri: resolveTaskMediaUri(src),
      durationMs: Number.isFinite(durationMs) ? durationMs : undefined,
      filename,
    });
  }

  return blocks;
}

export function removeVoiceNoteFromDetailsHtml(details: string, audioId: string) {
  const pattern = new RegExp(
    `<div class="detail-audio-wrapper"[^>]*data-audio-id="${audioId}"[\\s\\S]*?</div>`,
    "gi",
  );
  return details.replace(pattern, "").trim();
}

export function guessVoiceNoteMimeType(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".caf")) return "audio/x-caf";
  if (lower.endsWith(".aac")) return "audio/aac";
  if (lower.endsWith(".3gp")) return "audio/3gpp";
  return "audio/mp4";
}
