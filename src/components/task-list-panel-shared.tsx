import { useCallback, useMemo, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppSymbol } from "@/components/app-symbol";
import { FiChevronLeftIcon } from "@/components/fi-chevron-left-icon";
import { TaskRow } from "@/components/task-row";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTaskListSubtasksExpanded } from "@/hooks/use-task-list-subtasks-expanded";
import { tasksToBlocks } from "@/lib/task-blocks";
import { getVisibleSubtasks } from "@/lib/task-subtasks";
import type { SelectedView, TaskItem, TaskListData } from "@/types/todo";

/** Hold duration before drag/reorder can start in the task list panel. */
export const TASK_LIST_DRAG_DELAY_MS = 130;

/** Hold duration before the task context menu opens in the task list panel. */
export const TASK_LIST_CONTEXT_MENU_DELAY_MS = 800;

const LIST_NAV_ICON_INSET = 12;

/** @deprecated Use `TASK_LIST_DRAG_DELAY_MS`. */
export const TASK_LIST_LONG_PRESS_MS = TASK_LIST_DRAG_DELAY_MS;

export type TaskListPanelProps = {
  selectedView: SelectedView | null;
  taskData: TaskListData | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  onRetry: () => void;
  onTaskCompleted: (taskId: string) => void;
  onTaskUncompleted?: (taskId: string) => void;
  onOpenTask: (task: TaskItem) => void;
  onReorderTasks?: (section: "tasks" | "pinned", tasks: TaskItem[]) => void;
};

export function getPanelTitle(
  view: SelectedView | null,
  taskData: TaskListData | null,
) {
  if (taskData?.title) return taskData.title;
  if (!view) return "Tasks";
  if (view.type === "today") return "Today";
  if (view.type === "important") return "Important";
  if (view.type === "label") return "Label";
  return "Tasks";
}

export function getEmptyMessage(view: SelectedView | null) {
  if (!view) return "Select a list from the Lists tab";
  if (view.type === "today") return "No tasks for today";
  if (view.type === "important") return "No important tasks";
  if (view.type === "label") return "No tasks with this label";
  return "No tasks";
}

export function useToggleComplete(
  onCompleteTask: (taskId: string) => void,
  onUncompleteTask?: (taskId: string) => void,
) {
  return useCallback(
    (taskId: string, completed = true) => {
      if (completed) {
        void onCompleteTask(taskId);
        return;
      }
      void onUncompleteTask?.(taskId);
    },
    [onCompleteTask, onUncompleteTask],
  );
}

