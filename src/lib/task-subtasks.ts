import type { TaskItem } from "@/types/todo";

export const SUBTASK_INDENT_PX = 44;

let expandedByTaskIdCache: Record<string, boolean> = {};

export function readSubtasksExpandedByTask() {
  return { ...expandedByTaskIdCache };
}

export function saveSubtasksExpanded(taskId: string, expanded: boolean) {
  expandedByTaskIdCache = { ...expandedByTaskIdCache, [taskId]: expanded };
}

export function resolveSubtasksExpandedState(
  taskId: string,
  subtaskCount: number,
  savedByTaskId: Record<string, boolean> = readSubtasksExpandedByTask(),
) {
  const saved = savedByTaskId[taskId];
  if (saved !== undefined) return saved;
  return subtaskCount > 0;
}

export function countIncompleteSubtasksByParentId(tasks: TaskItem[]) {
  const counts = new Map<string, number>();

  for (const task of tasks) {
    if (task.completed || !task.parentId) continue;
    counts.set(task.parentId, (counts.get(task.parentId) ?? 0) + 1);
  }

  return counts;
}

export function getVisibleSubtasks(children: TaskItem[]) {
  return children.filter((task) => !task.completed);
}
