import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  ScrollView,
} from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";

import { CalendarAllDayTaskRow } from "@/components/calendar-all-day-task-row";
import {
  CalendarTimedTaskBlock,
  type TaskScheduleUpdate,
} from "@/components/calendar-timed-task-block";
import { ThemedText } from "@/components/themed-text";
import {
  getCalendarAllDayRowHeight,
  splitCalendarDayTasks,
} from "@/lib/calendar-all-day";
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
import {
  recallCalendarGridScroll,
  rememberCalendarGridScroll,
  resolveCalendarGridScrollTarget,
} from "@/lib/calendar-grid-scroll";
import { toDateKey } from "@/lib/task-dates";
import type { TaskItem } from "@/types/todo";

const PENDING_BADGE_FONT_SIZE = 10;
const WEEK_PENDING_BADGE_FONT_SIZE = PENDING_BADGE_FONT_SIZE - 4;

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
  columnWidth,
  isWeekView,
  onPress,
}: {
  day: Date;
  selected: boolean;
  pendingCount: number;
  columnWidth: number;
  isWeekView: boolean;
  onPress: () => void;
}) {
  const isToday = isSameDay(day, new Date());
  const highlighted = selected || isToday;

  return (
    <Pressable
      style={[styles.dayHeaderCell, { width: columnWidth }]}
      onPress={onPress}
    >
      <ThemedText
        style={[
          styles.dayHeaderWeekday,
          highlighted && styles.dayHeaderWeekdayActive,
        ]}
      >
        {day.toLocaleDateString(undefined, { weekday: "short" })}
      </ThemedText>
      <View
        style={[
          styles.dayHeaderNumberWrap,
          highlighted && styles.dayHeaderNumberWrapActive,
        ]}
      >
        <ThemedText
          style={[
            styles.dayHeaderNumber,
            highlighted && styles.dayHeaderNumberActive,
          ]}
        >
          {day.getDate()}
        </ThemedText>
      </View>
      {selected && pendingCount > 0 ? (
        <View style={styles.pendingBadge}>
          <ThemedText
            style={[
              styles.pendingBadgeText,
              {
                lineHeight: 9,
                fontSize: isWeekView
                  ? WEEK_PENDING_BADGE_FONT_SIZE
                  : PENDING_BADGE_FONT_SIZE,
              },
            ]}
          >
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
  const scrollYRef = useRef(0);
  const previousDaysKeyRef = useRef<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const interactionCountRef = useRef(0);
  const taskInteractionActive = useSharedValue(0);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const hours = useMemo(() => getCalendarDisplayHours(), []);
  const gridHeight = getCalendarGridHeightPx();
  const dayDateKeys = useMemo(() => days.map((day) => toDateKey(day)), [days]);
  const columnWidth =
    (windowWidth - CALENDAR_TIME_LABEL_WIDTH) / Math.max(days.length, 1);
  const isWeekView = days.length === 7;
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    return now;
  }, []);
  const nowMinutes = getCurrentMinutesFromMidnight();
  const nowTop = getTopForCalendarMinutes(nowMinutes);
  const showNowLine =
    nowMinutes >= CALENDAR_HOUR_START * 60 &&
    nowMinutes <= (CALENDAR_HOUR_END + 1) * 60;

  const allDayTasksByDate = useMemo(() => {
    const map = new Map<string, ReturnType<typeof splitCalendarDayTasks>>();
    for (const dateKey of dayDateKeys) {
      map.set(dateKey, splitCalendarDayTasks(tasksByDate.get(dateKey) ?? []));
    }
    return map;
  }, [dayDateKeys, tasksByDate]);

  const allDayRowHeight = useMemo(() => {
    const maxCount = Math.max(
      0,
      ...dayDateKeys.map(
        (dateKey) => allDayTasksByDate.get(dateKey)?.allDay.length ?? 0,
      ),
    );
    return getCalendarAllDayRowHeight(maxCount);
  }, [allDayTasksByDate, dayDateKeys]);

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

        const swipedNext = event.translationX <= -56 || event.velocityX <= -650;
        const swipedPrevious =
          event.translationX >= 56 || event.velocityX >= 650;

        if (swipedNext) {
          runOnJS(shiftDay)(1);
        } else if (swipedPrevious) {
          runOnJS(shiftDay)(-1);
        }
      });
  }, [onShiftDay, shiftDay, taskInteractionActive]);

  const daysKey = dayDateKeys.join("|");

  const restoreScrollPosition = useCallback(
    (animated = false) => {
      const targetY = scrollYRef.current;
      scrollRef.current?.scrollTo({ y: targetY, animated });
    },
    [],
  );

  useEffect(() => {
    if (loading) return;

    const isNewPeriod = previousDaysKeyRef.current !== daysKey;
    previousDaysKeyRef.current = daysKey;

    const targetY = isNewPeriod
      ? resolveCalendarGridScrollTarget(
          daysKey,
          Math.max(0, nowTop - CALENDAR_HOUR_HEIGHT * 2),
        )
      : (recallCalendarGridScroll(daysKey) ?? scrollYRef.current);

    scrollYRef.current = targetY;

    const timeout = setTimeout(() => {
      restoreScrollPosition(false);
    }, 0);

    return () => clearTimeout(timeout);
  }, [daysKey, loading, nowTop, restoreScrollPosition]);

  useLayoutEffect(() => {
    if (loading) return;
    requestAnimationFrame(() => {
      restoreScrollPosition(false);
    });
  }, [loading, restoreScrollPosition, windowHeight]);

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
                columnWidth={columnWidth}
                isWeekView={isWeekView}
                onPress={() => onSelectDate(day)}
              />
            );
          })}
        </View>

        <View style={[styles.allDayRow, { minHeight: allDayRowHeight }]}>
            <View
              style={[
                styles.allDayLabelCell,
                { height: allDayRowHeight },
              ]}
            >
              <ThemedText style={styles.allDayLabel}>All day</ThemedText>
            </View>
            {days.map((day) => {
              const dateKey = toDateKey(day);
              const allDayTasks =
                allDayTasksByDate.get(dateKey)?.allDay ?? [];

              return (
                <View
                  key={`allday-${dateKey}`}
                  style={[
                    styles.allDayDayCell,
                    { width: columnWidth, minHeight: allDayRowHeight },
                  ]}
                >
                  {allDayTasks.map((task) => (
                    <CalendarAllDayTaskRow
                      key={`${task.id}-${dateKey}`}
                      task={task}
                      onPress={() => onPressTask(task)}
                    />
                  ))}
                </View>
              );
            })}
        </View>

        <View style={styles.scrollHost}>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            scrollEnabled={scrollEnabled && !loading}
            scrollEventThrottle={16}
            onScroll={(event) => {
              const nextY = event.nativeEvent.contentOffset.y;
              scrollYRef.current = nextY;
              rememberCalendarGridScroll(daysKey, nextY);
            }}
            contentContainerStyle={{ paddingBottom: 120 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
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
                const dayTasks =
                  allDayTasksByDate.get(dateKey)?.timed ??
                  tasksByDate.get(dateKey) ??
                  [];
                const isToday = isSameDay(day, today);

                return (
                  <View
                    key={dateKey}
                    style={[
                      styles.dayColumn,
                      { height: gridHeight, width: columnWidth },
                    ]}
                  >
                    {hours.map((hour, index) => (
                      <View
                        key={hour}
                        style={[
                          styles.hourCell,
                          index === 0 && styles.hourCellFirst,
                        ]}
                      />
                    ))}

                    {isToday && showNowLine ? (
                      <View
                        pointerEvents="none"
                        style={[styles.nowLine, { top: nowTop }]}
                      >
                        <View style={styles.nowDot} />
                        <View style={styles.nowBar} />
                      </View>
                    ) : null}

                    {dayTasks.map((task) => (
                      <CalendarTimedTaskBlock
                        key={`${task.id}-${dateKey}-${task.calendarColor ?? ""}`}
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
          {loading ? (
            <View pointerEvents="none" style={styles.loaderOverlay}>
              <ActivityIndicator color="#3c87f7" />
            </View>
          ) : null}
        </View>
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
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 10,
    flexShrink: 0,
  },
  dayHeaderWeekday: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: -3,
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
    fontWeight: "600",
    color: "#2563eb",
  },
  pendingBadgeSpacer: {
    height: 24,
  },
  allDayRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  allDayLabelCell: {
    width: CALENDAR_TIME_LABEL_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#e5e7eb",
  },
  allDayLabel: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
  },
  allDayDayCell: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "#e5e7eb",
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 4,
    flexShrink: 0,
  },
  scrollHost: {
    flex: 1,
    position: "relative",
  },
  scroll: {
    flex: 1,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
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
    backgroundColor: "#a3a3a3",
    marginLeft: -4,
  },
  nowBar: {
    flex: 1,
    height: 2,
    backgroundColor: "#a3a3a3",
  },
});
