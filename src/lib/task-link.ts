import { API_BASE_URL } from "@/constants/api";

export function getTaskShareUrl(taskId: string) {
  return `${API_BASE_URL}/task/${taskId}`;
}
