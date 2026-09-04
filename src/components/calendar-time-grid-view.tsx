import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector, ScrollView } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";

import {
  CalendarTimedTaskBlock,
  type TaskScheduleUpdate,
} from "@/components/calendar-timed-task-block";
import { ThemedText } from "@/components/themed-text";
import {
  CALENDAR_HOUR_END,
  CALENDAR_HOUR_HEIGHT,
  CALENDAR_HOUR_START,
  CALENDAR_TIME_LABEL_WIDTH,
  formatCalendarHourLabel,
  getCalendarDisplayHours,
  getCalendarGridHeightPx,
  getCurrentMinutesFromMidnight,
  getTopForCalendarMinutes,
} from "@/lib/calendar-time-grid";
import { toDateKey } from "@/lib/task-dates";
import type { TaskItem } from "@/types/todo";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function DayHeader({
  day,
  selected,
  pendingCount,
  onPress,
}: {
  day: Date;
  selected: boolean;
  pendingCount: number;
  onPress: () => void;
}) {
  const isToday = isSameDay(day, new Date());
  const highlighted = selected || isToday;

  return (
    <Pressable style={styles.dayHeaderCell} onPress={onPress}>
      <ThemedText
        style={[styles.dayHeaderWeekday, highlighted && styles.dayHeaderWeekdayActive]}>
        {day.toLocaleDateString(undefined, { weekday: "short" })}
      </ThemedText>
      <View
        style={[
          styles.dayHeaderNumberWrap,
          highlighted && styles.dayHeaderNumberWrapActive,
        ]}>
        <ThemedText
          style={[styles.dayHeaderNumber, highlighted && styles.dayHeaderNumberActive]}>
          {day.getDate()}
        </ThemedText>
      </View>
      {selected && pendingCount > 0 ? (
        <View style={styles.pendingBadge}>
          <ThemedText style={styles.pendingBadgeText}>
            {pendingCount} pending task{pendingCount === 1 ? "" : "s"}
          </ThemedText>
        </View>
      ) : (
        <View style={styles.pendingBadgeSpacer} />
      )}
    </Pressable>
  );
}

type CalendarTimeGridViewProps = {
  days: Date[];
  tasksByDate: Map<string, TaskItem[]>;
  selectedDate: Date;
  loading: boolean;
  refreshing: boolean;
  onSelectDate: (date: Date) => void;
  onPressTask: (task: TaskItem) => void;
  onScheduleChange: (task: TaskItem, update: TaskScheduleUpdate) => void;
  onShiftDay?: (delta: number) => void;
  onRefresh: () => void;
};

