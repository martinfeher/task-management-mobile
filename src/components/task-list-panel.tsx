import { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddTaskButton } from "@/components/add-task-button";
import {
  filterTaskListItems,
  shouldShowTaskListTypeFilter,
  TaskListTypeFilterBar,
  TASK_LIST_TYPE_FILTER_EXTRA_SCROLL_PADDING,
  type TaskListContentFilter,
} from "@/components/task-list-type-filter";
import {
  getListContentStyle,
  getPanelTitle,
  getTaskListBlockingState,
  StaticTaskSection,
  TaskListShell,
  useToggleComplete,
  type TaskListPanelProps,
} from "@/components/task-list-panel-shared";
import { getAddTaskFabReservedHeight } from "@/constants/tab-bar";
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
  const insets = useSafeAreaInsets();
  const [contentFilter, setContentFilter] = useState<TaskListContentFilter>("all");
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
  const allListTasks = useMemo(
    () => [...pinned, ...tasks],
    [pinned, tasks],
  );
  const showTypeFilter = useMemo(
    () => shouldShowTaskListTypeFilter(allListTasks),
    [allListTasks],
  );
  const listBottomPadding =
    getAddTaskFabReservedHeight(insets.bottom) +
    (showTypeFilter ? TASK_LIST_TYPE_FILTER_EXTRA_SCROLL_PADDING : 0);
  const visiblePinned = useMemo(
    () => filterTaskListItems(pinned, contentFilter),
    [pinned, contentFilter],
  );
  const visibleTasks = useMemo(
    () => filterTaskListItems(tasks, contentFilter),
    [tasks, contentFilter],
  );

  useEffect(() => {
    setContentFilter("all");
  }, [selectedView]);

  return (
    <View style={{ flex: 1 }}>
      <TaskListShell
        title={getPanelTitle(selectedView, taskData)}
        selectedView={selectedView}
        onOpenLists={openListsDrawer}
      >
        {blockingState ?? (
          <FlatList
            data={[]}
            renderItem={null}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View>
                <StaticTaskSection
                  title="Pinned"
                  tasks={visiblePinned}
                  showListName={showListName}
                  onToggleComplete={handleToggleComplete}
                  onPressTask={onOpenTask}
                />
                <StaticTaskSection
                  tasks={visibleTasks}
                  showListName={showListName}
                  onToggleComplete={handleToggleComplete}
                  onPressTask={onOpenTask}
                />
              </View>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={getListContentStyle(listBottomPadding)}
          />
        )}
      </TaskListShell>
      {!addTaskComposerOpen && showTypeFilter ? (
        <TaskListTypeFilterBar
          value={contentFilter}
          onChange={setContentFilter}
        />
      ) : null}
      {!addTaskComposerOpen ? <AddTaskButton /> : null}
    </View>
  );
}
