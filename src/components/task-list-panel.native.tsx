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
import { ListsDrawerShell } from "@/components/lists-drawer-shell";
import {
  TASK_CONTEXT_MENU_ESTIMATED_HEIGHT,
  TASK_CONTEXT_MENU_WIDTH,
  TaskContextMenu,
  type TaskContextMenuAnchor,
} from "@/components/task-context-menu";
import { TaskDatePickerSheet, type TaskScheduleSelection } from "@/components/task-date-picker-sheet";
import { TaskLabelPicker } from "@/components/task-label-picker";
import {
  getListContentStyle,
  getPanelTitle,
  getTaskListBlockingState,
  TaskListShell,
  TaskSectionTitle,
  TASK_LIST_CONTEXT_MENU_DELAY_MS,
  TASK_LIST_DRAG_DELAY_MS,
  useToggleComplete,
  type TaskListPanelProps,
} from "@/components/task-list-panel-shared";
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
} from "@/lib/api";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { getTaskShareUrl } from "@/lib/task-link";
import {
  blocksToTasks,
  tasksToBlocks,
  type TaskBlock,
} from "@/lib/task-blocks";
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
    setListsDrawerOpen,
    closeListsDrawer,
    deleteTask,
  } = useApp();
  const insets = useSafeAreaInsets();
  const listBottomPadding = getAddTaskFabReservedHeight(insets.bottom);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const showListName = selectedView?.type !== "list";
  const handleToggleComplete = useToggleComplete(
    onTaskCompleted,
    onTaskUncompleted,
  );
  const pinned = taskData?.pinned ?? [];
  const tasks = taskData?.tasks ?? [];
  const pinnedBlocks = useMemo(
    () => tasksToBlocks(taskData?.pinned ?? []),
    [taskData?.pinned],
  );
  const taskBlocks = useMemo(
    () => tasksToBlocks(taskData?.tasks ?? []),
    [taskData?.tasks],
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [contextMenuBackdropReady, setContextMenuBackdropReady] =
    useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [allLabels, setAllLabels] = useState<TaskLabel[]>([]);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const contextTask = activeTask;
  const contextMenuTaskIdRef = useRef<string | null>(null);
  const isDraggingRef = useRef(isDragging);
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

  const handleDragBegin = useCallback(() => {
    isDraggingRef.current = true;
    closeContextMenu();
    setIsDragging(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [closeContextMenu]);

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

  const renderBlockItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<TaskBlock>) => (
      <ScaleDecorator activeScale={0.975}>
        <TaskRow
          task={item.root}
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
        />
        {item.children.map((child) => (
          <TaskRow
            key={child.id}
            task={child}
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
    ),
    [
      dismissContextMenuForTask,
      handleContextMenuGestureEnd,
      handleTaskPress,
      handleToggleComplete,
      openContextMenu,
      showListName,
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

  const lists = sidebarData?.lists ?? [];
  const assignedLabelIds = useMemo(
    () => new Set((contextTask?.labels ?? []).map((label) => label.id)),
    [contextTask?.labels],
  );

  return (
    <ListsDrawerShell
      open={listsDrawerOpen}
      onOpen={() => setListsDrawerOpen(true)}
      onClose={() => closeListsDrawer({ goToTasksTab: false })}
      style={styles.drawerHost}
    >
      <View collapsable={false} style={{ flex: 1 }}>
        <TaskListShell
          title={getPanelTitle(selectedView, taskData)}
          onOpenLists={openListsDrawer}
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
            {pinnedBlocks.length > 0 ? (
              <>
                <TaskSectionTitle title="Pinned" />
                <NestableDraggableFlatList
                  data={pinnedBlocks}
                  keyExtractor={(item) => `pinned-${item.id}`}
                  onDragBegin={handleDragBegin}
                  onDragEnd={({ data }) => {
                    isDraggingRef.current = false;
                    setIsDragging(false);
                    onReorderTasks?.("pinned", blocksToTasks(data));
                  }}
                  renderItem={renderBlockItem}
                  animationConfig={DROP_ANIMATION_CONFIG}
                  scrollEnabled={false}
                />
              </>
            ) : null}

            {taskBlocks.length > 0 ? (
              <NestableDraggableFlatList
                data={taskBlocks}
                keyExtractor={(item) => item.id}
                onDragBegin={handleDragBegin}
                onDragEnd={({ data }) => {
                  isDraggingRef.current = false;
                  setIsDragging(false);
                  onReorderTasks?.("tasks", blocksToTasks(data));
                }}
                renderItem={renderBlockItem}
                animationConfig={DROP_ANIMATION_CONFIG}
                scrollEnabled={false}
              />
            ) : null}
          </NestableScrollContainer>
        )}
      </TaskListShell>
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
