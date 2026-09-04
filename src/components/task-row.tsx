import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { TaskCheckbox } from "@/components/task-checkbox";
import { AppSymbol } from "@/components/app-symbol";
import { ThemedText } from "@/components/themed-text";
import type { TaskContextMenuAnchor } from "@/components/task-context-menu";
import { TASK_PRIORITY_OPTIONS } from "@/components/task-context-menu";
import { formatTaskDueDate } from "@/lib/format-due-date";
import { getLabelDotColor } from "@/lib/label-colors";
import type { TaskItem, TaskLabel } from "@/types/todo";

const CONTEXT_MENU_HOLD_MS = 250;
const MOVE_CLOSE_THRESHOLD_PX = 15;

const TASK_ROW_HORIZONTAL_INSET = 14;

type TaskRowProps = {
  task: TaskItem;
  showListName?: boolean;
  onPress?: (task: TaskItem) => void;
  /** Starts drag-and-drop (react-native-draggable-flatlist `drag`). */
  onDrag?: () => void;
  onOpenContextMenu?: (task: TaskItem, anchor: TaskContextMenuAnchor) => void;
  /** Called when the long-press finger lifts after opening the context menu. */
  onContextMenuGestureEnd?: () => void;
  /** Fired once the finger has moved ~15px while the context menu is open. */
  onMovePastThreshold?: (task: TaskItem) => void;
  isDragging?: boolean;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

function TaskLabelChip({ label }: { label: TaskLabel }) {
  const backgroundColor = getLabelDotColor(label);

  return (
    <View style={[styles.labelChip, { backgroundColor }]}>
      <ThemedText style={styles.labelChipText} numberOfLines={1}>
        {label.label}
      </ThemedText>
    </View>
  );
}

export function TaskRow({
  task,
  showListName = false,
  onPress,
  onDrag,
  onOpenContextMenu,
  onContextMenuGestureEnd,
  onMovePastThreshold,
  isDragging = false,
  onToggleComplete,
  style,
}: TaskRowProps) {
  const dueDateLabel = formatTaskDueDate(task.dueDate, task.dueTimeMinutes);
  const [optimisticChecked, setOptimisticChecked] = useState(false);
  const checked = task.completed || optimisticChecked;
  const rowRef = useRef<View>(null);
  const menuOpenedThisGestureRef = useRef(false);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const moveThresholdFiredRef = useRef(false);
  const pressActiveRef = useRef(false);

  useEffect(() => {
    setOptimisticChecked(false);
  }, [task.id, task.completed]);

  function handleLongPress() {
    menuOpenedThisGestureRef.current = true;
    if (onOpenContextMenu) {
      rowRef.current?.measureInWindow((x, y, width, height) => {
        onOpenContextMenu(task, { x, y, width, height });
      });
    }
    onDrag?.();
  }

  function handleTouchStart(pageX: number, pageY: number) {
    pressActiveRef.current = true;
    pressOriginRef.current = { x: pageX, y: pageY };
    moveThresholdFiredRef.current = false;
  }

  function handleTouchMove(pageX: number, pageY: number) {
    if (!menuOpenedThisGestureRef.current || !pressActiveRef.current) return;
    const origin = pressOriginRef.current;
    if (!origin || moveThresholdFiredRef.current) return;
    const dx = pageX - origin.x;
    const dy = pageY - origin.y;
    if (Math.hypot(dx, dy) >= MOVE_CLOSE_THRESHOLD_PX) {
      moveThresholdFiredRef.current = true;
      onMovePastThreshold?.(task);
    }
  }

  function handleTouchEnd() {
    pressActiveRef.current = false;
    pressOriginRef.current = null;
  }

  function clearMenuOpenedFlagSoon() {
    setTimeout(() => {
      menuOpenedThisGestureRef.current = false;
    }, 250);
  }

  const canLongPress = Boolean(onOpenContextMenu || onDrag);
  const visibleLabels = task.labels.slice(0, 2);
  const hiddenLabelCount = Math.max(0, task.labels.length - visibleLabels.length);

  return (
    <View
      ref={rowRef}
      collapsable={false}
      onTouchStart={(event) => {
        handleTouchStart(event.nativeEvent.pageX, event.nativeEvent.pageY);
      }}
      onTouchMove={(event) => {
        handleTouchMove(event.nativeEvent.pageX, event.nativeEvent.pageY);
      }}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={[
        styles.row,
        task.depth > 0 && styles.subtaskRow,
        isDragging && styles.draggingRow,
        style,
      ]}>
      <View style={styles.checkboxHit}>
        <TaskCheckbox
          checked={checked}
          onPress={() => {
            if (checked) {
              setOptimisticChecked(false);
              onToggleComplete?.(task.id, false);
              return;
            }
            setOptimisticChecked(true);
            onToggleComplete?.(task.id, true);
          }}
          accessibilityLabel={
            checked
              ? `Mark ${task.name} incomplete`
              : `Mark ${task.name} complete`
          }
        />
      </View>

      <Pressable
        style={styles.contentPressable}
        onPressIn={() => {
          menuOpenedThisGestureRef.current = false;
        }}
        onPress={() => {
          if (menuOpenedThisGestureRef.current) return;
          onPress?.(task);
        }}
        onLongPress={canLongPress ? handleLongPress : undefined}
        onPressOut={() => {
          if (menuOpenedThisGestureRef.current) {
            onContextMenuGestureEnd?.();
            clearMenuOpenedFlagSoon();
          }
        }}
        delayLongPress={CONTEXT_MENU_HOLD_MS}
        disabled={!onPress && !canLongPress}
        accessibilityRole="button"
        accessibilityLabel={
          canLongPress
            ? `Open task ${task.name}. Long press for options or drag to reorder`
            : `Open task ${task.name}`
        }>
        <View style={[styles.textBlock, !dueDateLabel && styles.textBlockCentered]}>
          <View style={styles.mainRow}>
            <ThemedText
              style={[styles.title, checked && styles.titleCompleted]}
              numberOfLines={1}>
              {task.name}
            </ThemedText>

            <View style={styles.meta}>
              {showListName && task.listName ? (
                <ThemedText style={styles.listName} numberOfLines={1}>
                  {task.listName}
                </ThemedText>
              ) : null}

              {task.priority != null ? (
                <AppSymbol
                  ios="flag.fill"
                  android="flag"
                  size={12}
                  tintColor={
                    TASK_PRIORITY_OPTIONS.find(
                      (option) => option.level === task.priority,
                    )?.color ?? "#9ca3af"
                  }
                />
              ) : null}

              {visibleLabels.map((label) => (
                <TaskLabelChip key={label.id} label={label} />
              ))}
              {hiddenLabelCount > 0 ? (
                <ThemedText style={styles.moreLabels}>+{hiddenLabelCount}</ThemedText>
              ) : null}
            </View>
          </View>

          {dueDateLabel ? (
            <View style={styles.dueDateRow}>
              <ThemedText
                style={[styles.dueDate, checked && styles.dueDateCompleted]}
                numberOfLines={1}>
                {dueDateLabel}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "stretch",
    paddingLeft: TASK_ROW_HORIZONTAL_INSET,
    paddingRight: TASK_ROW_HORIZONTAL_INSET,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d9d9d9",
    backgroundColor: "#ffffff",
  },
  draggingRow: {
    opacity: 0.97,
  },
  subtaskRow: {
    paddingLeft: TASK_ROW_HORIZONTAL_INSET + 20,
  },
  checkboxHit: {
    paddingVertical: 7,
    paddingRight: 9,
    justifyContent: "center",
  },
  contentPressable: {
    flex: 1,
    alignSelf: "stretch",
    minWidth: 0,
    paddingVertical: 6,
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  textBlockCentered: {
    justifyContent: "center",
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  title: {
    flex: 1,
    flexShrink: 1,
    minWidth: 48,
    fontSize: 16.5,
    lineHeight: 21.5,
    color: "#3f3f46",
    fontWeight: "400",
  },
  titleCompleted: {
    textDecorationLine: "line-through",
    color: "#a1a1aa",
  },
  listName: {
    fontSize: 10,
    color: "#a1a1aa",
    maxWidth: 72,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
    gap: 5,
  },
  labelChip: {
    maxWidth: 86,
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 2.5,
  },
  labelChipText: {
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "600",
    color: "#ffffff",
    flexShrink: 1,
  },
  moreLabels: {
    fontSize: 10,
    fontWeight: "500",
    color: "#a1a1aa",
  },
  dueDateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dueDate: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "500",
    flexShrink: 1,
    color: "#afafaf",
  },
  dueDateCompleted: {
    color: "#c4c4c4",
  },
});
