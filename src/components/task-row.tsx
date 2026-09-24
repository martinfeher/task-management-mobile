import { AppSymbol } from "@/components/app-symbol";
import { MdKeyboardArrowDownIcon } from "@/components/md-keyboard-arrow-down-icon";
import { RiArrowDropRightLineIcon } from "@/components/ri-arrow-drop-right-line-icon";
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
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";

const CONTEXT_MENU_HOLD_MS = 250;
export const TASK_ROW_DEFAULT_LONG_PRESS_MS = CONTEXT_MENU_HOLD_MS / 1.5;
const MOVE_CLOSE_THRESHOLD_PX = 15;
/** Vertical finger movement that interrupts the context menu and starts drag. */
const DRAG_VERTICAL_ACTIVATION_PX = 1;
const HOLD_SHADOW_BORDER_RADIUS = 20;
const HOLD_SHADOW_MIN_RADIUS = 4;
const HOLD_SHADOW_MAX_RADIUS = 8;
const HOLD_SHADOW_MAX_OPACITY = 0.22;
const HOLD_SHADOW_COLOR = "#4b5669";
const HOLD_SHADOW_MAX_ELEVATION = 4;
const DRAG_TRANSLATE_X = 14;
const DRAG_BORDER_COLOR = "#f3f3f3";
const DRAG_LIFT_SPRING = {
  damping: 22,
  stiffness: 260,
  mass: 0.7,
} as const;
const IS_IOS = Platform.OS === "ios";

