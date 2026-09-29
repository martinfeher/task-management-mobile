import { AddTaskButton } from "@/components/add-task-button";
import { AppSymbol } from "@/components/app-symbol";
import { CalendarTimeGridView } from "@/components/calendar-time-grid-view";
import type { TaskScheduleUpdate } from "@/components/calendar-timed-task-block";
import { CalendarUpcomingView } from "@/components/calendar-upcoming-view";
import {
  CalendarViewPickerSheet,
  type CalendarViewMode,
  type CalendarViewPickerAnchor,
} from "@/components/calendar-view-picker-sheet";
import { IoCalendarClearOutlineIcon } from "@/components/io-calendar-clear-outline-icon";
import { LiquidGlassSurface } from "@/components/liquid-glass-surface";
import { CalendarUpcomingIcon } from "@/components/calendar-upcoming-icon";
import {
  TaskContextMenu,
  type TaskContextMenuAnchor,
} from "@/components/task-context-menu";
import {
  TaskDatePickerSheet,
  type TaskScheduleSelection,
} from "@/components/task-date-picker-sheet";
import { TaskLabelPicker } from "@/components/task-label-picker";
import { TaskListPicker } from "@/components/task-list-picker";
import { TaskRow } from "@/components/task-row";
import { ThemedText } from "@/components/themed-text";
import {
  ADD_TASK_FAB_SIZE,
  FAB_BOTTOM_NUDGE,
  FAB_RIGHT_INSET,
  getAddTaskFabReservedHeight,
  getFabBottomOffset,
} from "@/constants/tab-bar";
import { Spacing } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import {
  fetchLabels,
  moveTaskToList,
  toggleTaskImportant,
  toggleTaskLabel,
  updateTaskPinned,
  updateTaskPriority,
  updateTaskSchedule,
} from "@/lib/api";
import { applyTaskReminder } from "@/lib/notifications";
import { addDays, startOfDay, startOfWeek, toDateKey } from "@/lib/task-dates";
import { buildTasksByDate } from "@/lib/task-repeat";
import type { TaskItem, TaskLabel } from "@/types/todo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS_INITIAL_AFTER = 6;
const MONTHS_LOAD_BATCH = 6;
const MONTH_SCROLL_MAX_HEIGHT = 320;
const MONTH_BLOCK_ESTIMATED_HEIGHT = 296;
const MONTH_SCROLL_LOAD_THRESHOLD = 72;

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return startOfDay(day);
  });
}

