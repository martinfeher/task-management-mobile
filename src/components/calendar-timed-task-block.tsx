import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import {
  getCalendarTaskBackgroundColor,
  getCalendarTaskTitleColor,
} from "@/lib/calendar-colors";
import {
  CALENDAR_DEFAULT_DURATION_MINUTES,
  CALENDAR_HOUR_END,
  CALENDAR_MIN_DURATION_MINUTES,
  formatCalendarTimeRange,
  getCalendarGridHeightPx,
  getHeightForCalendarDuration,
  getTopForCalendarMinutes,
} from "@/lib/calendar-time-grid";
import type { TaskItem } from "@/types/todo";

export type TaskScheduleUpdate = {
  dueDate: string;
  dueTimeMinutes: number;
  dueDurationMinutes: number;
};

type CalendarTimedTaskBlockProps = {
  task: TaskItem;
  dateKey: string;
  columnIndex: number;
  columnWidth: number;
  dayCount: number;
  dayDateKeys: string[];
  onPress: () => void;
  onScheduleChange: (task: TaskItem, update: TaskScheduleUpdate) => void;
  onInteractionChange?: (active: boolean) => void;
};

const SPRING_CONFIG = { damping: 22, stiffness: 320, mass: 0.7 };
const WORKLET_HOUR_START = 6;
const WORKLET_HOUR_END = 23;
const WORKLET_HOUR_HEIGHT = 56;
const WORKLET_SLOT_MINUTES = 15;
const WORKLET_MIN_DURATION = 15;

function snapTopFromDrag(baseTop: number, dragOffsetY: number) {
  "worklet";
  const proposedTop = baseTop + dragOffsetY;
  const minutes = (proposedTop / WORKLET_HOUR_HEIGHT + WORKLET_HOUR_START) * 60;
  const snapped =
    Math.round(minutes / WORKLET_SLOT_MINUTES) * WORKLET_SLOT_MINUTES;
  const minMinutes = WORKLET_HOUR_START * 60;
  const maxMinutes = (WORKLET_HOUR_END + 1) * 60 - WORKLET_SLOT_MINUTES;
  const clampedMinutes = Math.max(minMinutes, Math.min(maxMinutes, snapped));
  return (clampedMinutes / 60 - WORKLET_HOUR_START) * WORKLET_HOUR_HEIGHT;
}

function minutesFromTop(snappedTop: number) {
  "worklet";
  const minutes = (snappedTop / WORKLET_HOUR_HEIGHT + WORKLET_HOUR_START) * 60;
  return Math.round(minutes / WORKLET_SLOT_MINUTES) * WORKLET_SLOT_MINUTES;
}

function snappedColumnShift(dragOffsetX: number, columnWidth: number) {
  "worklet";
  return Math.round(dragOffsetX / Math.max(columnWidth, 1));
}

function snappedResizeHeight(
  baseHeight: number,
  dragOffsetY: number,
  maxHeight: number,
) {
  "worklet";
  const minHeight = Math.max(
    28,
    (WORKLET_MIN_DURATION / 60) * WORKLET_HOUR_HEIGHT,
  );
  const proposed = Math.max(
    minHeight,
    Math.min(maxHeight, baseHeight + dragOffsetY),
  );
  const duration = Math.max(
    WORKLET_MIN_DURATION,
    Math.round(((proposed / WORKLET_HOUR_HEIGHT) * 60) / WORKLET_SLOT_MINUTES) *
      WORKLET_SLOT_MINUTES,
  );
  return Math.max(minHeight, (duration / 60) * WORKLET_HOUR_HEIGHT);
}

function durationFromHeight(snappedHeight: number) {
  "worklet";
  return Math.max(
    WORKLET_MIN_DURATION,
    Math.round(
      ((snappedHeight / WORKLET_HOUR_HEIGHT) * 60) / WORKLET_SLOT_MINUTES,
    ) * WORKLET_SLOT_MINUTES,
  );
}

