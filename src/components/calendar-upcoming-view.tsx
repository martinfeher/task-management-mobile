import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";

import { BiChevronDownIcon } from "@/components/bi-chevron-down-icon";
import type { TaskContextMenuAnchor } from "@/components/task-context-menu";
import { TaskRow } from "@/components/task-row";
import { ThemedText } from "@/components/themed-text";
import { addDays, isSameDay, startOfDay, toDateKey } from "@/lib/task-dates";
import { buildTasksByDate, compareTasksByDueTime } from "@/lib/task-repeat";
import type { TaskItem } from "@/types/todo";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const STRIP_DAYS_PER_PAGE = 14;
const STRIP_PAST_DAYS = 42;
const STRIP_FUTURE_DAYS = 180;
const OVERDUE_VISIBLE_LIMIT = 2;
const UPCOMING_DAYS_INITIAL = 30;
const UPCOMING_DAYS_BATCH = 14;
const SCROLL_LOAD_THRESHOLD = 120;
const SECTION_SYNC_THRESHOLD = 48;
const STRIP_ROW_HEIGHT = 36;
const STRIP_CALENDAR_HEIGHT = STRIP_ROW_HEIGHT * 2 + 4;

type CalendarUpcomingViewProps = {
  tasks: TaskItem[];
  loading: boolean;
  refreshing: boolean;
  listBottomPadding: number;
  onRefresh: () => void;
  onPressTask: (task: TaskItem) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onOpenContextMenu: (task: TaskItem, anchor: TaskContextMenuAnchor) => void;
  onSelectDate?: (date: Date) => void;
};

type UpcomingSection =
  | { kind: "overdue"; id: string; tasks: TaskItem[] }
  | { kind: "day"; id: string; date: Date; tasks: TaskItem[] };

function chunkDays(days: Date[], size: number) {
  const chunks: Date[][] = [];
  for (let index = 0; index < days.length; index += size) {
    chunks.push(days.slice(index, index + size));
  }
  return chunks;
}

function formatDaySectionTitle(date: Date, today: Date) {
  const tomorrow = addDays(today, 1);
  const dateLabel = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" });

  if (isSameDay(date, today)) {
    return `Today `;
  }
  if (isSameDay(date, tomorrow)) {
    return `Tomorrow`;
  }
  return `${dateLabel} · ${weekday}`;
}

function findPageIndexForDate(pages: Date[][], date: Date) {
  const targetKey = toDateKey(date);
  return pages.findIndex((page) =>
    page.some((day) => toDateKey(day) === targetKey),
  );
}

