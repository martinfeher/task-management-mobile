import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { ScrollView } from "react-native-gesture-handler";

import { AddTaskButton } from "@/components/add-task-button";
import {
  TaskContextMenu,
  TASK_CONTEXT_MENU_ESTIMATED_HEIGHT,
  TASK_CONTEXT_MENU_WIDTH,
  type TaskContextMenuAnchor,
} from "@/components/task-context-menu";
import { TaskLabelPicker } from "@/components/task-label-picker";
import { TaskRow } from "@/components/task-row";
import { ThemedText } from "@/components/themed-text";
import {
  getListContentStyle,
  getPanelTitle,
  getTaskListBlockingState,
  TaskListShell,
  TaskSectionTitle,
  useToggleComplete,
  type TaskListPanelProps,
} from "@/components/task-list-panel-shared";
import { useApp } from "@/contexts/app-context";
import {
  fetchLabels,
  moveTaskToList,
  toggleTaskImportant,
  toggleTaskLabel,
  updateTaskName,
  updateTaskPinned,
  updateTaskPriority,
} from "@/lib/api";
import { blocksToTasks, tasksToBlocks, type TaskBlock } from "@/lib/task-blocks";
import type { SidebarListItem, TaskItem, TaskLabel } from "@/types/todo";

/** Snappy drop settle (library default: mass 0.2 / stiffness 100). */
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
    openListsDrawer,
    deleteTask,
  } = useApp();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const panelRef = useRef<View>(null);
  const showListName = selectedView?.type !== "list";
  const handleToggleComplete = useToggleComplete(onTaskCompleted, onTaskUncompleted);
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
  const [contextMenuBackdropReady, setContextMenuBackdropReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [renameDraft, setRenameDraft] = useState<string | null>(null);
  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [allLabels, setAllLabels] = useState<TaskLabel[]>([]);
  const contextTask = contextMenu?.task ?? null;
  const contextMenuTaskIdRef = useRef<string | null>(null);
  const backdropReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextMenuGestureActiveRef = useRef(false);

  const blockingState = getTaskListBlockingState({
    selectedView,
    loading,
    taskData,
    error,
    onRetry,
    onOpenListsDrawer: openListsDrawer,
  });

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
    setRenameDraft(null);
    setMovePickerOpen(false);
    setLabelPickerOpen(false);
  }, []);

  const scheduleBackdropReady = useCallback(() => {
    if (backdropReadyTimerRef.current) {
      clearTimeout(backdropReadyTimerRef.current);
    }
    backdropReadyTimerRef.current = setTimeout(() => {
      backdropReadyTimerRef.current = null;
      if (!contextMenuGestureActiveRef.current && contextMenuTaskIdRef.current) {
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
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (backdropReadyTimerRef.current) {
        clearTimeout(backdropReadyTimerRef.current);
        backdropReadyTimerRef.current = null;
      }
      contextMenuGestureActiveRef.current = true;
      setContextMenuBackdropReady(false);
      panelRef.current?.measureInWindow((panelX, panelY) => {
        const left = Math.max(
          8,
          Math.min(
            anchor.x - panelX + 8,
            windowWidth - panelX - TASK_CONTEXT_MENU_WIDTH - 8,
          ),
        );
        const belowTop = anchor.y - panelY + anchor.height + 6;
        const aboveTop =
          anchor.y - panelY - TASK_CONTEXT_MENU_ESTIMATED_HEIGHT - 6;
        const fitsBelow =
          belowTop + TASK_CONTEXT_MENU_ESTIMATED_HEIGHT <
          windowHeight - panelY - 8;
        const top = fitsBelow ? belowTop : Math.max(8, aboveTop);

        contextMenuTaskIdRef.current = task.id;
        setContextMenu({ task, top, left });
        setRenameDraft(null);
        setMovePickerOpen(false);
        setLabelPickerOpen(false);
      });
    },
    [windowHeight, windowWidth],
  );

  const handleDragBegin = useCallback(() => {
    setIsDragging(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const dismissContextMenuForTask = useCallback(
    (task: TaskItem) => {
      if (contextMenuTaskIdRef.current === task.id) {
        closeContextMenu();
      }
    },
    [closeContextMenu],
  );

  const renderBlockItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<TaskBlock>) => (
      <ScaleDecorator activeScale={1.02}>
        <View style={isActive ? styles.activeBlock : undefined}>
          <TaskRow
            task={item.root}
            showListName={showListName}
            onToggleComplete={handleToggleComplete}
            onPress={onOpenTask}
            onOpenContextMenu={openContextMenu}
            onContextMenuGestureEnd={handleContextMenuGestureEnd}
            onMovePastThreshold={dismissContextMenuForTask}
            onDrag={drag}
            isDragging={isActive}
            style={isActive ? styles.activeRow : undefined}
          />
          {item.children.map((child) => (
            <TaskRow
              key={child.id}
              task={child}
              showListName={showListName}
              onToggleComplete={handleToggleComplete}
              onPress={onOpenTask}
              onOpenContextMenu={openContextMenu}
              onContextMenuGestureEnd={handleContextMenuGestureEnd}
              onMovePastThreshold={dismissContextMenuForTask}
            />
          ))}
        </View>
      </ScaleDecorator>
    ),
    [
      dismissContextMenuForTask,
      handleContextMenuGestureEnd,
      handleToggleComplete,
      onOpenTask,
      openContextMenu,
      showListName,
    ],
  );

  async function handleTogglePinned() {
    if (!contextTask) return;
    const next = !contextTask.pinned;
    closeContextMenu();
    try {
      await updateTaskPinned(contextTask.id, next);
      patchTaskLocally();
    } catch {
      Alert.alert("Couldn't update pin");
    }
  }

  async function handleToggleImportant() {
    if (!contextTask) return;
    const next = !contextTask.important;
    closeContextMenu();
    try {
      await toggleTaskImportant(contextTask.id, next);
      patchTaskLocally();
    } catch {
      Alert.alert("Couldn't update important");
    }
  }

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

  function handleRename() {
    if (!contextTask) return;
    const task = contextTask;
    if (Platform.OS === "ios") {
      setContextMenu(null);
      Alert.prompt(
        "Rename task",
        undefined,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (value?: string) => {
              void (async () => {
                const next = value?.trim();
                if (!next) return;
                try {
                  await updateTaskName(task.id, next);
                  patchTaskLocally();
                } catch {
                  Alert.alert("Couldn't rename task");
                }
              })();
            },
          },
        ],
        "plain-text",
        task.name,
      );
      return;
    }
    setRenameDraft(contextTask.name);
  }

  async function submitRename() {
    if (!contextTask || renameDraft == null) return;
    const next = renameDraft.trim();
    if (!next) {
      setRenameDraft(null);
      return;
    }
    closeContextMenu();
    try {
      await updateTaskName(contextTask.id, next);
      patchTaskLocally();
    } catch {
      Alert.alert("Couldn't rename task");
    }
  }

  async function openLabelPicker() {
    if (!contextTask) return;
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
    <View ref={panelRef} collapsable={false} style={{ flex: 1 }}>
      <TaskListShell title={getPanelTitle(selectedView, taskData)}>
        {blockingState ?? (
          <NestableScrollContainer
            ref={scrollRef as never}
            style={{ flex: 1 }}
            contentContainerStyle={getListContentStyle()}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            {pinnedBlocks.length > 0 ? (
              <>
                <TaskSectionTitle title="Pinned" />
                <NestableDraggableFlatList
                  data={pinnedBlocks}
                  keyExtractor={(item) => `pinned-${item.id}`}
                  onDragBegin={handleDragBegin}
                  onDragEnd={({ data }) => {
                    setIsDragging(false);
                    onReorderTasks?.("pinned", blocksToTasks(data));
                  }}
                  renderItem={renderBlockItem}
                  activationDistance={15}
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
                  setIsDragging(false);
                  onReorderTasks?.("tasks", blocksToTasks(data));
                }}
                renderItem={renderBlockItem}
                activationDistance={15}
                animationConfig={DROP_ANIMATION_CONFIG}
                scrollEnabled={false}
              />
            ) : null}
          </NestableScrollContainer>
        )}
      </TaskListShell>
      {!addTaskComposerOpen ? <AddTaskButton /> : null}

      {contextMenu && !renameDraft && !movePickerOpen && !labelPickerOpen ? (
        <TaskContextMenu
          task={contextMenu.task}
          top={contextMenu.top}
          left={contextMenu.left}
          backdropEnabled={contextMenuBackdropReady && !isDragging}
          onClose={closeContextMenu}
          onRename={handleRename}
          onTogglePinned={() => void handleTogglePinned()}
          onToggleImportant={() => void handleToggleImportant()}
          onSetPriority={(priority) => void handleSetPriority(priority)}
          onMoveTo={() => setMovePickerOpen(true)}
          onAddLabel={() => void openLabelPicker()}
          onDelete={handleDeleteTask}
        />
      ) : null}

      {renameDraft != null && contextTask ? (
        <Modal transparent animationType="fade" onRequestClose={closeContextMenu}>
          <Pressable style={styles.renameBackdrop} onPress={closeContextMenu} />
          <View style={styles.renameCard}>
            <ThemedText style={styles.renameTitle}>Rename task</ThemedText>
            <TextInput
              value={renameDraft}
              onChangeText={setRenameDraft}
              autoFocus
              style={styles.renameInput}
              onSubmitEditing={() => void submitRename()}
            />
            <View style={styles.renameActions}>
              <Pressable onPress={closeContextMenu} style={styles.renameButton}>
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => void submitRename()}
                style={styles.renameButton}>
                <ThemedText style={styles.renameSave}>Save</ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}

      {movePickerOpen && contextTask ? (
        <Modal transparent animationType="fade" onRequestClose={closeContextMenu}>
          <Pressable style={styles.renameBackdrop} onPress={closeContextMenu} />
          <View style={styles.moveCard}>
            <ThemedText style={styles.renameTitle}>Move to</ThemedText>
            {lists.map((list) => (
              <Pressable
                key={list.id}
                style={styles.moveRow}
                onPress={() => handleMoveToList(list)}>
                <ThemedText
                  style={[
                    styles.moveRowLabel,
                    list.id === contextTask.listId && styles.moveRowCurrent,
                  ]}>
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
  );
}

const styles = StyleSheet.create({
  activeBlock: {
    zIndex: 10,
  },
  activeRow: {
    backgroundColor: "#ffffff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 6 },
    }),
  },
  renameBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  renameCard: {
    position: "absolute",
    left: 28,
    right: 28,
    top: "35%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  renameTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  renameInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  renameActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
  },
  renameButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  renameSave: {
    color: "#2563eb",
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
