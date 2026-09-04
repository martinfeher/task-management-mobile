import { useCallback, useEffect } from "react";

import { TaskListPanel } from "@/components/task-list-panel";
import { useApp } from "@/contexts/app-context";

export function TasksScreenContent() {
  const {
    sidebarData,
    selectedView,
    taskData,
    taskLoading,
    taskRefreshing,
    taskError,
    loadTasksForView,
    selectView,
    openTask,
    completeTask,
    uncompleteTask,
    reorderTasks,
  } = useApp();

  const ensureListSelected = useCallback(() => {
    if (selectedView) return;
    const firstList = sidebarData?.lists[0];
    if (!firstList) return;
    selectView({ type: "list", id: firstList.id }, { goToTasks: false });
  }, [selectedView, sidebarData?.lists, selectView]);

  useEffect(() => {
    ensureListSelected();
  }, [ensureListSelected]);

  return (
    <TaskListPanel
      selectedView={selectedView}
      taskData={taskData}
      loading={taskLoading}
      refreshing={taskRefreshing}
      error={taskError}
      onRefresh={() => selectedView && void loadTasksForView(selectedView, true)}
      onRetry={() => selectedView && void loadTasksForView(selectedView)}
      onTaskCompleted={(taskId) => {
        void completeTask(taskId);
      }}
      onTaskUncompleted={(taskId) => {
        void uncompleteTask(taskId);
      }}
      onOpenTask={openTask}
      onReorderTasks={reorderTasks}
    />
  );
}