function formatPeriodLabel(
  viewMode: CalendarViewMode,
  selectedDate: Date,
  monthDate: Date,
) {
  if (viewMode === "month") {
    return monthDate.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  if (viewMode === "day") {
    return selectedDate.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  if (viewMode === "threeDay") {
    const end = addDays(selectedDate, 2);
    const sameMonth = selectedDate.getMonth() === end.getMonth();
    const startLabel = selectedDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const endLabel = end.toLocaleDateString(undefined, {
      month: sameMonth ? undefined : "short",
      day: "numeric",
      year:
        selectedDate.getFullYear() === end.getFullYear()
          ? undefined
          : "numeric",
    });
    return `${startLabel} – ${endLabel}`;
  }

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const startLabel = weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endLabel = weekEnd.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year:
      weekStart.getFullYear() === weekEnd.getFullYear() ? undefined : "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

const CALENDAR_FAB_BUTTON_SIZE = 48;
const CALENDAR_FAB_BUTTON_RENDER_SIZE = CALENDAR_FAB_BUTTON_SIZE * 1.13;
const CALENDAR_FAB_BORDER_RADIUS = CALENDAR_FAB_BUTTON_RENDER_SIZE / 2;
const CALENDAR_FAB_ICON_COLOR = "rgba(180, 180, 220, 0.85)";
const CALENDAR_FAB_ICON_GAP = 12;

export function CalendarPanel() {
  const insets = useSafeAreaInsets();
  const fabBottom = getFabBottomOffset(insets.bottom, false);
  const calendarFabUpcomingBottom =
    fabBottom - FAB_BOTTOM_NUDGE + ADD_TASK_FAB_SIZE + CALENDAR_FAB_ICON_GAP;
  const calendarFabViewPickerBottom =
    calendarFabUpcomingBottom +
    CALENDAR_FAB_BUTTON_RENDER_SIZE +
    CALENDAR_FAB_ICON_GAP;
  const calendarFabIconRight =
    FAB_RIGHT_INSET + (ADD_TASK_FAB_SIZE - CALENDAR_FAB_BUTTON_RENDER_SIZE) / 2;

  const {
    openTask,
    startAddingTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    sidebarData,
    loadSidebar,
    calendarTasks,
    calendarLoading,
    calendarRefreshing,
    loadCalendarTasks,
    patchCalendarTask,
    replaceCalendarTasks,
  } = useApp();
  const openCalendarTask = useCallback(
    (task: TaskItem) => openTask(task, { fromCalendar: true }),
    [openTask],
  );
  const openUpcomingTask = useCallback(
    (task: TaskItem) =>
      openTask(task, { fromCalendar: true, fromUpcoming: true }),
    [openTask],
  );
  const [viewMode, setViewMode] = useState<CalendarViewMode>("threeDay");
  const [isUpcomingView, setIsUpcomingView] = useState(false);
  const [upcomingSessionKey, setUpcomingSessionKey] = useState(0);
  const [viewPickerOpen, setViewPickerOpen] = useState(false);
  const [viewPickerAnchor, setViewPickerAnchor] =
    useState<CalendarViewPickerAnchor | null>(null);
  const viewPickerButtonRef = useRef<View>(null);
  const [monthDate, setMonthDate] = useState(() => startOfDay(new Date()));
  const [monthsBefore, setMonthsBefore] = useState(0);
  const [monthsAfter, setMonthsAfter] = useState(MONTHS_INITIAL_AFTER);
  const [selectedDate, setSelectedDate] = useState(() =>
    startOfDay(new Date()),
  );
  const monthScrollRef = useRef<ScrollView>(null);
  const prependScrollRestoreRef = useRef<number | null>(null);
  const loadingMonthsRef = useRef(false);
  const canLoadPreviousMonthsRef = useRef(false);
  const [contextMenu, setContextMenu] = useState<{
    task: TaskItem;
    anchor: TaskContextMenuAnchor;
  } | null>(null);
  const [rescheduleTask, setRescheduleTask] = useState<TaskItem | null>(null);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [allLabels, setAllLabels] = useState<TaskLabel[]>([]);

  const contextTask = contextMenu?.task ?? null;

  useEffect(() => {
    void loadCalendarTasks();
  }, [loadCalendarTasks]);

  const monthDays = useMemo(
    () => getMonthGrid(monthDate.getFullYear(), monthDate.getMonth()),
    [monthDate],
  );

  const monthSequence = useMemo(() => {
    const anchor = startOfDay(
      new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
    );

    return Array.from(
      { length: monthsBefore + monthsAfter + 1 },
      (_, index) => {
        const offset = index - monthsBefore;
        return startOfDay(
          new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1),
        );
      },
    );
  }, [monthDate, monthsAfter, monthsBefore]);

  useEffect(() => {
    if (prependScrollRestoreRef.current == null) return;

    const restoreOffset = prependScrollRestoreRef.current;
    prependScrollRestoreRef.current = null;
    requestAnimationFrame(() => {
      monthScrollRef.current?.scrollTo({ y: restoreOffset, animated: false });
    });
  }, [monthsBefore]);

  const gridDays = useMemo(() => {
    if (viewMode === "day") {
      return [startOfDay(selectedDate)];
    }
    if (viewMode === "threeDay") {
      return Array.from({ length: 3 }, (_, index) =>
        startOfDay(addDays(selectedDate, index)),
      );
    }
    if (viewMode === "week") {
      const weekStart = startOfWeek(selectedDate);
      return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    }
    return [];
  }, [selectedDate, viewMode]);

  const tasksByDate = useMemo(() => {
    let rangeStart = startOfDay(selectedDate);
    let rangeEnd = startOfDay(selectedDate);

    if (viewMode === "month") {
      const firstMonth = monthSequence[0];
      const lastMonth = monthSequence[monthSequence.length - 1];
      if (firstMonth && lastMonth) {
        const firstMonthDays = getMonthGrid(
          firstMonth.getFullYear(),
          firstMonth.getMonth(),
        );
        const lastMonthDays = getMonthGrid(
          lastMonth.getFullYear(),
          lastMonth.getMonth(),
        );
        rangeStart = firstMonthDays[0] ?? rangeStart;
        rangeEnd = lastMonthDays[lastMonthDays.length - 1] ?? rangeEnd;
      } else {
        rangeStart = monthDays[0] ?? rangeStart;
        rangeEnd = monthDays[monthDays.length - 1] ?? rangeEnd;
      }
    } else if (gridDays.length > 0) {
      rangeStart = gridDays[0] ?? rangeStart;
      rangeEnd = gridDays[gridDays.length - 1] ?? rangeEnd;
    }

    return buildTasksByDate(calendarTasks, rangeStart, rangeEnd);
  }, [
    calendarTasks,
    gridDays,
    monthDays,
    monthSequence,
    selectedDate,
    viewMode,
  ]);

  const selectedDateKey = toDateKey(selectedDate);
  const selectedDayTasks = tasksByDate.get(selectedDateKey) ?? [];
  const periodLabel = formatPeriodLabel(viewMode, selectedDate, monthDate);
  const isTimeGridView = viewMode !== "month";

  function resetMonthScrollRange() {
    setMonthsBefore(0);
    setMonthsAfter(MONTHS_INITIAL_AFTER);
    prependScrollRestoreRef.current = null;
    canLoadPreviousMonthsRef.current = false;
    monthScrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function loadMoreMonths(direction: "before" | "after") {
    if (loadingMonthsRef.current) return;
    loadingMonthsRef.current = true;

    if (direction === "before") {
      prependScrollRestoreRef.current =
        MONTH_BLOCK_ESTIMATED_HEIGHT * MONTHS_LOAD_BATCH;
      setMonthsBefore((current) => current + MONTHS_LOAD_BATCH);
    } else {
      setMonthsAfter((current) => current + MONTHS_LOAD_BATCH);
    }

    requestAnimationFrame(() => {
      loadingMonthsRef.current = false;
    });
  }

  const handleMonthScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } =
        event.nativeEvent;

      if (contentOffset.y > MONTH_SCROLL_LOAD_THRESHOLD) {
        canLoadPreviousMonthsRef.current = true;
      }

      if (
        canLoadPreviousMonthsRef.current &&
        contentOffset.y <= MONTH_SCROLL_LOAD_THRESHOLD
      ) {
        loadMoreMonths("before");
      }

      if (
        contentOffset.y + layoutMeasurement.height >=
        contentSize.height - MONTH_SCROLL_LOAD_THRESHOLD
      ) {
        loadMoreMonths("after");
      }
    },
    [],
  );

  function handlePreviousPeriod() {
    if (viewMode === "month") {
      const nextMonth = startOfDay(
        new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1),
      );
      setMonthDate(nextMonth);
      const firstVisibleMonth = monthSequence[0];
      if (firstVisibleMonth && nextMonth < firstVisibleMonth) {
        setMonthsBefore((current) => current + 1);
      }
      return;
    }

    const delta = viewMode === "week" ? -7 : -1;
    setSelectedDate((current) => startOfDay(addDays(current, delta)));
  }

  function handleNextPeriod() {
    if (viewMode === "month") {
      const nextMonth = startOfDay(
        new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1),
      );
      setMonthDate(nextMonth);
      const lastVisibleMonth = monthSequence[monthSequence.length - 1];
      if (lastVisibleMonth && nextMonth > lastVisibleMonth) {
        setMonthsAfter((current) => current + 1);
      }
      return;
    }

    const delta = viewMode === "week" ? 7 : 1;
    setSelectedDate((current) => startOfDay(addDays(current, delta)));
  }

  function handleSelectViewMode(nextView: CalendarViewMode) {
    setIsUpcomingView(false);
    setViewMode(nextView);
    if (nextView === "month") {
      setMonthDate(
        startOfDay(
          new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
        ),
      );
      resetMonthScrollRange();
    }
  }

  function handleAddTaskOnSelectedDay() {
    startAddingTask({
      stayOnPage: true,
      draft: { dueDate: selectedDateKey },
    });
  }

  const handleShiftDay = useCallback((delta: number) => {
    setSelectedDate((current) => startOfDay(addDays(current, delta)));
  }, []);

  async function handleUpdateTaskSchedule(
    task: TaskItem,
    update: TaskScheduleUpdate,
  ) {
    const original = calendarTasks.find((item) => item.id === task.id);
    const previousTasks = calendarTasks;
    patchCalendarTask(task.id, {
      dueDate: update.dueDate,
      dueTimeMinutes: update.dueTimeMinutes,
      dueDurationMinutes: update.dueDurationMinutes,
      dueRepeat: original?.dueRepeat ?? null,
    });

    try {
      const result = await updateTaskSchedule(task.id, update);
      await applyTaskReminder({
        taskId: task.id,
        taskName: task.name,
        dueDate: result.dueDate,
        dueTimeMinutes: result.dueTimeMinutes,
      });
      patchCalendarTask(task.id, {
        dueDate: result.dueDate,
        dueTimeMinutes: result.dueTimeMinutes,
        dueDurationMinutes: result.dueDurationMinutes,
        dueRepeat: original?.dueRepeat ?? null,
      });
    } catch {
      replaceCalendarTasks(previousTasks);
      Alert.alert("Couldn't update task schedule");
    }
  }

  async function handleReschedule(selection: TaskScheduleSelection) {
    if (!rescheduleTask) return;
    try {
      const result = await updateTaskSchedule(rescheduleTask.id, selection);
      await applyTaskReminder({
        taskId: rescheduleTask.id,
        taskName: rescheduleTask.name,
        dueDate: result.dueDate,
        dueTimeMinutes: result.dueTimeMinutes,
        reminderEnabled: selection.reminderEnabled,
        reminderOffsetMinutes: selection.reminderOffsetMinutes,
      });
      patchCalendarTask(rescheduleTask.id, {
        dueDate: result.dueDate,
        dueTimeMinutes: result.dueTimeMinutes,
        dueDurationMinutes: result.dueDurationMinutes,
        dueRepeat: selection.dueRepeat ?? null,
      });
      await loadCalendarTasks(true);
    } catch {
      Alert.alert("Couldn't change date");
    } finally {
      setRescheduleTask(null);
    }
  }

  function closeContextMenu() {
    setContextMenu(null);
    setLabelPickerOpen(false);
    setListPickerOpen(false);
  }

  async function patchTaskLocally() {
    await loadCalendarTasks(true);
    void loadSidebar(true);
  }

  async function handleTogglePinned() {
    if (!contextTask) return;
    closeContextMenu();
    try {
      await updateTaskPinned(contextTask.id, !contextTask.pinned);
      await patchTaskLocally();
    } catch {
      Alert.alert("Couldn't update pin");
    }
  }

  async function handleToggleImportant() {
    if (!contextTask) return;
    closeContextMenu();
    try {
      await toggleTaskImportant(contextTask.id, !contextTask.important);
      await patchTaskLocally();
    } catch {
      Alert.alert("Couldn't update important");
    }
  }

  async function handleSetPriority(priority: number | null) {
    if (!contextTask) return;
    closeContextMenu();
    try {
      await updateTaskPriority(contextTask.id, priority);
      await patchTaskLocally();
    } catch {
      Alert.alert("Couldn't update priority");
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
      await patchTaskLocally();
    } catch {
      Alert.alert("Couldn't update label");
    }
  }

  async function handleMoveToList(listId: string) {
    if (!contextTask || listId === contextTask.listId) {
      closeContextMenu();
      return;
    }
    closeContextMenu();
    try {
      await moveTaskToList(contextTask.id, listId);
      await patchTaskLocally();
    } catch {
      Alert.alert("Couldn't move task");
    }
  }

  const assignedLabelIds = new Set(
    (contextTask?.labels ?? []).map((label) => label.id),
  );
  const listBottomPadding = getAddTaskFabReservedHeight(insets.bottom);

  function handleSelectUpcomingView() {
    setUpcomingSessionKey((key) => key + 1);
    setIsUpcomingView(true);
  }

  function handleOpenViewPicker() {
    viewPickerButtonRef.current?.measureInWindow((x, y, width, height) => {
      setViewPickerAnchor({ x, y, width, height });
      setViewPickerOpen(true);
    });
  }

  function handleCloseViewPicker() {
    setViewPickerOpen(false);
    setViewPickerAnchor(null);
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {isUpcomingView ? (
          <CalendarUpcomingView
            key={upcomingSessionKey}
         
            tasks={calendarTasks}
            loading={calendarLoading}
            refreshing={calendarRefreshing}
            listBottomPadding={listBottomPadding}
            onRefresh={() => void loadCalendarTasks(true)}
            onPressTask={openUpcomingTask}
            onToggleComplete={(taskId, completed) => {
              if (completed) {
                void completeTask(taskId).then(() => loadCalendarTasks(true));
              } else {
                void uncompleteTask(taskId).then(() => loadCalendarTasks(true));
              }
            }}
            onOpenContextMenu={(nextTask, anchor) =>
              setContextMenu({ task: nextTask, anchor })
            }
            onSelectDate={setSelectedDate}
          />
        ) : null}

        {!isUpcomingView ? (
          <>
            <View style={styles.periodHeader}>
              <Pressable
                style={styles.periodNavButton}
                onPress={handlePreviousPeriod}
              >
                <AppSymbol
                  ios="chevron.left"
                  android="chevron-left"
                  size={20}
                  tintColor="#374151"
                />
              </Pressable>
              <ThemedText style={styles.periodLabel} numberOfLines={1}>
                {periodLabel}
              </ThemedText>
              <Pressable
                style={styles.periodNavButton}
                onPress={handleNextPeriod}
              >
                <AppSymbol
                  ios="chevron.right"
                  android="chevron-right"
                  size={20}
                  tintColor="#374151"
                />
              </Pressable>
            </View>

            {isTimeGridView ? (
              <CalendarTimeGridView
                days={gridDays}
                tasksByDate={tasksByDate}
                selectedDate={selectedDate}
                loading={calendarLoading}
                refreshing={calendarRefreshing}
                onSelectDate={setSelectedDate}
                onPressTask={openCalendarTask}
                onScheduleChange={(task, update) =>
                  void handleUpdateTaskSchedule(task, update)
                }
                onShiftDay={handleShiftDay}
                onRefresh={() => void loadCalendarTasks(true)}
              />
            ) : null}

            {viewMode === "month" ? (
              <>
                <View style={styles.weekdayRow}>
                  {WEEKDAY_LABELS.map((label) => (
                    <ThemedText key={label} style={styles.weekdayLabel}>
                      {label}
                    </ThemedText>
                  ))}
                </View>

                <ScrollView
                  ref={monthScrollRef}
                  style={styles.monthScroll}
                  contentContainerStyle={styles.monthScrollContent}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  scrollEventThrottle={16}
                  onScroll={handleMonthScroll}
                >
                  {monthSequence.map((visibleMonth, monthIndex) => {
                    const visibleMonthDays = getMonthGrid(
                      visibleMonth.getFullYear(),
                      visibleMonth.getMonth(),
                    );
                    const visibleMonthLabel = visibleMonth.toLocaleDateString(
                      undefined,
                      {
                        month: "long",
                        year: "numeric",
                      },
                    );

                    return (
                      <View
                        key={toDateKey(visibleMonth)}
                        style={styles.monthBlock}
                      >
                        {monthIndex > 0 ? (
                          <ThemedText style={styles.monthBlockLabel}>
                            {visibleMonthLabel}
                          </ThemedText>
                        ) : null}
                        <View style={styles.monthGrid}>
                          {visibleMonthDays.map((day) => {
                            const key = toDateKey(day);
                            const inMonth =
                              day.getMonth() === visibleMonth.getMonth();
                            const selected = isSameDay(day, selectedDate);
                            const isToday = isSameDay(day, new Date());
                            const count = tasksByDate.get(key)?.length ?? 0;

                            return (
                              <Pressable
                                key={`${toDateKey(visibleMonth)}-${key}`}
                                style={[
                                  styles.dayCell,
                                  selected && styles.dayCellSelected,
                                ]}
                                onPress={() => setSelectedDate(day)}
                              >
                                <ThemedText
                                  style={[
                                    styles.dayNumber,
                                    !inMonth && styles.dayNumberMuted,
                                    isToday && styles.dayNumberToday,
                                    selected && styles.dayNumberSelected,
                                  ]}
                                >
                                  {day.getDate()}
                                </ThemedText>
                                {count > 0 && !selected ? (
                                  <View style={styles.taskDot} />
                                ) : null}
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}

            {viewMode === "month" ? (
              <ScrollView
                style={styles.dayTasks}
                contentContainerStyle={styles.dayTasksContent}
                refreshControl={
                  <RefreshControl
                    refreshing={calendarRefreshing}
                    onRefresh={() => void loadCalendarTasks(true)}
                  />
                }
              >
                <ThemedText style={styles.dayTasksTitle}>
                  {selectedDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </ThemedText>

                {calendarLoading ? (
                  <ActivityIndicator color="#3c87f7" style={styles.loader} />
                ) : selectedDayTasks.length === 0 ? (
                  <ThemedText
                    themeColor="textSecondary"
                    style={styles.emptyDay}
                  >
                    No scheduled tasks
                  </ThemedText>
                ) : (
                  selectedDayTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      showListName
                      onPress={openCalendarTask}
                      onToggleComplete={(taskId, completed) => {
                        if (completed) {
                          void completeTask(taskId).then(() =>
                            loadCalendarTasks(true),
                          );
                        } else {
                          void uncompleteTask(taskId).then(() =>
                            loadCalendarTasks(true),
                          );
                        }
                      }}
                      onOpenContextMenu={(nextTask, anchor) =>
                        setContextMenu({ task: nextTask, anchor })
                      }
                    />
                  ))
                )}
              </ScrollView>
            ) : null}
          </>
        ) : null}
      </SafeAreaView>

      {contextMenu && !labelPickerOpen && !listPickerOpen ? (
        <TaskContextMenu
          variant="calendar"
          task={contextMenu.task}
          top={contextMenu.anchor.y + contextMenu.anchor.height}
          left={contextMenu.anchor.x}
          onClose={closeContextMenu}
          onRename={() => {
            setContextMenu(null);
            (isUpcomingView ? openUpcomingTask : openCalendarTask)(
              contextMenu.task,
            );
          }}
          onChangeDate={() => {
            setRescheduleTask(contextMenu.task);
            setContextMenu(null);
          }}
          onDelete={() => {
            const task = contextMenu.task;
            setContextMenu(null);
            Alert.alert("Delete task", `Delete "${task.name}"?`, [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  void deleteTask(task.id).then(() => loadCalendarTasks(true));
                },
              },
            ]);
          }}
        />
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

      <TaskListPicker
        visible={listPickerOpen}
        lists={sidebarData?.lists ?? []}
        currentListId={contextTask?.listId ?? null}
        onSelectList={(list) => void handleMoveToList(list.id)}
        onClose={closeContextMenu}
      />

      <TaskDatePickerSheet
        visible={rescheduleTask != null}
        value={rescheduleTask?.dueDate ?? null}
        dueTimeMinutes={rescheduleTask?.dueTimeMinutes ?? null}
        dueDurationMinutes={rescheduleTask?.dueDurationMinutes ?? null}
        dueRepeat={rescheduleTask?.dueRepeat ?? null}
        onSelect={(selection) => void handleReschedule(selection)}
        onClose={() => setRescheduleTask(null)}
      />

      <CalendarViewPickerSheet
        visible={viewPickerOpen}
        activeView={viewMode}
        hideActiveHighlight={isUpcomingView}
        anchor={viewPickerAnchor}
        onSelectView={handleSelectViewMode}
        onClose={handleCloseViewPicker}
      />

      <Pressable
        ref={viewPickerButtonRef}
        accessibilityRole="button"
        accessibilityLabel="Change calendar view"
        hitSlop={8}
        className="absolute z-20 mr-2 mb-1"
        style={[
          styles.calendarFabButtonShadow,
          {
            bottom: calendarFabUpcomingBottom,
            right: calendarFabIconRight,
          },
        ]}
        onPress={handleOpenViewPicker}
      >
        <LiquidGlassSurface
          borderRadius={CALENDAR_FAB_BORDER_RADIUS}
          isInteractive
          style={[styles.calendarFabGlass, styles.calendarFabGlassSurface]}
        >
          <View style={styles.calendarFabIconSlot}>
            <IoCalendarClearOutlineIcon
              size={29}
              color={'#CECED9'}
            />
          </View>
        </LiquidGlassSurface>
      </Pressable>

      {!isUpcomingView ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show upcoming calendar view"
          hitSlop={8}
          className="absolute z-20 mr-2 mb-1"
          style={[
            styles.calendarFabButtonShadow,
            {
              bottom: calendarFabViewPickerBottom,
              right: calendarFabIconRight,
            },
          ]}
          onPress={handleSelectUpcomingView}
        >
          <LiquidGlassSurface
            borderRadius={CALENDAR_FAB_BORDER_RADIUS}
            isInteractive
            style={[styles.calendarFabUpcomingGlass, styles.calendarFabGlassSurface]}
          >
            <View style={styles.calendarFabUpcomingIconSlot}>
              <CalendarUpcomingIcon
                size={22}
                color={'#DCDCE6' }
              />
            </View>
            <ThemedText style={styles.upcomingFabLabel}>Upcoming</ThemedText>
          </LiquidGlassSurface>
        </Pressable>
      ) : null}

      <AddTaskButton onPress={handleAddTaskOnSelectedDay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#46494F",
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarFabButtonShadow: {
    zIndex: 20,
    elevation: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#A5A5A7",
        shadowOpacity: 0.2,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 9 },
      },
      android: {
        elevation: 10,
      },
      default: {
        boxShadow: "0px 3px 5px 0px rgba(0, 0, 0, 0.1)",
      },
    }),
  },
  calendarFabGlassSurface: {
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    ...Platform.select({
      default: {
        boxShadow: "none",
      },
    }),
  },
  calendarFabGlass: {
    width: CALENDAR_FAB_BUTTON_RENDER_SIZE,
    height: CALENDAR_FAB_BUTTON_RENDER_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarFabIconSlot: {
    width: CALENDAR_FAB_BUTTON_RENDER_SIZE,
    height: CALENDAR_FAB_BUTTON_RENDER_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarFabUpcomingGlass: {
    width: CALENDAR_FAB_BUTTON_RENDER_SIZE,
    height: CALENDAR_FAB_BUTTON_RENDER_SIZE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  calendarFabUpcomingIconSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
  upcomingFabLabel: {
    marginTop: 1,
    fontSize: 6,
    lineHeight: 10,
    fontWeight: "500",
    color: CALENDAR_FAB_ICON_COLOR,
    textAlign: "center",
  },
  periodHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    gap: 8,
  },
  periodNavButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    flexShrink: 0,
  },
  periodLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  weekdayRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.two,
    marginBottom: Spacing.one,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
  },
  monthScroll: {
    maxHeight: MONTH_SCROLL_MAX_HEIGHT,
  },
  monthScrollContent: {
    paddingBottom: Spacing.one,
  },
  monthBlock: {
    marginBottom: Spacing.two,
  },
  monthBlockLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
    paddingHorizontal: Spacing.two,
    marginBottom: Spacing.one,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.two,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  dayCellSelected: {
    backgroundColor: "#dce8f5",
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  dayNumberMuted: {
    color: "#d1d5db",
  },
  dayNumberToday: {
    color: "#3c87f7",
    fontWeight: "700",
  },
  dayNumberSelected: {
    fontWeight: "700",
  },
  taskDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#afafaf",
    marginTop: 3,
  },
  dayTasks: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
  },
  dayTasksContent: {
    paddingBottom: 96,
  },
  dayTasksTitle: {
    fontSize: 15,
    fontWeight: "600",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    color: "#6b7280",
  },
  loader: {
    marginTop: Spacing.three,
  },
  emptyDay: {
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
});
