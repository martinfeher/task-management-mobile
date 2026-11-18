import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddTaskButton } from "@/components/add-task-button";
import {
  filterTaskBlocks,
  shouldShowTaskListTypeFilter,
  TaskListTypeFilterBar,
  TASK_LIST_TYPE_FILTER_EXTRA_SCROLL_PADDING,
  type TaskListContentFilter,
} from "@/components/task-list-type-filter";
import {
  TASK_CONTEXT_MENU_ESTIMATED_HEIGHT,
  TASK_CONTEXT_MENU_WIDTH,
  TaskContextMenu,
  type TaskContextMenuAnchor,
} from "@/components/task-context-menu";
import { TaskDatePickerSheet, type TaskScheduleSelection } from "@/components/task-date-picker-sheet";
import { TaskLabelPicker } from "@/components/task-label-picker";
import { TaskListOrganizeMenu } from "@/components/task-list-organize-menu";
import {
  getListContentStyle,
  getPanelTitle,
  getTaskListBlockingState,
  TaskListShell,
  TaskSectionTitle,
  TASK_LIST_CONTEXT_MENU_DELAY_MS,
  TASK_LIST_DRAG_DELAY_MS,
  useTaskCompleteUndo,
  type TaskListPanelProps,
} from "@/components/task-list-panel-shared";
import { ListsDrawerShell } from "@/components/lists-drawer-shell";
import { TaskDropPlaceholder } from "@/components/task-drop-placeholder";
import { TaskRow } from "@/components/task-row";
import { ThemedText } from "@/components/themed-text";
import { getAddTaskFabReservedHeight } from "@/constants/tab-bar";
import { useApp } from "@/contexts/app-context";
import {
  createTask,
  fetchLabels,
  moveTaskToList,
  toggleTaskLabel,
  updateTaskPriority,
  updateTaskSchedule,
} from "@/lib/offline/task-repository";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { getTaskShareUrl } from "@/lib/task-link";
import { useTaskListSubtasksExpanded } from "@/hooks/use-task-list-subtasks-expanded";
import {
  blocksToTasks,
  getBlockOrderVersion,
  reorderBlocks,
  tasksToBlocks,
  type TaskBlock,
} from "@/lib/task-blocks";
import { getVisibleSubtasks } from "@/lib/task-subtasks";
import {
  isTaskListManualOrderEnabled,
  organizeTaskBlocks,
  sortOptionsEqual,
  type TaskListGroupBy,
  type TaskListSortOption,
} from "@/lib/task-list-grouping";
import { isAggregateTaskListView } from "@/lib/task-list-view";
import type { SidebarListItem, TaskItem, TaskLabel } from "@/types/todo";

const DROP_ANIMATION_CONFIG = {
  damping: 36,
  mass: 0.08,
  stiffness: 900,
  overshootClamping: true,
  restSpeedThreshold: 0.5,
  restDisplacementThreshold: 0.5,
};