export function TaskListShell({
  title,
  children,
  onOpenLists,
}: {
  title: string;
  children: ReactNode;
  onOpenLists?: () => void;
}) {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          {onOpenLists ? (
            <Pressable
              onPress={onOpenLists}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Open lists"
              style={styles.listsNavButton}
            >
              <FiChevronLeftIcon size={30} color="#a4a4b4" />
            </Pressable>
          ) : null}
          <ThemedText style={styles.headerTitle} numberOfLines={1}>
            {title}
          </ThemedText>
        </View>
        <View style={styles.listBody}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

export function getTaskListBlockingState({
  selectedView,
  loading,
  taskData,
  error,
  onRetry,
  onOpenListsDrawer,
}: {
  selectedView: SelectedView | null;
  loading: boolean;
  taskData: TaskListData | null;
  error: string | null;
  onRetry: () => void;
  onOpenListsDrawer?: () => void;
}): ReactNode | null {
  if (!selectedView) {
    return (
      <View style={styles.centerState}>
        <AppSymbol
          ios="list.bullet"
          android="list"
          size={40}
          tintColor="#d4d4d8"
        />
        <ThemedText style={styles.emptyTitle}>No list selected</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.emptyHint}>
          Choose a list from the Lists drawer to view its tasks.
        </ThemedText>
        {onOpenListsDrawer ? (
          <Pressable style={styles.goToListsButton} onPress={onOpenListsDrawer}>
            <ThemedText style={styles.goToListsButtonText}>
              Open Lists
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (loading && !taskData) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color="#4873c7" />
        <ThemedText themeColor="textSecondary">Loading tasks…</ThemedText>
      </View>
    );
  }

  if (error && !taskData) {
    return (
      <View style={styles.centerState}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </Pressable>
      </View>
    );
  }

  const pinned = taskData?.pinned ?? [];
  const tasks = taskData?.tasks ?? [];
  if (pinned.length === 0 && tasks.length === 0) {
    return (
      <View style={styles.centerState}>
        <ThemedText themeColor="textSecondary">
          {getEmptyMessage(selectedView)}
        </ThemedText>
      </View>
    );
  }

  return null;
}

export function TaskListStateView(props: {
  selectedView: SelectedView | null;
  loading: boolean;
  taskData: TaskListData | null;
  error: string | null;
  onRetry: () => void;
}) {
  return getTaskListBlockingState(props);
}

export function StaticTaskSection({
  title,
  tasks,
  showListName,
  onToggleComplete,
  onPressTask,
}: {
  title?: string;
  tasks: TaskItem[];
  showListName: boolean;
  onToggleComplete: (taskId: string, completed?: boolean) => void;
  onPressTask: (task: TaskItem) => void;
}) {
  const blocks = useMemo(() => tasksToBlocks(tasks), [tasks]);
  const { subtaskCountByParentId, isSubtasksExpanded, toggleSubtasksExpanded } =
    useTaskListSubtasksExpanded(tasks);

  if (tasks.length === 0) return null;

  return (
    <View style={title ? styles.pinnedSection : undefined}>
      {title ? (
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      ) : null}
      {blocks.map((block) => {
        const subtaskCount = subtaskCountByParentId.get(block.root.id) ?? 0;
        const subtasksExpanded = isSubtasksExpanded(
          block.root.id,
          subtaskCount,
        );
        const visibleChildren = subtasksExpanded
          ? getVisibleSubtasks(block.children)
          : [];

        return (
          <View key={block.id}>
            <TaskRow
              task={block.root}
              showListName={showListName}
              onToggleComplete={onToggleComplete}
              onPress={onPressTask}
              subtaskCount={subtaskCount}
              subtasksExpanded={subtasksExpanded}
              onToggleSubtasksExpanded={
                subtaskCount > 0
                  ? () => toggleSubtasksExpanded(block.root.id, subtaskCount)
                  : undefined
              }
              showSubtaskCollapseToggle
            />
            {visibleChildren.map((child) => (
              <TaskRow
                key={child.id}
                task={child}
                showListName={showListName}
                onToggleComplete={onToggleComplete}
                onPress={onPressTask}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

export function TaskSectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.pinnedSection}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
    </View>
  );
}

export const taskListStyles = StyleSheet.create({
  listContent: {} as ViewStyle,
});

export function getListContentStyle(bottomPadding = 115): StyleProp<ViewStyle> {
  return [taskListStyles.listContent, { paddingBottom: bottomPadding }];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    overflow: "visible",
  },
  safeArea: {
    flex: 1,
  },
  listBody: {
    flex: 1,
  },
  header: {
    paddingLeft: 26,
    paddingRight: Spacing.three,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e4e4e7",
    backgroundColor: "#ffffff",
  },
  listsNavButton: {
    alignSelf: "flex-start",
    paddingTop: LIST_NAV_ICON_INSET,
    marginBottom: LIST_NAV_ICON_INSET,
    marginLeft: -13,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#18181b",
  },
  pinnedSection: {
    backgroundColor: "rgba(250, 250, 250, 0.4)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e4e4e7",
  },
  sectionTitle: {
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
    paddingBottom: 4,
    fontSize: 10,
    fontWeight: "600",
    color: "#cbd5e1",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyHint: {
    fontSize: 14,
    textAlign: "center",
  },
  goToListsButton: {
    marginTop: Spacing.two,
    backgroundColor: "#4873c7",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  goToListsButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  errorText: {
    color: "#d14343",
    fontWeight: "600",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#4873c7",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