export function CalendarTimeGridView({
  days,
  tasksByDate,
  selectedDate,
  loading,
  refreshing,
  onSelectDate,
  onPressTask,
  onScheduleChange,
  onShiftDay,
  onRefresh,
}: CalendarTimeGridViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const interactionCountRef = useRef(0);
  const taskInteractionActive = useSharedValue(0);
  const { width: windowWidth } = useWindowDimensions();
  const hours = useMemo(() => getCalendarDisplayHours(), []);
  const gridHeight = getCalendarGridHeightPx();
  const dayDateKeys = useMemo(() => days.map((day) => toDateKey(day)), [days]);
  const columnWidth = Math.max(
    72,
    (windowWidth - CALENDAR_TIME_LABEL_WIDTH) / Math.max(days.length, 1),
  );
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    return now;
  }, []);
  const nowMinutes = getCurrentMinutesFromMidnight();
  const nowTop = getTopForCalendarMinutes(nowMinutes);
  const showNowLine =
    nowMinutes >= CALENDAR_HOUR_START * 60 && nowMinutes <= (CALENDAR_HOUR_END + 1) * 60;

  const handleInteractionChange = (active: boolean) => {
    interactionCountRef.current = Math.max(
      0,
      interactionCountRef.current + (active ? 1 : -1),
    );
    taskInteractionActive.value = interactionCountRef.current;
    setScrollEnabled(interactionCountRef.current === 0);
  };

  const shiftDay = useCallback(
    (delta: number) => {
      onShiftDay?.(delta);
    },
    [onShiftDay],
  );

  const swipeGesture = useMemo(() => {
    if (!onShiftDay) {
      return Gesture.Pan().enabled(false);
    }

    return Gesture.Pan()
      .activeOffsetX([-24, 24])
      .failOffsetY([-16, 16])
      .onEnd((event) => {
        if (taskInteractionActive.value > 0) {
          return;
        }

        const swipedNext =
          event.translationX <= -56 || event.velocityX <= -650;
        const swipedPrevious =
          event.translationX >= 56 || event.velocityX >= 650;

        if (swipedNext) {
          runOnJS(shiftDay)(1);
        } else if (swipedPrevious) {
          runOnJS(shiftDay)(-1);
        }
      });
  }, [onShiftDay, shiftDay, taskInteractionActive]);

  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, nowTop - CALENDAR_HOUR_HEIGHT * 2),
        animated: false,
      });
    }, 0);
    return () => clearTimeout(timeout);
  }, [days, loading, nowTop]);

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
        <View style={styles.timeHeaderSpacer} />
        {days.map((day) => {
          const key = toDateKey(day);
          const pendingCount = (tasksByDate.get(key) ?? []).length;
          return (
            <DayHeader
              key={key}
              day={day}
              selected={isSameDay(day, selectedDate)}
              pendingCount={pendingCount}
              onPress={() => onSelectDate(day)}
            />
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color="#3c87f7" style={styles.loader} />
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          scrollEnabled={scrollEnabled}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          <View style={styles.gridRow}>
            <View style={[styles.timeColumn, { height: gridHeight }]}>
              {hours.map((hour) => (
                <View key={hour} style={styles.timeCell}>
                  <ThemedText style={styles.timeLabel}>
                    {formatCalendarHourLabel(hour)}
                  </ThemedText>
                </View>
              ))}
            </View>

            {days.map((day, columnIndex) => {
              const dateKey = toDateKey(day);
              const dayTasks = tasksByDate.get(dateKey) ?? [];
              const isToday = isSameDay(day, today);

              return (
                <View
                  key={dateKey}
                  style={[styles.dayColumn, { height: gridHeight, width: columnWidth }]}>
                  {hours.map((hour, index) => (
                    <View
                      key={hour}
                      style={[styles.hourCell, index === 0 && styles.hourCellFirst]}
                    />
                  ))}

                  {isToday && showNowLine ? (
                    <View pointerEvents="none" style={[styles.nowLine, { top: nowTop }]}>
                      <View style={styles.nowDot} />
                      <View style={styles.nowBar} />
                    </View>
                  ) : null}

                  {dayTasks.map((task) => (
                    <CalendarTimedTaskBlock
                      key={`${task.id}-${dateKey}`}
                      task={task}
                      dateKey={dateKey}
                      columnIndex={columnIndex}
                      columnWidth={columnWidth}
                      dayCount={days.length}
                      dayDateKeys={dayDateKeys}
                      onPress={() => onPressTask(task)}
                      onScheduleChange={onScheduleChange}
                      onInteractionChange={handleInteractionChange}
                    />
                  ))}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  timeHeaderSpacer: {
    width: CALENDAR_TIME_LABEL_WIDTH,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 10,
    minWidth: 0,
  },
  dayHeaderWeekday: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  dayHeaderWeekdayActive: {
    color: "#2563eb",
    fontWeight: "600",
  },
  dayHeaderNumberWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  dayHeaderNumberWrapActive: {
    backgroundColor: "#2563eb",
  },
  dayHeaderNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  dayHeaderNumberActive: {
    color: "#ffffff",
  },
  pendingBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#e8f2fc",
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2563eb",
  },
  pendingBadgeSpacer: {
    height: 24,
  },
  scroll: {
    flex: 1,
  },
  gridRow: {
    flexDirection: "row",
  },
  timeColumn: {
    width: CALENDAR_TIME_LABEL_WIDTH,
  },
  timeCell: {
    height: CALENDAR_HOUR_HEIGHT,
    justifyContent: "flex-start",
    paddingTop: 6,
    paddingRight: 6,
  },
  timeLabel: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "right",
  },
  dayColumn: {
    position: "relative",
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "#e5e7eb",
    flexShrink: 0,
  },
  hourCell: {
    height: CALENDAR_HOUR_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eceff3",
  },
  hourCellFirst: {
    borderTopColor: "#e5e7eb",
  },
  nowLine: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#111827",
    marginLeft: -4,
  },
  nowBar: {
    flex: 1,
    height: 2,
    backgroundColor: "#111827",
  },
  loader: {
    marginTop: 24,
  },
});