type ContextMenuState = {
  task: TaskItem;
  top: number;
  left: number;
};

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
  onReorderTasks,
}: TaskListPanelProps) {
  const {
    addTaskComposerOpen,
    sidebarData,
    loadTasksForView,
    loadSidebar,
    listsDrawerOpen,
    openListsDrawer,
    openListsDrawerPanel,
    openTasksForDrawerSelection,
    deleteTask,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [contentFilter, setContentFilter] = useState<TaskListContentFilter>("all");
  const [groupBy, setGroupBy] = useState<TaskListGroupBy>("none");
  const [activeSort, setActiveSort] = useState<TaskListSortOption | null>(null);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const showListName = selectedView?.type !== "list";
  const {
    handleToggleComplete,
    completeUndoVisible,
    handleUndoComplete,
    dismissCompleteUndo,
  } = useTaskCompleteUndo(onTaskCompleted, onTaskUncompleted);
  const pinned = taskData?.pinned ?? [];
  const tasks = taskData?.tasks ?? [];
  const pinnedBlocksFromData = useMemo(
    () => tasksToBlocks(taskData?.pinned ?? []),
    [taskData?.pinned],
  );
  const taskBlocksFromData = useMemo(
    () => tasksToBlocks(taskData?.tasks ?? []),
    [taskData?.tasks],
  );
  const [pinnedBlocks, setPinnedBlocks] = useState<TaskBlock[]>([]);
  const [taskBlocks, setTaskBlocks] = useState<TaskBlock[]>([]);
  const pinnedBlocksVersionRef = useRef("");
  const taskBlocksVersionRef = useRef("");
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
  const visiblePinnedBlocks = useMemo(
    () => filterTaskBlocks(pinnedBlocks, contentFilter),
    [pinnedBlocks, contentFilter],
  );
  const visibleTaskBlocks = useMemo(
    () => filterTaskBlocks(taskBlocks, contentFilter),
    [taskBlocks, contentFilter],
  );
  const lists = sidebarData?.lists ?? [];
  const showOrganizeMenu = useMemo(
    () => isAggregateTaskListView(selectedView, lists),
    [lists, selectedView],
  );
  const organizeTaskCount =
    visiblePinnedBlocks.length + visibleTaskBlocks.length;
  const taskSections = useMemo(
    () =>
      organizeTaskBlocks(visibleTaskBlocks, {
        sort: activeSort,
        groupBy,
      }),
    [activeSort, groupBy, visibleTaskBlocks],
  );
  const manualTaskOrder = isTaskListManualOrderEnabled({
    sort: activeSort,
    groupBy,
  });

  useEffect(() => {
    setContentFilter("all");
    setGroupBy("none");
    setActiveSort(null);
  }, [selectedView]);

  useEffect(() => {
    dismissCompleteUndo();
  }, [dismissCompleteUndo, selectedView]);
  const { subtaskCountByParentId, isSubtasksExpanded, toggleSubtasksExpanded } =
    useTaskListSubtasksExpanded(allListTasks);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [contextMenuBackdropReady, setContextMenuBackdropReady] =
    useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const pinnedVersion = getBlockOrderVersion(pinnedBlocksFromData);
    if (pinnedVersion !== pinnedBlocksVersionRef.current) {
      pinnedBlocksVersionRef.current = pinnedVersion;
      setPinnedBlocks(pinnedBlocksFromData);
    }

    const taskVersion = getBlockOrderVersion(taskBlocksFromData);
    if (taskVersion !== taskBlocksVersionRef.current) {
      taskBlocksVersionRef.current = taskVersion;
      setTaskBlocks(taskBlocksFromData);
    }
  }, [pinnedBlocksFromData, taskBlocksFromData]);

  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [allLabels, setAllLabels] = useState<TaskLabel[]>([]);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const contextTask = activeTask;
  const contextMenuTaskIdRef = useRef<string | null>(null);
  const isDraggingRef = useRef(isDragging);
  const dragPlaceholderIndexRef = useRef<number | null>(null);
  const backdropReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const contextMenuGestureActiveRef = useRef(false);

  const blockingState = getTaskListBlockingState({
    selectedView,
    loading,
    taskData,
    error,
    onRetry,
    onOpenListsDrawer: openListsDrawer,
  });

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  const patchTaskLocally = useCallback(() => {
    if (selectedView) {
      void loadTasksForView(selectedView, true);
    }
  }, [loadTasksForView, selectedView]);

  const closeContextMenu = useCallback(() => {
    if (backdropReadyTimerRef.current) {
      clearTimeout(backdropReadyTimerRef.current);
      backdropReadyTimerRef.current = null;
    }
    contextMenuGestureActiveRef.current = false;
    contextMenuTaskIdRef.current = null;
    setContextMenu(null);
    setContextMenuBackdropReady(false);
    setActiveTask(null);
    setMovePickerOpen(false);
    setLabelPickerOpen(false);
    setDatePickerOpen(false);
  }, []);

  const scheduleBackdropReady = useCallback(() => {
    if (backdropReadyTimerRef.current) {
      clearTimeout(backdropReadyTimerRef.current);
    }
    backdropReadyTimerRef.current = setTimeout(() => {
      backdropReadyTimerRef.current = null;
      contextMenuGestureActiveRef.current = false;
      if (contextMenuTaskIdRef.current) {
        setContextMenuBackdropReady(true);
      }
    }, 300);
  }, []);

  const handleContextMenuGestureEnd = useCallback(() => {
    contextMenuGestureActiveRef.current = false;
    scheduleBackdropReady();
  }, [scheduleBackdropReady]);

  const openContextMenu = useCallback(
    (task: TaskItem, anchor: TaskContextMenuAnchor) => {
      if (isDraggingRef.current) return;

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (backdropReadyTimerRef.current) {
        clearTimeout(backdropReadyTimerRef.current);
        backdropReadyTimerRef.current = null;
      }
      contextMenuGestureActiveRef.current = true;
      setContextMenuBackdropReady(false);

      const left = Math.max(
        8,
        Math.min(anchor.x + 8, windowWidth - TASK_CONTEXT_MENU_WIDTH - 8),
      );
      const belowTop = anchor.y + anchor.height + 6;
      const aboveTop = anchor.y - TASK_CONTEXT_MENU_ESTIMATED_HEIGHT - 6;
      const anchorCenterY = anchor.y + anchor.height / 2;
      const openAbove = anchorCenterY >= windowHeight / 2;
      const top = openAbove
        ? Math.max(8, aboveTop)
        : Math.min(
            belowTop,
            windowHeight - TASK_CONTEXT_MENU_ESTIMATED_HEIGHT - 8,
          );

      contextMenuTaskIdRef.current = task.id;
      setActiveTask(task);
      setContextMenu({ task, top, left });
      setMovePickerOpen(false);
      setLabelPickerOpen(false);
      setDatePickerOpen(false);
      scheduleBackdropReady();
    },
    [scheduleBackdropReady, windowHeight, windowWidth],
  );

  const handleDragBegin = useCallback(
    (index: number) => {
      isDraggingRef.current = true;
      dragPlaceholderIndexRef.current = index;
      closeContextMenu();
      setIsDragging(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [closeContextMenu],
  );

  const handlePlaceholderIndexChange = useCallback((placeholderIndex: number) => {
    if (dragPlaceholderIndexRef.current === placeholderIndex) return;

    dragPlaceholderIndexRef.current = placeholderIndex;
    void Haptics.selectionAsync();
  }, []);

  const handlePinnedDragEnd = useCallback(
    ({ data, from, to }: { data: TaskBlock[]; from: number; to: number }) => {
      isDraggingRef.current = false;
      dragPlaceholderIndexRef.current = null;
      setIsDragging(false);

      const nextBlocks = reorderBlocks(pinnedBlocks, data, from, to);
      const nextVersion = getBlockOrderVersion(nextBlocks);
      if (nextVersion === pinnedBlocksVersionRef.current) return;

      pinnedBlocksVersionRef.current = nextVersion;
      setPinnedBlocks(nextBlocks);
      onReorderTasks?.("pinned", blocksToTasks(nextBlocks));
    },
    [onReorderTasks, pinnedBlocks],
  );

  const handleTasksDragEnd = useCallback(
    ({ data, from, to }: { data: TaskBlock[]; from: number; to: number }) => {
      isDraggingRef.current = false;
      dragPlaceholderIndexRef.current = null;
      setIsDragging(false);

      const nextBlocks = reorderBlocks(taskBlocks, data, from, to);
      const nextVersion = getBlockOrderVersion(nextBlocks);
      if (nextVersion === taskBlocksVersionRef.current) return;

      taskBlocksVersionRef.current = nextVersion;
      setTaskBlocks(nextBlocks);
      onReorderTasks?.("tasks", blocksToTasks(nextBlocks));
    },
    [onReorderTasks, taskBlocks],
  );

  const dismissContextMenuForTask = useCallback(
    (task: TaskItem) => {
      if (contextMenuTaskIdRef.current === task.id) {
        closeContextMenu();
      }
    },
    [closeContextMenu],
  );

  const handleTaskPress = useCallback(
    (task: TaskItem) => {
      if (contextMenu) {
        closeContextMenu();
        return;
      }
      onOpenTask(task);
    },
    [closeContextMenu, contextMenu, onOpenTask],
  );

  const renderDropPlaceholder = useCallback(
    () => <TaskDropPlaceholder />,
    [],
  );

  const renderStaticBlock = useCallback(
    (item: TaskBlock) => {
      const subtaskCount = subtaskCountByParentId.get(item.root.id) ?? 0;
      const subtasksExpanded = isSubtasksExpanded(item.root.id, subtaskCount);
      const visibleChildren = subtasksExpanded
        ? getVisibleSubtasks(item.children)
        : [];

      return (
        <View key={item.id}>
          <TaskRow
            task={item.root}
            showPreviewImage
            showListName={showListName}
            onToggleComplete={handleToggleComplete}
            onPress={handleTaskPress}
            onOpenContextMenu={openContextMenu}
            onContextMenuGestureEnd={handleContextMenuGestureEnd}
            onMovePastThreshold={dismissContextMenuForTask}
            contextMenuDelayMs={TASK_LIST_CONTEXT_MENU_DELAY_MS}
            subtaskCount={subtaskCount}
            subtasksExpanded={subtasksExpanded}
            onToggleSubtasksExpanded={
              subtaskCount > 0
                ? () => toggleSubtasksExpanded(item.root.id, subtaskCount)
                : undefined
            }
            showSubtaskCollapseToggle
          />
          {visibleChildren.map((child) => (
            <TaskRow
              key={child.id}
              task={child}
              showPreviewImage
              showListName={showListName}
              onToggleComplete={handleToggleComplete}
              onPress={handleTaskPress}
              onOpenContextMenu={openContextMenu}
              onContextMenuGestureEnd={handleContextMenuGestureEnd}
              onMovePastThreshold={dismissContextMenuForTask}
              contextMenuDelayMs={TASK_LIST_CONTEXT_MENU_DELAY_MS}
            />
          ))}
        </View>
      );
    },
    [
      dismissContextMenuForTask,
      handleContextMenuGestureEnd,
      handleTaskPress,
      handleToggleComplete,
      isSubtasksExpanded,
      openContextMenu,
      showListName,
      subtaskCountByParentId,
      toggleSubtasksExpanded,
    ],
  );

  const renderBlockItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<TaskBlock>) => {
      const subtaskCount = subtaskCountByParentId.get(item.root.id) ?? 0;
      const subtasksExpanded = isSubtasksExpanded(item.root.id, subtaskCount);
      const visibleChildren = subtasksExpanded
        ? getVisibleSubtasks(item.children)
        : [];

      return (
        <ScaleDecorator activeScale={1}>
          <TaskRow
            task={item.root}
            showPreviewImage
            showListName={showListName}
            onToggleComplete={handleToggleComplete}
            onPress={handleTaskPress}
            onOpenContextMenu={openContextMenu}
            onContextMenuGestureEnd={handleContextMenuGestureEnd}
            onMovePastThreshold={dismissContextMenuForTask}
            onDrag={drag}
            isDragging={isActive}
            longPressDelayMs={TASK_LIST_DRAG_DELAY_MS}
            contextMenuDelayMs={TASK_LIST_CONTEXT_MENU_DELAY_MS}
            enableHoldShadow
            subtaskCount={subtaskCount}
            subtasksExpanded={subtasksExpanded}
            onToggleSubtasksExpanded={
              subtaskCount > 0
                ? () => toggleSubtasksExpanded(item.root.id, subtaskCount)
                : undefined
            }
            showSubtaskCollapseToggle
          />
          {visibleChildren.map((child) => (
            <TaskRow
              key={child.id}
              task={child}
              showPreviewImage
              showListName={showListName}
              onToggleComplete={handleToggleComplete}
              onPress={handleTaskPress}
              onOpenContextMenu={openContextMenu}
              onContextMenuGestureEnd={handleContextMenuGestureEnd}
              onMovePastThreshold={dismissContextMenuForTask}
              contextMenuDelayMs={TASK_LIST_CONTEXT_MENU_DELAY_MS}
            />
          ))}
        </ScaleDecorator>
      );
    },
    [
      dismissContextMenuForTask,
      handleContextMenuGestureEnd,
      handleTaskPress,
      handleToggleComplete,
      isSubtasksExpanded,
      openContextMenu,
      showListName,
      subtaskCountByParentId,
      toggleSubtasksExpanded,
    ],
  );

  async function handleSetPriority(priority: number | null) {
    if (!contextTask) return;
    closeContextMenu();
    try {
      await updateTaskPriority(contextTask.id, priority);
      patchTaskLocally();
    } catch {
      Alert.alert("Couldn't update priority");
    }
  }

  function handleOpenDatePicker() {
    setContextMenu(null);
    setContextMenuBackdropReady(false);
    setDatePickerOpen(true);
  }

  async function handleScheduleChange(selection: TaskScheduleSelection) {
    if (!contextTask) return;
    closeContextMenu();
    try {
      await updateTaskSchedule(contextTask.id, selection);
      patchTaskLocally();
    } catch {
      Alert.alert("Couldn't update date");
    }
  }

  async function handleDuplicateTask() {
    if (!contextTask) return;
    closeContextMenu();
    try {
      await createTask({
        name: contextTask.name,
        listId: contextTask.listId,
        dueDate: contextTask.dueDate,
        priority: contextTask.priority,
        labelIds: contextTask.labels.map((label) => label.id),
        parentId: contextTask.parentId,
      });
      patchTaskLocally();
      void loadSidebar(true);
    } catch {
      Alert.alert("Couldn't duplicate task");
    }
  }

  async function handleCopyLink() {
    if (!contextTask) return;
    closeContextMenu();
    const result = await copyToClipboard(getTaskShareUrl(contextTask.id));
    if (result === "copied") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    if (result === "failed") {
      Alert.alert("Couldn't copy link");
    }
  }

  async function openLabelPicker() {
    if (!contextTask) return;
    setContextMenu(null);
    setContextMenuBackdropReady(false);
    try {
      const labels = await fetchLabels();
      setAllLabels(labels);
      setLabelPickerOpen(true);
    } catch {
      Alert.alert("Couldn't load labels");
    }
  }

  async function handleToggleLabel(labelId: string, assigned: boolean) {
    if (!contextTask) return;
    try {
      await toggleTaskLabel(contextTask.id, labelId, assigned);
      if (selectedView) {
        void loadTasksForView(selectedView, true);
      }
    } catch {
      Alert.alert("Couldn't update label");
    }
  }

  function handleDeleteTask() {
    if (!contextTask) return;
    const task = contextTask;
    closeContextMenu();
    Alert.alert("Delete task", `Delete "${task.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteTask(task.id);
        },
      },
    ]);
  }

  async function handleMoveToList(list: SidebarListItem) {
    if (!contextTask || list.id === contextTask.listId) {
      closeContextMenu();
      return;
    }

    closeContextMenu();
    try {
      await moveTaskToList(contextTask.id, list.id);
      if (selectedView) {
        void loadTasksForView(selectedView, true);
      }
      void loadSidebar(true);
    } catch {
      Alert.alert("Couldn't move task");
    }
  }

  const assignedLabelIds = useMemo(
    () => new Set((contextTask?.labels ?? []).map((label) => label.id)),
    [contextTask?.labels],
  );

  return (
    <ListsDrawerShell
      open={listsDrawerOpen}
      onOpen={openListsDrawerPanel}
      onClose={openTasksForDrawerSelection}
      style={styles.drawerHost}
    >
      <View collapsable={false} style={{ flex: 1 }}>
        <TaskListShell
          title={getPanelTitle(selectedView, taskData)}
          selectedView={selectedView}
          onOpenLists={openListsDrawer}
          completeUndoVisible={completeUndoVisible}
          onCompleteUndo={handleUndoComplete}
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
          <NestableScrollContainer
            ref={scrollRef as never}
            style={styles.scrollContainer}
            contentContainerStyle={getListContentStyle(listBottomPadding)}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            scrollEnabled={!isDragging}
            showsVerticalScrollIndicator
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {visiblePinnedBlocks.length > 0 ? (
              <>
                <TaskSectionTitle title="Pinned" />
                <NestableDraggableFlatList
                  data={visiblePinnedBlocks}
                  keyExtractor={(item) => `pinned-${item.id}`}
                  onDragBegin={handleDragBegin}
                  onPlaceholderIndexChange={handlePlaceholderIndexChange}
                  onDragEnd={handlePinnedDragEnd}
                  renderItem={renderBlockItem}
                  renderPlaceholder={renderDropPlaceholder}
                  animationConfig={DROP_ANIMATION_CONFIG}
                  activationDistance={12}
                  scrollEnabled={false}
                />
              </>
            ) : null}

            {visibleTaskBlocks.length > 0 ? (
              manualTaskOrder ? (
                <NestableDraggableFlatList
                  data={visibleTaskBlocks}
                  keyExtractor={(item) => item.id}
                  onDragBegin={handleDragBegin}
                  onPlaceholderIndexChange={handlePlaceholderIndexChange}
                  onDragEnd={handleTasksDragEnd}
                  renderItem={renderBlockItem}
                  renderPlaceholder={renderDropPlaceholder}
                  animationConfig={DROP_ANIMATION_CONFIG}
                  activationDistance={12}
                  scrollEnabled={false}
                />
              ) : (
                <View>
                  {taskSections.map((section) => (
                    <View key={section.key}>
                      {section.title ? (
                        <TaskSectionTitle title={section.title} />
                      ) : null}
                      {section.blocks.map((block) => renderStaticBlock(block))}
                    </View>
                  ))}
                </View>
              )
            ) : null}
          </NestableScrollContainer>
        )}
      </TaskListShell>
      {!addTaskComposerOpen && showTypeFilter ? (
        <TaskListTypeFilterBar
          value={contentFilter}
          onChange={setContentFilter}
        />
      ) : null}
      {!addTaskComposerOpen ? <AddTaskButton /> : null}

      {contextMenu &&
      !movePickerOpen &&
      !labelPickerOpen &&
      !datePickerOpen ? (
        <TaskContextMenu
          task={contextMenu.task}
          top={contextMenu.top}
          left={contextMenu.left}
          backdropEnabled={contextMenuBackdropReady && !isDragging}
          onClose={closeContextMenu}
          onSetPriority={(priority) => void handleSetPriority(priority)}
          onMoveTo={() => {
            setContextMenu(null);
            setContextMenuBackdropReady(false);
            setMovePickerOpen(true);
          }}
          onDate={handleOpenDatePicker}
          onAddLabel={() => void openLabelPicker()}
          onDuplicate={() => void handleDuplicateTask()}
          onCopyLink={() => void handleCopyLink()}
          onDelete={handleDeleteTask}
        />
      ) : null}

      {datePickerOpen && contextTask ? (
        <TaskDatePickerSheet
          visible={datePickerOpen}
          value={contextTask.dueDate}
          dueTimeMinutes={contextTask.dueTimeMinutes ?? null}
          dueDurationMinutes={contextTask.dueDurationMinutes ?? null}
          dueRepeat={contextTask.dueRepeat ?? null}
          onSelect={(selection) => void handleScheduleChange(selection)}
          onClose={closeContextMenu}
        />
      ) : null}

      {movePickerOpen && contextTask ? (
        <Modal
          transparent
          animationType="fade"
          onRequestClose={closeContextMenu}
        >
          <Pressable style={styles.renameBackdrop} onPress={closeContextMenu} />
          <View style={styles.moveCard}>
            <ThemedText style={styles.renameTitle}>Move to</ThemedText>
            {lists.map((list) => (
              <Pressable
                key={list.id}
                style={styles.moveRow}
                onPress={() => handleMoveToList(list)}
              >
                <ThemedText
                  style={[
                    styles.moveRowLabel,
                    list.id === contextTask.listId && styles.moveRowCurrent,
                  ]}
                >
                  {list.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Modal>
      ) : null}

      {labelPickerOpen && contextTask ? (
        <TaskLabelPicker
          labels={allLabels}
          assignedLabelIds={assignedLabelIds}
          onToggleLabel={(labelId, assigned) =>
            void handleToggleLabel(labelId, assigned)
          }
          onClose={closeContextMenu}
        />
      ) : null}
      </View>
    </ListsDrawerShell>
  );
}

const styles = StyleSheet.create({
  drawerHost: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  renameBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  renameTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  moveCard: {
    position: "absolute",
    left: 28,
    right: 28,
    top: "28%",
    maxHeight: "50%",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  moveRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  moveRowLabel: {
    fontSize: 16,
  },
  moveRowCurrent: {
    fontWeight: "600",
    color: "#2563eb",
  },
});
