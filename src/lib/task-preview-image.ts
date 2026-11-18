import { API_BASE_URL } from "@/constants/api";

const TASK_IMAGE_PATH_PATTERN =
  /\/api\/task-images\/[a-z0-9]+\/[a-z0-9-]+\.(?:jpe?g|png|gif|webp|svg)/i;

/** First stored task image referenced in the details HTML, as an API path. */
export function extractPreviewImage(details: string | null | undefined) {
  if (!details || !details.includes("/api/task-images/")) return null;
  return TASK_IMAGE_PATH_PATTERN.exec(details)?.[0] ?? null;
}

/** Absolute URL for a task image path returned by the API. */
export function resolvePreviewImageUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