export function CalendarTimedTaskBlock({
  task,
  dateKey,
  columnIndex,
  columnWidth,
  dayCount,
  dayDateKeys,
  onPress,
  onScheduleChange,
  onInteractionChange,
}: CalendarTimedTaskBlockProps) {
  const dueTimeMinutes = task.dueTimeMinutes ?? 9 * 60;
  const dueDurationMinutes =
    task.dueDurationMinutes && task.dueDurationMinutes > 0
      ? task.dueDurationMinutes
      : CALENDAR_DEFAULT_DURATION_MINUTES;

  const layout = useMemo(() => {
    const top = getTopForCalendarMinutes(dueTimeMinutes);
    const height = getHeightForCalendarDuration(dueDurationMinutes);
    const gridHeight = getCalendarGridHeightPx();
    const maxHeight = Math.max(
      getHeightForCalendarDuration(CALENDAR_MIN_DURATION_MINUTES),
      gridHeight - top,
    );
    return { top, height, maxHeight, gridHeight };
  }, [dueDurationMinutes, dueTimeMinutes]);

  const baseTop = useSharedValue(layout.top);
  const baseHeight = useSharedValue(layout.height);
  const maxHeightSv = useSharedValue(layout.maxHeight);
  const columnWidthSv = useSharedValue(columnWidth);
  const columnIndexSv = useSharedValue(columnIndex);
  const dayCountSv = useSharedValue(dayCount);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const previewHeight = useSharedValue(layout.height);
  const previewStartMinutes = useSharedValue(dueTimeMinutes);
  const previewDurationMinutes = useSharedValue(dueDurationMinutes);
  const previewColumnShift = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const isResizing = useSharedValue(false);
  const showPreview = useSharedValue(0);

  const previewLabel = useMemo(
    () => formatCalendarTimeRange(dueTimeMinutes, dueDurationMinutes),
    [dueDurationMinutes, dueTimeMinutes],
  );
  const taskBackgroundColor = useMemo(
    () => getCalendarTaskBackgroundColor(task.calendarColor),
    [task.calendarColor],
  );
  const taskTitleColor = useMemo(
    () => getCalendarTaskTitleColor(taskBackgroundColor),
    [taskBackgroundColor],
  );
  const [livePreviewLabel, setLivePreviewLabel] = useState(previewLabel);

  useEffect(() => {
    setLivePreviewLabel(previewLabel);
  }, [previewLabel]);

  useEffect(() => {
    baseTop.value = layout.top;
    baseHeight.value = layout.height;
    maxHeightSv.value = layout.maxHeight;
    previewHeight.value = layout.height;
    previewStartMinutes.value = dueTimeMinutes;
    previewDurationMinutes.value = dueDurationMinutes;
    columnWidthSv.value = columnWidth;
    columnIndexSv.value = columnIndex;
    dayCountSv.value = dayCount;
    translateX.value = 0;
    translateY.value = 0;
    previewColumnShift.value = 0;
    showPreview.value = 0;
  }, [
    baseTop,
    baseHeight,
    columnIndex,
    columnWidth,
    columnIndexSv,
    columnWidthSv,
    dayCount,
    dayCountSv,
    dueDurationMinutes,
    dueTimeMinutes,
    layout,
    maxHeightSv,
    previewColumnShift,
    previewDurationMinutes,
    previewHeight,
    previewStartMinutes,
    showPreview,
    translateX,
    translateY,
  ]);

  const updatePreviewLabel = useCallback(
    (startMinutes: number, durationMinutes: number) => {
      setLivePreviewLabel(
        formatCalendarTimeRange(startMinutes, durationMinutes),
      );
    },
    [],
  );

  const setInteractionActive = useCallback(
    (active: boolean) => {
      onInteractionChange?.(active);
    },
    [onInteractionChange],
  );

  const triggerSelectionHaptic = useCallback(() => {
    void Haptics.selectionAsync();
  }, []);

  const triggerCommitHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const commitMove = useCallback(
    (columnShift: number, startMinutes: number) => {
      const nextColumnIndex = Math.max(
        0,
        Math.min(dayCount - 1, columnIndex + columnShift),
      );
      const nextDateKey = dayDateKeys[nextColumnIndex] ?? dateKey;
      const maxDuration = (CALENDAR_HOUR_END + 1) * 60 - startMinutes;
      const nextDuration = Math.min(
        dueDurationMinutes,
        Math.max(CALENDAR_MIN_DURATION_MINUTES, maxDuration),
      );

      onScheduleChange(task, {
        dueDate: nextDateKey,
        dueTimeMinutes: startMinutes,
        dueDurationMinutes: nextDuration,
      });
    },
    [
      columnIndex,
      dateKey,
      dayCount,
      dayDateKeys,
      dueDurationMinutes,
      onScheduleChange,
      task,
    ],
  );

  const commitResize = useCallback(
    (durationMinutes: number) => {
      onScheduleChange(task, {
        dueDate: dateKey,
        dueTimeMinutes,
        dueDurationMinutes: durationMinutes,
      });
    },
    [dateKey, dueTimeMinutes, onScheduleChange, task],
  );

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  const tapGesture = Gesture.Tap()
    .maxDistance(10)
    .onEnd(() => {
      runOnJS(handlePress)();
    });

  const moveGesture = Gesture.Pan()
    .minDistance(12)
    .onBegin(() => {
      isDragging.value = true;
      showPreview.value = 1;
      runOnJS(setInteractionActive)(true);
      runOnJS(triggerSelectionHaptic)();
    })
    .onUpdate((event) => {
      if (isResizing.value) return;

      const snappedTop = snapTopFromDrag(baseTop.value, event.translationY);
      const columnShift = snappedColumnShift(
        event.translationX,
        columnWidthSv.value,
      );
      const clampedShift = Math.max(
        -columnIndexSv.value,
        Math.min(dayCountSv.value - 1 - columnIndexSv.value, columnShift),
      );
      const startMinutes = minutesFromTop(snappedTop);
      const durationMinutes = previewDurationMinutes.value;

      translateY.value = snappedTop - baseTop.value;
      translateX.value = clampedShift * columnWidthSv.value;
      previewColumnShift.value = clampedShift;
      previewStartMinutes.value = startMinutes;
      runOnJS(updatePreviewLabel)(startMinutes, durationMinutes);
    })
    .onEnd(() => {
      isDragging.value = false;
      showPreview.value = 0;
      runOnJS(setInteractionActive)(false);

      if (isResizing.value) return;

      runOnJS(triggerCommitHaptic)();
      runOnJS(commitMove)(previewColumnShift.value, previewStartMinutes.value);
      translateX.value = withSpring(0, SPRING_CONFIG);
      translateY.value = withSpring(0, SPRING_CONFIG);
      previewColumnShift.value = 0;
    })
    .onFinalize(() => {
      isDragging.value = false;
      showPreview.value = 0;
      if (!isResizing.value) {
        runOnJS(setInteractionActive)(false);
      }
    });

  const bodyGesture = Gesture.Exclusive(moveGesture, tapGesture);

  const resizeGesture = Gesture.Pan()
    .minDistance(1)
    .hitSlop({ top: 10, bottom: 10, left: 16, right: 16 })
    .onBegin(() => {
      isResizing.value = true;
      showPreview.value = 1;
      runOnJS(setInteractionActive)(true);
      runOnJS(triggerSelectionHaptic)();
    })
    .onUpdate((event) => {
      const snappedHeight = snappedResizeHeight(
        baseHeight.value,
        event.translationY,
        maxHeightSv.value,
      );
      const durationMinutes = durationFromHeight(snappedHeight);
      const startMinutes = previewStartMinutes.value;

      previewHeight.value = snappedHeight;
      previewDurationMinutes.value = durationMinutes;
      runOnJS(updatePreviewLabel)(startMinutes, durationMinutes);
    })
    .onEnd(() => {
      isResizing.value = false;
      showPreview.value = 0;
      runOnJS(setInteractionActive)(false);
      runOnJS(triggerCommitHaptic)();
      runOnJS(commitResize)(previewDurationMinutes.value);
      previewHeight.value = withSpring(baseHeight.value, SPRING_CONFIG);
    })
    .onFinalize(() => {
      isResizing.value = false;
      showPreview.value = 0;
      if (!isDragging.value) {
        runOnJS(setInteractionActive)(false);
      }
    });

  const blockStyle = useAnimatedStyle(() => {
    const active = isDragging.value || isResizing.value;
    const height = isResizing.value ? previewHeight.value : baseHeight.value;

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: active ? 1.02 : 1 },
      ],
      height,
      zIndex: active ? 30 : 1,
      opacity: active ? 0.96 : 1,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: active ? 6 : 0 },
      shadowOpacity: active ? 0.18 : 0,
      shadowRadius: active ? 10 : 0,
      elevation: active ? 8 : 0,
    };
  });

  const previewStyle = useAnimatedStyle(() => ({
    opacity: showPreview.value,
  }));

  if (layout.top < 0 || layout.top > layout.gridHeight) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.taskShell,
        {
          top: layout.top,
          height: layout.height,
        },
        blockStyle,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.timePreview, previewStyle]}
      >
        <ThemedText style={styles.timePreviewText}>
          {livePreviewLabel}
        </ThemedText>
      </Animated.View>

      <GestureDetector gesture={bodyGesture}>
        <Animated.View
          style={[styles.taskBlock, { backgroundColor: taskBackgroundColor }]}
        >
          <ThemedText
            style={[styles.taskBlockText, { color: taskTitleColor }]}
            numberOfLines={4}
          >
            {task.name}
          </ThemedText>
        </Animated.View>
      </GestureDetector>

      <GestureDetector gesture={resizeGesture}>
        <View style={styles.resizeHandle}>
          <View style={styles.resizeGrip} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  taskShell: {
    position: "absolute",
    left: 4,
    right: 4,
  },
  timePreview: {
    position: "absolute",
    top: -22,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 40,
  },
  timePreviewText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
    backgroundColor: "#ffffff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  taskBlock: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 26,
    overflow: "hidden",
  },
  taskBlockText: {
    fontSize: 12,
    lineHeight: 12 * 1.3,
    fontWeight: "600",
  },
  resizeHandle: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  resizeGrip: {
    width: 34,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
});