const NO_SURFACE_SHADOW = Platform.select({
  ios: {
    shadowColor: "#000000",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  default: {
    elevation: 0,
  },
})!;

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
  subtaskCount?: number;
  subtasksExpanded?: boolean;
  onToggleSubtasksExpanded?: () => void;
  showSubtaskCollapseToggle?: boolean;
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
  subtaskCount = 0,
  subtasksExpanded = false,
  onToggleSubtasksExpanded,
  showSubtaskCollapseToggle = false,
}: TaskRowProps) {
  const dueDateParts = formatTaskDueDateParts(
    task.dueDate,
    task.dueTimeMinutes,
  );
  const hasDueDate = dueDateParts != null;
  const showSubtaskCollapse =
    showSubtaskCollapseToggle &&
    task.depth === 0 &&
    subtaskCount > 0 &&
    Boolean(onToggleSubtasksExpanded);
  const showSublineRow = showSubtaskCollapse || hasDueDate;
  const useCompactRowLayout = !hasDueDate && !showSubtaskCollapse;
  const [optimisticChecked, setOptimisticChecked] = useState(false);
  const checked = task.completed || optimisticChecked;
  const rowRef = useRef<View>(null);
  const menuOpenedThisGestureRef = useRef(false);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const moveThresholdFiredRef = useRef(false);
  const pressActiveRef = useRef(false);
  const holdProgress = useSharedValue(0);
  const dragLiftProgress = useSharedValue(0);
  const isDraggingSv = useSharedValue(isDragging);
  const pressDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const dragActivatedRef = useRef(false);
  const dragArmedRef = useRef(false);
  const dragIntentRef = useRef(false);
  const blockPressRef = useRef(false);
  const pressInAtRef = useRef(0);
  const pressStartedAtRef = useRef(0);
  const canLongPress = Boolean(onOpenContextMenu || onDrag);
  const usesSplitHoldTiming =
    contextMenuDelayMs != null && contextMenuDelayMs > longPressDelayMs;
  const holdShadowDurationMs = usesSplitHoldTiming
    ? contextMenuDelayMs
    : longPressDelayMs;

  useEffect(() => {
    setOptimisticChecked(false);
  }, [task.id, task.completed]);

  function clearHoldShadowImmediate() {
    if (!enableHoldShadow) return;
    cancelAnimation(holdProgress);
    holdProgress.value = 0;
  }

  function resetHoldShadow() {
    if (!enableHoldShadow) return;
    cancelAnimation(holdProgress);
    holdProgress.value = withTiming(0, { duration: 120 });
  }

  useEffect(() => {
    isDraggingSv.value = isDragging;
    if (!isDragging) {
      dragActivatedRef.current = false;
      dragLiftProgress.value = withTiming(0, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    if (contextMenuTimerRef.current) {
      clearTimeout(contextMenuTimerRef.current);
      contextMenuTimerRef.current = null;
    }

    dragLiftProgress.value = withSpring(1, DRAG_LIFT_SPRING);
  }, [dragLiftProgress, isDragging, isDraggingSv]);

  useAnimatedReaction(
    () => isDraggingSv.value,
    (current, previous) => {
      if (current && !previous) {
        holdProgress.value = withTiming(0, {
          duration: 160,
          easing: Easing.out(Easing.cubic),
        });
      }
    },
  );

  const holdShadowStyle = useAnimatedStyle(() => {
    const lift = dragLiftProgress.value;
    const progress = holdProgress.value * (1 - lift);
    if (progress <= 0) {
      return NO_SURFACE_SHADOW;
    }

    const surfaceStyle = {
      borderRadius: HOLD_SHADOW_BORDER_RADIUS * progress,
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

  const dragSurfaceStyle = useAnimatedStyle(() => {
    const lift = dragLiftProgress.value;
    if (lift <= 0) {
      return {
        transform: [{ translateX: 0 }],
        borderRadius: 0,
        borderWidth: 0,
        backgroundColor: "#ffffff",
        ...NO_SURFACE_SHADOW,
      };
    }

    return {
      transform: [{ translateX: lift * DRAG_TRANSLATE_X }],
      borderRadius: lift * 15,
      borderWidth: lift,
      borderColor: DRAG_BORDER_COLOR,
      backgroundColor: "#ffffff",
      ...NO_SURFACE_SHADOW,
    };
  });

  function startHoldShadow() {
    if (!enableHoldShadow || !canLongPress || isDragging) return;
    cancelAnimation(holdProgress);
    holdProgress.value = 0;
    holdProgress.value = withTiming(1, {
      duration: holdShadowDurationMs,
      easing: Easing.out(Easing.cubic),
    });
  }

  function clearHoldTimers() {
    if (pressDelayTimerRef.current) {
      clearTimeout(pressDelayTimerRef.current);
      pressDelayTimerRef.current = null;
    }
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
    if (contextMenuTimerRef.current) {
      clearTimeout(contextMenuTimerRef.current);
      contextMenuTimerRef.current = null;
    }
  }

  function cancelContextMenuTimer() {
    if (contextMenuTimerRef.current) {
      clearTimeout(contextMenuTimerRef.current);
      contextMenuTimerRef.current = null;
    }
  }

  function hasVerticalDragIntent(pageY: number) {
    const origin = pressOriginRef.current;
    if (!origin) return false;
    return Math.abs(pageY - origin.y) >= DRAG_VERTICAL_ACTIVATION_PX;
  }

  function hasDragIntentMovement() {
    return dragIntentRef.current;
  }

  function markDragIntent() {
    dragIntentRef.current = true;
    cancelContextMenuTimer();
  }

  function hasMetDragHoldDelay() {
    return Date.now() - pressStartedAtRef.current >= longPressDelayMs;
  }

  function tryStartDragFromVerticalMove(pageY: number) {
    if (
      !usesSplitHoldTiming ||
      !hasVerticalDragIntent(pageY) ||
      menuOpenedThisGestureRef.current ||
      dragActivatedRef.current
    ) {
      return;
    }

    markDragIntent();

    if (dragArmedRef.current || hasMetDragHoldDelay()) {
      dragArmedRef.current = true;
      triggerDrag();
    }
  }

  function triggerContextMenu() {
    if (dragActivatedRef.current || isDragging || hasDragIntentMovement()) {
      return;
    }

    dragArmedRef.current = false;
    resetHoldShadow();
    menuOpenedThisGestureRef.current = true;
    blockPressRef.current = true;
    if (onOpenContextMenu) {
      rowRef.current?.measureInWindow((x, y, width, height) => {
        if (dragActivatedRef.current || isDragging || hasDragIntentMovement()) {
          menuOpenedThisGestureRef.current = false;
          return;
        }
        onOpenContextMenu(task, { x, y, width, height });
      });
    }
  }

  function triggerDrag() {
    if (!onDrag || dragActivatedRef.current) return;
    dragActivatedRef.current = true;
    blockPressRef.current = true;
    clearHoldShadowImmediate();
    clearHoldTimers();
    onDrag();
  }

  function scheduleSplitHoldActions() {
    clearHoldTimers();
    dragActivatedRef.current = false;
    dragArmedRef.current = false;

    if (onDrag) {
      dragArmedRef.current = true;
      cancelContextMenuTimer();
      triggerDrag();
    }

    if (onOpenContextMenu) {
      const menuDelay = usesSplitHoldTiming
        ? Math.max(0, contextMenuDelayMs - longPressDelayMs)
        : longPressDelayMs;
      contextMenuTimerRef.current = setTimeout(() => {
        contextMenuTimerRef.current = null;
        if (
          !pressActiveRef.current ||
          menuOpenedThisGestureRef.current ||
          dragActivatedRef.current ||
          isDragging ||
          hasDragIntentMovement()
        ) {
          return;
        }
        triggerContextMenu();
      }, menuDelay);
    }
  }

  function handleLongPress() {
    if (usesSplitHoldTiming) return;
    clearHoldShadowImmediate();
    menuOpenedThisGestureRef.current = true;
    blockPressRef.current = true;
    if (onOpenContextMenu) {
      rowRef.current?.measureInWindow((x, y, width, height) => {
        onOpenContextMenu(task, { x, y, width, height });
      });
    }
    onDrag?.();
  }

  function handleTouchStart(pageX: number, pageY: number) {
    pressActiveRef.current = true;
    pressStartedAtRef.current = Date.now();
    pressOriginRef.current = { x: pageX, y: pageY };
    lastTouchRef.current = { x: pageX, y: pageY };
    moveThresholdFiredRef.current = false;
    menuOpenedThisGestureRef.current = false;
    dragArmedRef.current = false;
    dragIntentRef.current = false;
    if (usesSplitHoldTiming) {
      scheduleSplitHoldActions();
    }
    startHoldShadow();
  }

  function handleTouchMove(pageX: number, pageY: number) {
    const origin = pressOriginRef.current;
    if (!pressActiveRef.current || !origin) return;

    lastTouchRef.current = { x: pageX, y: pageY };

    if (usesSplitHoldTiming) {
      // Let the task list scroll freely until the drag hold delay completes.
      if (!hasMetDragHoldDelay()) {
        return;
      }

      if (hasVerticalDragIntent(pageY)) {
        tryStartDragFromVerticalMove(pageY);

        if (
          menuOpenedThisGestureRef.current &&
          !moveThresholdFiredRef.current
        ) {
          moveThresholdFiredRef.current = true;
          menuOpenedThisGestureRef.current = false;
          onMovePastThreshold?.(task);
        }
      }
    }

    if (!menuOpenedThisGestureRef.current || !pressActiveRef.current) return;
    if (moveThresholdFiredRef.current) return;
    if (
      Math.hypot(pageX - origin.x, pageY - origin.y) >= MOVE_CLOSE_THRESHOLD_PX
    ) {
      moveThresholdFiredRef.current = true;
      onMovePastThreshold?.(task);
    }
  }

  function handleTouchEnd() {
    const menuWasOpen = menuOpenedThisGestureRef.current;
    pressActiveRef.current = false;
    pressOriginRef.current = null;
    lastTouchRef.current = null;
    dragActivatedRef.current = false;
    dragArmedRef.current = false;
    dragIntentRef.current = false;
    clearHoldTimers();
    resetHoldShadow();
    if (menuWasOpen) {
      onContextMenuGestureEnd?.();
      clearMenuOpenedFlagSoon();
    }
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
  const subtaskIconColor = subtasksExpanded ? "#aeaeb4" : "#cbccd8";

  const rowContents = (
    <>
      <View
        style={[
          styles.checkboxHit,
          useCompactRowLayout && styles.checkboxHitNoDueDate,
        ]}
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

      <View
        style={[
          styles.contentColumn,
          task.depth > 0 && styles.subtaskContentPressable,
          useCompactRowLayout && styles.contentPressableNoDueDate,
        ]}
      >
        <Pressable
          style={[
            styles.contentPressable,
            useCompactRowLayout && styles.contentPressableNoDueDate,
          ]}
          onPressIn={(event) => {
            menuOpenedThisGestureRef.current = false;
            blockPressRef.current = false;
            pressInAtRef.current = Date.now();
            if (!usesSplitHoldTiming) return;

            const { pageX, pageY } = event.nativeEvent;
            clearHoldTimers();
            pressDelayTimerRef.current = setTimeout(() => {
              pressDelayTimerRef.current = null;
              handleTouchStart(pageX, pageY);
            }, longPressDelayMs);
          }}
          onPress={() => {
            if (menuOpenedThisGestureRef.current) return;
            if (blockPressRef.current) {
              blockPressRef.current = false;
              return;
            }
            if (
              usesSplitHoldTiming &&
              onDrag &&
              Date.now() - pressInAtRef.current >= longPressDelayMs
            ) {
              return;
            }
            onPress?.(task);
          }}
          onLongPress={
            canLongPress && !usesSplitHoldTiming ? handleLongPress : undefined
          }
          onPressOut={() => {
            if (usesSplitHoldTiming) {
              handleTouchEnd();
              return;
            }
            clearHoldTimers();
            dragActivatedRef.current = false;
            dragIntentRef.current = false;
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
            style={[
              styles.textBlock,
              useCompactRowLayout && styles.textBlockNoDueDate,
            ]}
          >
            <View style={styles.mainRow}>
              <ThemedText
                style={[
                  styles.title,
                  task.depth > 0 && styles.subtaskTitle,
                  useCompactRowLayout && styles.titleNoDueDate,
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
          </View>
        </Pressable>

        {showSublineRow ? (
          <View style={styles.sublineRow}>
            {showSubtaskCollapse ? (
              <View style={styles.subtaskCollapseGroup}>
                <Pressable
                  style={styles.subtaskCollapseButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    subtasksExpanded ? "Collapse subtasks" : "Show subtasks"
                  }
                  accessibilityState={{ expanded: subtasksExpanded }}
                  onPress={() => onToggleSubtasksExpanded?.()}
                >
                  {subtasksExpanded ? (
                    <MdKeyboardArrowDownIcon size={15} color="#a4a5a8" />
                  ) : (
                    <RiArrowDropRightLineIcon size={21} color="#babbbd" />
                  )}
                </Pressable>
                <Pressable
                  style={[
                    styles.subtaskBranchButton,
                    styles.subtaskBranchIconOffset,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    subtasksExpanded ? "Collapse subtasks" : "Show subtasks"
                  }
                  accessibilityState={{ expanded: subtasksExpanded }}
                  onPress={() => onToggleSubtasksExpanded?.()}
                >
                  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                    <Rect
                      x="16"
                      y="9"
                      width="4"
                      height="4"
                      rx="2"
                      transform="rotate(90 16 9)"
                      stroke={subtaskIconColor}
                    />
                    <Rect
                      x="20"
                      y="17"
                      width="4"
                      height="4"
                      rx="2"
                      transform="rotate(90 20 17)"
                      stroke={subtaskIconColor}
                    />
                    <Path
                      d="M5 4V15C5 16.8856 5 17.8284 5.58579 18.4142C6.17157 19 7.11438 19 9 19H16"
                      stroke={subtaskIconColor}
                    />
                    <Path
                      d="M5 7V7C5 8.88562 5 9.82843 5.58579 10.4142C6.17157 11 7.11438 11 9 11H12"
                      stroke={subtaskIconColor}
                    />
                  </Svg>
                </Pressable>
              </View>
            ) : null}

            {dueDateParts ? (
              <View
                style={[
                  styles.dueDateRow,
                  showSubtaskCollapse && styles.dueDateRowWithSubtasks,
                ]}
              >
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
        ) : null}
      </View>
      {!isDragging ? (
        <View pointerEvents="none" style={styles.separator} />
      ) : null}
    </>
  );

  return (
    <AnimatedView
      ref={rowRef}
      collapsable={false}
      style={
        enableHoldShadow
          ? [styles.rowHost, styles.rowHoldShadowHost]
          : undefined
      }
    >
      <AnimatedView
        style={[
          styles.row,
          useCompactRowLayout && styles.rowNoDueDate,
          task.depth > 0 && styles.subtaskRow,
          NO_SURFACE_SHADOW,
          dragSurfaceStyle,
          enableHoldShadow && holdShadowStyle,
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
  subtaskRow: {
    paddingLeft: 44,
    minHeight: 46,
  },
  subtaskContentPressable: {
    paddingVertical: 4,
  },
  sublineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
    maxWidth: "100%",
  },
  subtaskCollapseGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  subtaskCollapseButton: {
    width: 21,
    height: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  subtaskBranchButton: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -9,
    marginRight: 2,
  },
  subtaskBranchIconOffset: {
    marginLeft: -3,
  },
  checkboxHit: {
    paddingVertical: 7,
    paddingRight: 9,
    justifyContent: "center",
  },
  contentColumn: {
    flex: 1,
    alignSelf: "stretch",
    minWidth: 0,
    paddingVertical: 6,
    justifyContent: "center",
  },
  contentPressable: {
    alignSelf: "stretch",
    minWidth: 0,
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
  subtaskTitle: {
    fontSize: 17,
    lineHeight: 20.5,
    color: "#7c7d8f",
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
  dueDateRowWithSubtasks: {
    marginLeft: 6,
  },
  dueDate: {
    fontSize: 10.5,
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
