import { useCallback, useMemo, useState } from "react";

import {
  countIncompleteSubtasksByParentId,
  readSubtasksExpandedByTask,
  resolveSubtasksExpandedState,
  saveSubtasksExpanded,
} from "@/lib/task-subtasks";
import type { TaskItem } from "@/types/todo";

export function useTaskListSubtasksExpanded(tasks: TaskItem[]) {
  const [expandedByTaskId, setExpandedByTaskId] = useState(
    readSubtasksExpandedByTask,
  );

  const subtaskCountByParentId = useMemo(
    () => countIncompleteSubtasksByParentId(tasks),
    [tasks],
  );

  const isSubtasksExpanded = useCallback(
    (taskId: string, subtaskCount: number) =>
      resolveSubtasksExpandedState(taskId, subtaskCount, expandedByTaskId),
    [expandedByTaskId],
  );

  const toggleSubtasksExpanded = useCallback(
    (taskId: string, subtaskCount: number) => {
      setExpandedByTaskId((current) => {
        const expanded = resolveSubtasksExpandedState(
          taskId,
          subtaskCount,
          current,
        );
        const nextExpanded = !expanded;
        saveSubtasksExpanded(taskId, nextExpanded);
        return { ...current, [taskId]: nextExpanded };
      });
    },
    [],
  );

  return {
    subtaskCountByParentId,
    isSubtasksExpanded,
    toggleSubtasksExpanded,
  };
}
