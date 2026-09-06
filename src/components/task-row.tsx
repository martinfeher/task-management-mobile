import { AppSymbol } from "@/components/app-symbol";
import { TaskCheckbox } from "@/components/task-checkbox";
import type { TaskContextMenuAnchor } from "@/components/task-context-menu";
import { TASK_PRIORITY_OPTIONS } from "@/components/task-context-menu";
import { ThemedText } from "@/components/themed-text";
import { formatTaskDueDateParts } from "@/lib/format-due-date";
import { getLabelDotColor } from "@/lib/label-colors";
import type { TaskItem, TaskLabel } from "@/types/todo";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const CONTEXT_MENU_HOLD_MS = 250;
export const TASK_ROW_DEFAULT_LONG_PRESS_MS = CONTEXT_MENU_HOLD_MS;
const MOVE_CLOSE_THRESHOLD_PX = 15;
const HOLD_SHADOW_BORDER_RADIUS = 10;
const HOLD_SHADOW_MIN_RADIUS = 20;
const HOLD_SHADOW_MAX_RADIUS = 40;
const HOLD_SHADOW_MAX_OPACITY = 0.3;
const HOLD_SHADOW_COLOR = "#4b5669";
const HOLD_SHADOW_MAX_ELEVATION = 10;
const IS_IOS = Platform.OS === "ios";