export function CalendarUpcomingView({
  tasks,
  loading,
  refreshing,
  listBottomPadding,
  onRefresh,
  onPressTask,
  onToggleComplete,
  onOpenContextMenu,
  onSelectDate,
}: CalendarUpcomingViewProps) {
  const screenWidth = Dimensions.get("window").width;
  const dayCellWidth = screenWidth / 7;

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayKey = toDateKey(today);

  const [upcomingDaysCount, setUpcomingDaysCount] = useState(
    UPCOMING_DAYS_INITIAL,
  );
  const [overdueExpanded, setOverdueExpanded] = useState(false);
  const [visibleSectionDate, setVisibleSectionDate] = useState(today);
  const [selectedStripDate, setSelectedStripDate] = useState(today);

  const listScrollRef = useRef<ScrollView>(null);
  const stripScrollRef = useRef<ScrollView>(null);
  const sectionOffsetsRef = useRef<Map<string, number>>(new Map());

  const activeTasks = useMemo(
    () => tasks.filter((task) => !task.completed),
    [tasks],
  );

  const rangeEnd = useMemo(
    () => addDays(today, upcomingDaysCount),
    [today, upcomingDaysCount],
  );

  const tasksByDate = useMemo(() => {
    const rangeStart = addDays(today, -STRIP_PAST_DAYS);
    return buildTasksByDate(activeTasks, rangeStart, rangeEnd);
  }, [activeTasks, rangeEnd, today]);

  const overdueTasks = useMemo(() => {
    return activeTasks
      .filter((task) => {
        if (!task.dueDate) return false;
        return task.dueDate.slice(0, 10) < todayKey;
      })
      .sort((left, right) => {
        const leftDate = left.dueDate?.slice(0, 10) ?? "";
        const rightDate = right.dueDate?.slice(0, 10) ?? "";
        const dateCompare = leftDate.localeCompare(rightDate);
        if (dateCompare !== 0) {
          return dateCompare;
        }
        return compareTasksByDueTime(left, right);
      });
  }, [activeTasks, todayKey]);

  useEffect(() => {
    if (overdueTasks.length <= OVERDUE_VISIBLE_LIMIT) {
      setOverdueExpanded(false);
    }
  }, [overdueTasks.length]);

  const sections = useMemo(() => {
    const result: UpcomingSection[] = [];

    if (overdueTasks.length > 0) {
      result.push({
        kind: "overdue",
        id: "overdue",
        tasks: overdueTasks,
      });
    }

    for (let offset = 0; offset <= upcomingDaysCount; offset += 1) {
      const date = addDays(today, offset);
      const key = toDateKey(date);
      result.push({
        kind: "day",
        id: key,
        date,
        tasks: tasksByDate.get(key) ?? [],
      });
    }

    return result;
  }, [overdueTasks, tasksByDate, today, upcomingDaysCount]);

  const stripDays = useMemo(() => {
    const start = addDays(today, -STRIP_PAST_DAYS);
    const end = addDays(today, STRIP_FUTURE_DAYS);
    const days: Date[] = [];
    let cursor = start;
    while (cursor <= end) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [today]);

  const stripPages = useMemo(
    () => chunkDays(stripDays, STRIP_DAYS_PER_PAGE),
    [stripDays],
  );

  const stripMonthLabel = visibleSectionDate.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  const scrollStripToDate = useCallback(
    (date: Date, animated = true) => {
      const pageIndex = findPageIndexForDate(stripPages, date);
      if (pageIndex < 0) return;

      stripScrollRef.current?.scrollTo({
        x: pageIndex * screenWidth,
        animated,
      });
    },
    [screenWidth, stripPages],
  );

  useEffect(() => {
    scrollStripToDate(today, false);
  }, [scrollStripToDate, today]);

  useEffect(() => {
    scrollStripToDate(visibleSectionDate, true);
  }, [scrollStripToDate, visibleSectionDate]);

  const updateVisibleSectionFromScroll = useCallback(
    (scrollY: number) => {
      let nextDate: Date | null = null;

      for (const section of sections) {
        if (section.kind === "overdue") continue;
        const offset = sectionOffsetsRef.current.get(section.id);
        if (offset == null) continue;
        if (offset <= scrollY + SECTION_SYNC_THRESHOLD) {
          nextDate = section.date;
        }
      }

      if (nextDate && !isSameDay(nextDate, visibleSectionDate)) {
        setVisibleSectionDate(nextDate);
      }
    },
    [sections, visibleSectionDate],
  );

  const handleListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } =
        event.nativeEvent;

      updateVisibleSectionFromScroll(contentOffset.y);

      if (
        contentOffset.y + layoutMeasurement.height >=
        contentSize.height - SCROLL_LOAD_THRESHOLD
      ) {
        setUpcomingDaysCount((current) => current + UPCOMING_DAYS_BATCH);
      }
    },
    [updateVisibleSectionFromScroll],
  );

  function handleSelectStripDate(date: Date) {
    const daysAhead = Math.max(
      0,
      Math.round((date.getTime() - today.getTime()) / 86_400_000),
    );
    if (daysAhead > upcomingDaysCount) {
      setUpcomingDaysCount(daysAhead + UPCOMING_DAYS_BATCH);
    }

    setSelectedStripDate(date);
    setVisibleSectionDate(date);
    onSelectDate?.(date);

    const sectionId = toDateKey(date);
    const offset = sectionOffsetsRef.current.get(sectionId);
    if (offset != null) {
      listScrollRef.current?.scrollTo({ y: offset, animated: true });
      return;
    }

    scrollStripToDate(date, true);
  }

  function renderTaskRow(task: TaskItem) {
    return (
      <TaskRow
        key={task.id}
        task={task}
        showListName
        listNameColor="#c2c2c2"
        priorityBeforeAssignedLabels
        onPress={onPressTask}
        onToggleComplete={onToggleComplete}
        onOpenContextMenu={onOpenContextMenu}
      />
    );
  }

  return (
    <View className="flex-1">
      <View className="shrink-0 grow-0 border-b border-[#e5e7eb]  -mt-2">
        <View className="flex-row items-center justify-between px-4 pb-0.5 mb-1">
          <ThemedText className="text-[15px] font-semibold" style={{ color: "#494949" }}>
            {stripMonthLabel}
          </ThemedText>
     
          <View className="items-end" style={{ marginTop: -4 }}>
            {!isSameDay(selectedStripDate, today) ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Go to today"
                hitSlop={8}
                onPress={() => handleSelectStripDate(today)}
              >
                <ThemedText
                  style={{
                    fontSize: 6,
                    color: "#cfcfde",
                  }}
                >
                  today
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="flex-row pb-0.5">
          {WEEKDAY_LABELS.map((label, index) => (
            <View
              key={`${label}-${index}`}
              className="items-center text-zinc-600"
              style={{ width: dayCellWidth }}
            >
              <ThemedText
                className="text-xs font-semibold"
                style={{ color: "#787878" }}
              >
                {label}
              </ThemedText>
            </View>
          ))}
        </View>

        <ScrollView
          ref={stripScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={screenWidth}
          className="shrink-0 grow-0"
          style={{ height: STRIP_CALENDAR_HEIGHT }}
          contentContainerStyle={{ width: screenWidth * stripPages.length }}
        >
          {stripPages.map((page, pageIndex) => (
            <View key={pageIndex} className="mt-2" style={{ width: screenWidth }}>
              {[0, 1].map((rowIndex) => (
                <View key={rowIndex} className="flex-row">
                  {page.slice(rowIndex * 7, rowIndex * 7 + 7).map((day) => {
                    const key = toDateKey(day);
                    const isSelected = isSameDay(day, selectedStripDate);
                    const hasTasks = (tasksByDate.get(key)?.length ?? 0) > 0;

                    return (
                      <Pressable
                        key={key}
                        className="items-center justify-center"
                        style={{ width: dayCellWidth, height: STRIP_ROW_HEIGHT }}
                        onPress={() => handleSelectStripDate(day)}
                      >
                        <View
                          className={`size-[36px] items-center justify-center rounded-full ${
                            isSelected ? "bg-[#898ea0]" : ""
                          }`}
                        >
                          <ThemedText
                            className={`text-[15px] font-medium ${
                              isSelected ? "font-bold" : ""
                            }`}
                            style={{
                              color: isSelected ? "#ffffff" : "#b8b8b8",
                            }}
                          >
                            {day.getDate()}
                          </ThemedText>
                        </View>
                        {hasTasks ? (
                          <View className="mt-0.5 size-1 rounded-full bg-gray-400" />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>

        <View className="mt-1 mb-1.5 h-1 w-9 self-center rounded-sm bg-gray-300" />
      </View>

      <ScrollView
        ref={listScrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: listBottomPadding }}
        showsVerticalScrollIndicator
        scrollEventThrottle={16}
        onScroll={handleListScroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator color="#3c87f7" className="mt-4" />
        ) : (
          sections.map((section) => {
            if (section.kind === "overdue") {
              const hasMoreOverdueTasks =
                section.tasks.length > OVERDUE_VISIBLE_LIMIT;
              const visibleOverdueTasks = overdueExpanded
                ? section.tasks
                : section.tasks.slice(0, OVERDUE_VISIBLE_LIMIT);
              const canToggleOverdue = hasMoreOverdueTasks;

              const toggleOverdueExpanded = () => {
                setOverdueExpanded((expanded) => !expanded);
              };

              return (
                <View
                  key={section.id}
                  onLayout={(event) => {
                    sectionOffsetsRef.current.set(
                      section.id,
                      event.nativeEvent.layout.y,
                    );
                  }}
                >
                  <Pressable
                    accessibilityRole={canToggleOverdue ? "button" : undefined}
                    accessibilityLabel={
                      canToggleOverdue
                        ? overdueExpanded
                          ? "Collapse overdue tasks"
                          : "Show all overdue tasks"
                        : undefined
                    }
                    accessibilityState={
                      canToggleOverdue ? { expanded: overdueExpanded } : undefined
                    }
                    className="flex-row items-center justify-between px-4 py-1"
                    disabled={!canToggleOverdue}
                    hitSlop={canToggleOverdue ? { top: 4, bottom: 4 } : undefined}
                    onPress={toggleOverdueExpanded}
                  >
                    <ThemedText
                      className="text-[11px] font-bold"
                      style={{ color: "#b3b3b3" }}
                    >
                      Overdue
                    </ThemedText>
                    {canToggleOverdue ? (
                      <View
                        className="h-7 w-7 items-center justify-center"
                        style={{
                          transform: [
                            { rotate: overdueExpanded ? "180deg" : "0deg" },
                          ],
                        }}
                      >
                        <BiChevronDownIcon size={20} color="#CCD1D4" />
                      </View>
                    ) : null}
                  </Pressable>
                  {visibleOverdueTasks.map(renderTaskRow)}
                </View>
              );
            }

            const title = formatDaySectionTitle(section.date, today);

            return (
              <View
                key={section.id}
                onLayout={(event) => {
                  sectionOffsetsRef.current.set(
                    section.id,
                    event.nativeEvent.layout.y,
                  );
                }}
              >
                <ThemedText
                  className="px-4 py-0 text-[10px] font-bold"
                  style={{ color: "#A5A8AC" }}
                >
                  {title}
                </ThemedText>
                {section.tasks.length === 0 ? (
                  <ThemedText
                    className="px-4 py-0 -mt-[2px]"
                    style={{ color: "#C6C9CB", fontSize: 10 }}
                  >
                    No tasks
                  </ThemedText>
                ) : (
                  section.tasks.map(renderTaskRow)
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
