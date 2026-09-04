import { FlatList, RefreshControl, View } from "react-native";

import { AddTaskButton } from "@/components/add-task-button";
import {
  getListContentStyle,
  getPanelTitle,
  getTaskListBlockingState,
  StaticTaskSection,
  TaskListShell,
  useToggleComplete,
  type TaskListPanelProps,
} from "@/components/task-list-panel-shared";
import { useApp } from "@/contexts/app-context";

export function TaskListPanel({
  selectedView,
  taskData,
  loading,
  refreshing,
  error,
  onRefresh,
  onRetry,
  onTaskCompleted,
  onTaskUncompleted,
  onOpenTask,
}: TaskListPanelProps) {
  const { addTaskComposerOpen, openListsDrawer } = useApp();
  const showListName = selectedView?.type !== "list";
  const handleToggleComplete = useToggleComplete(onTaskCompleted, onTaskUncompleted);
  const blockingState = getTaskListBlockingState({
    selectedView,
    loading,
    taskData,
    error,
    onRetry,
    onOpenListsDrawer: openListsDrawer,
  });

  const pinned = taskData?.pinned ?? [];
  const tasks = taskData?.tasks ?? [];

  return (
    <View style={{ flex: 1 }}>
      <TaskListShell title={getPanelTitle(selectedView, taskData)}>
        {blockingState ?? (
          <FlatList
            data={[]}
            renderItem={null}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View>
                <StaticTaskSection
                  title="Pinned"
                  tasks={pinned}
                  showListName={showListName}
                  onToggleComplete={handleToggleComplete}
                  onPressTask={onOpenTask}
                />
                <StaticTaskSection
                  tasks={tasks}
                  showListName={showListName}
                  onToggleComplete={handleToggleComplete}
                  onPressTask={onOpenTask}
                />
              </View>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={getListContentStyle()}
          />
        )}
      </TaskListShell>
      {!addTaskComposerOpen ? <AddTaskButton /> : null}
    </View>
  );
}