const AnimatedView = Animated.createAnimatedComponent(View);

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
  /** Delay before drag/reorder activates. */
  longPressDelayMs?: number;
  /** Delay before the context menu opens; should be longer than `longPressDelayMs`. */
  contextMenuDelayMs?: number;
  /** Grow a lift shadow while the finger is held before long-press completes. */
  enableHoldShadow?: boolean;
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
  longPressDelayMs = TASK_ROW_DEFAULT_LONG_PRESS_MS,
  contextMenuDelayMs,
  enableHoldShadow = false,
}: TaskRowProps) {
  const dueDateParts = formatTaskDueDateParts(
    task.dueDate,
    task.dueTimeMinutes,
  );
  const hasDueDate = dueDateParts != null;
  const [optimisticChecked, setOptimisticChecked] = useState(false);
  const checked = task.completed || optimisticChecked;
  const rowRef = useRef<View>(null);
  const menuOpenedThisGestureRef = useRef(false);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const moveThresholdFiredRef = useRef(false);
  const pressActiveRef = useRef(false);
  const holdProgress = useSharedValue(0);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const dragActivatedRef = useRef(false);
  const canLongPress = Boolean(onOpenContextMenu || onDrag);
  const usesSplitHoldTiming =
    contextMenuDelayMs != null && contextMenuDelayMs > longPressDelayMs;
  const holdShadowDurationMs = usesSplitHoldTiming
    ? contextMenuDelayMs
    : longPressDelayMs;

  useEffect(() => {
    setOptimisticChecked(false);
  }, [task.id, task.completed]);

  const holdShadowStyle = useAnimatedStyle(() => {
    const progress = holdProgress.value;
    if (progress <= 0) {
      return {};
    }

    const surfaceStyle = {
      borderRadius: HOLD_SHADOW_BORDER_RADIUS * progress,
      marginHorizontal: progress * 5,
      marginVertical: progress * 2,
      zIndex: Math.round(progress * 20),
    };

    if (IS_IOS) {
      return {
        ...surfaceStyle,
        shadowColor: HOLD_SHADOW_COLOR,
        shadowOpacity:
          HOLD_SHADOW_MAX_OPACITY * 0.35 +
          progress * (HOLD_SHADOW_MAX_OPACITY * 0.65),
        shadowRadius:
          HOLD_SHADOW_MIN_RADIUS +
          progress * (HOLD_SHADOW_MAX_RADIUS - HOLD_SHADOW_MIN_RADIUS),
        shadowOffset: { width: 0, height: 0 },
      };
    }

    return {
      ...surfaceStyle,
      elevation: 1 + progress * HOLD_SHADOW_MAX_ELEVATION,
    };
  });

  function startHoldShadow() {
    if (!enableHoldShadow || !canLongPress) return;
    cancelAnimation(holdProgress);
    holdProgress.value = 0;
    holdProgress.value = withTiming(1, {
      duration: holdShadowDurationMs,
      easing: Easing.linear,
    });
  }

  function clearHoldTimers() {
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
    if (contextMenuTimerRef.current) {
      clearTimeout(contextMenuTimerRef.current);
      contextMenuTimerRef.current = null;
    }
  }

  function triggerContextMenu() {
    resetHoldShadow();
    menuOpenedThisGestureRef.current = true;
    if (onOpenContextMenu) {
      rowRef.current?.measureInWindow((x, y, width, height) => {
        onOpenContextMenu(task, { x, y, width, height });
      });
    }
  }

  function triggerDrag() {
    if (!onDrag || dragActivatedRef.current) return;
    dragActivatedRef.current = true;
    onDrag();
  }

  function scheduleSplitHoldActions() {
    clearHoldTimers();
    dragActivatedRef.current = false;

    if (onDrag) {
      dragTimerRef.current = setTimeout(() => {
        dragTimerRef.current = null;
        if (!pressActiveRef.current || menuOpenedThisGestureRef.current) return;
        triggerDrag();
      }, longPressDelayMs);
    }

    if (onOpenContextMenu) {
      const menuDelay = usesSplitHoldTiming
        ? contextMenuDelayMs
        : longPressDelayMs;
      contextMenuTimerRef.current = setTimeout(() => {
        contextMenuTimerRef.current = null;
        if (!pressActiveRef.current || menuOpenedThisGestureRef.current) return;
        triggerContextMenu();
      }, menuDelay);
    }
  }

  function resetHoldShadow() {
    if (!enableHoldShadow) return;
    cancelAnimation(holdProgress);
    holdProgress.value = withTiming(0, { duration: 120 });
  }

  function handleLongPress() {
    if (usesSplitHoldTiming) return;
    resetHoldShadow();
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
    menuOpenedThisGestureRef.current = false;
    if (usesSplitHoldTiming) {
      scheduleSplitHoldActions();
    }
    startHoldShadow();
  }

  function handleTouchMove(pageX: number, pageY: number) {
    const origin = pressOriginRef.current;
    if (
      pressActiveRef.current &&
      !menuOpenedThisGestureRef.current &&
      origin &&
      Math.hypot(pageX - origin.x, pageY - origin.y) >= 8
    ) {
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
        dragTimerRef.current = null;
      }
      if (contextMenuTimerRef.current) {
        clearTimeout(contextMenuTimerRef.current);
        contextMenuTimerRef.current = null;
      }
      resetHoldShadow();
    }

    if (!menuOpenedThisGestureRef.current || !pressActiveRef.current) return;
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
    clearHoldTimers();
    resetHoldShadow();
  }

  function clearMenuOpenedFlagSoon() {
    setTimeout(() => {
      menuOpenedThisGestureRef.current = false;
    }, 250);
  }

  const visibleLabels = task.labels.slice(0, 2);
  const hiddenLabelCount = Math.max(
    0,
    task.labels.length - visibleLabels.length,
  );

  const rowContents = (
    <>
      <View
        style={[styles.checkboxHit, !hasDueDate && styles.checkboxHitNoDueDate]}
      >
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
        style={[
          styles.contentPressable,
          !hasDueDate && styles.contentPressableNoDueDate,
        ]}
        onPressIn={() => {
          menuOpenedThisGestureRef.current = false;
        }}
        onPress={() => {
          if (menuOpenedThisGestureRef.current) return;
          onPress?.(task);
        }}
        onLongPress={
          canLongPress && !usesSplitHoldTiming ? handleLongPress : undefined
        }
        onPressOut={() => {
          clearHoldTimers();
          resetHoldShadow();
          if (menuOpenedThisGestureRef.current) {
            onContextMenuGestureEnd?.();
            clearMenuOpenedFlagSoon();
          }
        }}
        delayLongPress={
          canLongPress && !usesSplitHoldTiming ? longPressDelayMs : undefined
        }
        disabled={!onPress && !canLongPress}
        accessibilityRole="button"
        accessibilityLabel={
          canLongPress
            ? `Open task ${task.name}. Long press for options or drag to reorder`
            : `Open task ${task.name}`
        }
      >
        <View
          style={[styles.textBlock, !hasDueDate && styles.textBlockNoDueDate]}
        >
          <View style={styles.mainRow}>
            <ThemedText
              style={[
                styles.title,
                !hasDueDate && styles.titleNoDueDate,
                checked && styles.titleCompleted,
              ]}
              numberOfLines={1}
            >
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
                <ThemedText style={styles.moreLabels}>
                  +{hiddenLabelCount}
                </ThemedText>
              ) : null}
            </View>
          </View>

          {dueDateParts ? (
            <View style={styles.dueDateRow}>
              <ThemedText
                style={[styles.dueDate, checked && styles.dueDateCompleted]}
                numberOfLines={1}
              >
                {dueDateParts.dateLabel}
                {dueDateParts.timeLabel ? ", " : ""}
              </ThemedText>
              {dueDateParts.timeLabel ? (
                <ThemedText
                  style={[
                    styles.dueDate,
                    styles.dueTime,
                    checked && styles.dueDateCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {dueDateParts.timeLabel}
                </ThemedText>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>
      {!isDragging ? (
        <View pointerEvents="none" style={styles.separator} />
      ) : null}
    </>
  );

  return (
    <AnimatedView
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
      style={
        enableHoldShadow
          ? [styles.rowHost, styles.rowHoldShadowHost]
          : undefined
      }
    >
      <AnimatedView
        style={[
          styles.row,
          !hasDueDate && styles.rowNoDueDate,
          task.depth > 0 && styles.subtaskRow,
          isDragging && styles.draggingRow,
          enableHoldShadow && !isDragging && holdShadowStyle,
          style,
        ]}
      >
        {rowContents}
      </AnimatedView>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  rowHost: {
    overflow: "visible",
  },
  row: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "stretch",
    paddingLeft: TASK_ROW_HORIZONTAL_INSET,
    paddingRight: TASK_ROW_HORIZONTAL_INSET,
    backgroundColor: "#ffffff",
    position: "relative",
  },
  rowHoldShadowHost: {
    overflow: "visible",
  },
  separator: {
    position: "absolute",
    left: "10%",
    bottom: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#d9d9d9",
  },
  draggingRow: {
    opacity: 0.92,
    borderRadius: 15,
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
  rowNoDueDate: {
    alignItems: "center",
  },
  checkboxHitNoDueDate: {
    paddingVertical: 0,
  },
  contentPressableNoDueDate: {
    paddingVertical: 0,
  },
  textBlockNoDueDate: {
    flex: 0,
    justifyContent: "center",
  },
  titleNoDueDate: {
    marginTop: 0,
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
    fontSize: 19,
    lineHeight: 22.5,
    marginTop: 2,
    color: "#545454",
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
    alignItems: "flex-start",
    marginTop: 1.5,
  },
  dueDate: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "500",
    flexShrink: 1,
    color: "#bfbfbf",
  },
  dueTime: {
    marginTop: 0.5,
  },
  dueDateCompleted: {
    color: "#c4c4c4",
  },
});
