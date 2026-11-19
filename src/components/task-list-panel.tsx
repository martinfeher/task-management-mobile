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
import { TaskListOrganizeMenu } from "@/components/task-list-organize-menu";
import {
  getListContentStyle,
  getPanelTitle,
  getTaskListBlockingState,
  StaticTaskSection,
  TaskListShell,
  TaskSectionTitle,
  useToggleComplete,
  type TaskListPanelProps,
} from "@/components/task-list-panel-shared";
import { getAddTaskFabReservedHeight } from "@/constants/tab-bar";
import { useApp } from "@/contexts/app-context";
import { blocksToTasks, tasksToBlocks } from "@/lib/task-blocks";
import {
  organizeTaskBlocks,
  sortOptionsEqual,
  type TaskListGroupBy,
  type TaskListSortOption,
} from "@/lib/task-list-grouping";
import { isAggregateTaskListView } from "@/lib/task-list-view";

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
  const { addTaskComposerOpen, openListsDrawer, sidebarData } = useApp();
  const insets = useSafeAreaInsets();
  const [contentFilter, setContentFilter] = useState<TaskListContentFilter>("all");
  const [groupBy, setGroupBy] = useState<TaskListGroupBy>("none");
  const [activeSort, setActiveSort] = useState<TaskListSortOption | null>(null);
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
  const lists = sidebarData?.lists ?? [];
  const showOrganizeMenu = useMemo(
    () => isAggregateTaskListView(selectedView, lists),
    [lists, selectedView],
  );
  const taskSections = useMemo(
    () =>
      organizeTaskBlocks(tasksToBlocks(visibleTasks), {
        sort: activeSort,
        groupBy,
      }),
    [activeSort, groupBy, visibleTasks],
  );
  const organizeTaskCount = visiblePinned.length + visibleTasks.length;

  useEffect(() => {
    setContentFilter("all");
    setGroupBy("none");
    setActiveSort(null);
  }, [selectedView]);

  return (
    <View style={{ flex: 1 }}>
      <TaskListShell
        title={getPanelTitle(selectedView, taskData)}
        selectedView={selectedView}
        onOpenLists={openListsDrawer}
        headerAction={
          showOrganizeMenu && organizeTaskCount >= 2 ? (
            <TaskListOrganizeMenu
              activeSort={activeSort}
              activeGroupBy={groupBy}
              onSelectSort={(option) => {
                setActiveSort((current) =>
                  sortOptionsEqual(current, option) ? null : option,
                );
              }}
              onSelectGroupBy={setGroupBy}
            />
          ) : null
        }
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
                {taskSections.map((section) => (
                  <View key={section.key}>
                    {section.title ? (
                      <TaskSectionTitle title={section.title} />
                    ) : null}
                    <StaticTaskSection
                      tasks={blocksToTasks(section.blocks)}
                      showListName={showListName}
                      onToggleComplete={handleToggleComplete}
                      onPressTask={onOpenTask}
                    />
                  </View>
                ))}
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
