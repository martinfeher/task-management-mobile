import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppSymbol } from "@/components/app-symbol";
import { IoMdTimeIcon } from "@/components/io-md-time-icon";
import { IoTimerOutlineIcon } from "@/components/io-timer-outline-icon";
import { ThemedText } from "@/components/themed-text";
import { TimeReminderIcon } from "@/components/time-reminder-icon";
import { Spacing } from "@/constants/theme";
import {
  getMonthGrid,
  isSameDay,
  parseDateKey,
  startOfDay,
  toDateKey,
} from "@/lib/task-dates";
import { matchesRepeatPattern, type TaskRepeatOption } from "@/lib/task-repeat";

export type TaskScheduleSelection = {
  dueDate: string | null;
  dueTimeMinutes: number | null;
  dueDurationMinutes: number | null;
  dueRepeat?: TaskRepeatOption | null;
  reminderEnabled?: boolean;
  reminderOffsetMinutes?: number | null;
};

type TaskDatePickerSheetProps = {
  visible: boolean;
  value: string | null;
  dueTimeMinutes?: number | null;
  dueDurationMinutes?: number | null;
  dueRepeat?: TaskRepeatOption | null;
  onSelect: (selection: TaskScheduleSelection) => void;
  onClose: () => void;
};

type RepeatOption = TaskRepeatOption;
const ACCENT = "#87a1cb";
// const ACCENT = "#8caacf";
// const ACCENT = "#88a4c8";
// const ACCENT = "#7a94b4";
const TIME_PICKER_BLUE = "#8095be";
const TIME_PICKER_BAR_BG = "#eef3f8";
const TIME_TOGGLE_SWITCH_BASE = Platform.select({
  ios: { width: 51, height: 31 },
  default: { width: 48, height: 28 },
});
const TIME_TOGGLE_SWITCH_WIDTH = TIME_TOGGLE_SWITCH_BASE.width - 11;
const TIME_TOGGLE_SWITCH_HEIGHT = TIME_TOGGLE_SWITCH_BASE.height - 3;
const TIME_TOGGLE_ROW_HEIGHT = TIME_TOGGLE_SWITCH_HEIGHT;
const TIME_TOGGLE_LABEL_COLOR = "#6b7c93";
const TIME_TOGGLE_STATUS_COLOR = "#a4aabc";
// const TIME_TOGGLE_STATUS_COLOR = "#94a3b8";
const DAY_SELECTION_CIRCLE_SIZE = 36;
const MONTH_NAV_ICON_SIZE = 21;
/** #111827 lightened 15% toward white */
const MONTH_LABEL_COLOR = "#3c4351";
/** #374151 lightened 15% toward white */
const CLOSE_ICON_COLOR = "#6f7c8d";
const HEADER_CORNER_INSET = Spacing.two;
const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const REPEAT_OPTIONS: { id: RepeatOption; label: string }[] = [
  { id: "none", label: "None" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "weekday", label: "Every Weekday" },
  { id: "custom", label: "Custom" },
];
const REPEAT_SCROLL_TRACK_HEIGHT = 3;
const REPEAT_SCROLL_THUMB_MIN_WIDTH = 28;
/** #b8c4d9 lightened 20% toward white */
const SCHEDULE_SCROLL_THUMB_COLOR = "#e6e0f1";
const SCHEDULE_CHIP_HEIGHT = 33;
const DURATION_PRESETS = [
  { value: 15, label: "15m" },
  { value: 30, label: "30m" },
  { value: 60, label: "1 h" },
  { value: 120, label: "2 h" },
] as const;
const DURATION_PRESET_VALUES = new Set<number>(
  DURATION_PRESETS.map((option) => option.value),
);
const DEFAULT_DURATION_MINUTES = 60;
const HOUR_VALUES = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTE_VALUES = Array.from({ length: 60 }, (_, index) => index);
const WHEEL_VISIBLE_ROWS = 3;
const WHEEL_SHELL_HEIGHT = 112;
const WHEEL_ITEM_HEIGHT = WHEEL_SHELL_HEIGHT / WHEEL_VISIBLE_ROWS;
const VISIBLE_MONTH_COUNT = 6;
const CALENDAR_MONTH_SCROLL_MAX_HEIGHT = 261;
const TIME_SECTION_LIFT_PX = 0;
const REMINDER_PICKER_OPTIONS = [
  { id: "on-time", label: "On time", offsetMinutes: 0 },
  { id: "5-min", label: "5 minutes early", offsetMinutes: 5 },
  { id: "30-min", label: "30 minutes early", offsetMinutes: 30 },
  { id: "1-hour", label: "1 hour early", offsetMinutes: 60 },
  { id: "1-day", label: "1 day early", offsetMinutes: 24 * 60 },
  { id: "custom", label: "Custom", offsetMinutes: null },
] as const;
const REMINDER_PICKER_ROW_HEIGHT = 44;
const REMINDER_PICKER_MENU_WIDTH = 220;
const REMINDER_PICKER_ESTIMATED_HEIGHT =
  REMINDER_PICKER_OPTIONS.length * REMINDER_PICKER_ROW_HEIGHT + 12;

function fromMinutes(minutes: number | null) {
  if (minutes == null) {
    return { hour12: 9, minute: 0, isPm: false };
  }

  const hours24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const isPm = hours24 >= 12;
  let hour12 = hours24 % 12;
  if (hour12 === 0) hour12 = 12;

  return { hour12, minute, isPm };
}

function toMinutes(hour12: number, minute: number, isPm: boolean) {
  let hours24 = hour12 % 12;
  if (isPm) hours24 += 12;
  return hours24 * 60 + minute;
}

function schedulesEqual(
  left: TaskScheduleSelection,
  right: TaskScheduleSelection,
) {
  return (
    left.dueDate === right.dueDate &&
    left.dueTimeMinutes === right.dueTimeMinutes &&
    left.dueDurationMinutes === right.dueDurationMinutes &&
    (left.dueRepeat ?? "none") === (right.dueRepeat ?? "none") &&
    (left.reminderEnabled ?? false) === (right.reminderEnabled ?? false) &&
    (left.reminderOffsetMinutes ?? 0) === (right.reminderOffsetMinutes ?? 0)
  );
}

function scheduleFromProps(
  value: string | null,
  dueTimeMinutes: number | null,
  dueDurationMinutes: number | null,
  dueRepeat: TaskRepeatOption | null = null,
): TaskScheduleSelection {
  const parsed = parseDateKey(value);
  const timeEnabled = dueTimeMinutes != null;
  const time = fromMinutes(dueTimeMinutes);
  const duration = dueDurationMinutes ?? DEFAULT_DURATION_MINUTES;

  return {
    dueDate: parsed ? toDateKey(parsed) : null,
    dueTimeMinutes: timeEnabled
      ? toMinutes(time.hour12, time.minute, time.isPm)
      : null,
    dueDurationMinutes: timeEnabled ? duration : null,
    dueRepeat: dueRepeat && dueRepeat !== "none" ? dueRepeat : null,
    reminderEnabled: false,
    reminderOffsetMinutes: null,
  };
}

function formatTime12h(hour12: number, minute: number, isPm: boolean) {
  const totalMinutes = toMinutes(hour12, minute, isPm);
  const hours24 = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const date = new Date();
  date.setHours(hours24, mins, 0, 0);

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatScheduleSummary(
  date: Date | null,
  hour12: number,
  minute: number,
  isPm: boolean,
  repeat: RepeatOption,
  timeEnabled: boolean,
) {
  if (!date) return "Select a date";

  const datePart = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (!timeEnabled) {
    if (repeat === "none") {
      return datePart;
    }

    const repeatPart =
      REPEAT_OPTIONS.find((option) => option.id === repeat)?.label ?? "Custom";

    return `${datePart} · ${repeatPart}`;
  }

  const timePart = formatTime12h(hour12, minute, isPm);
  if (repeat === "none") {
    return `${datePart} · ${timePart}`;
  }

  const repeatPart =
    REPEAT_OPTIONS.find((option) => option.id === repeat)?.label ?? "Custom";

  return `${datePart} · ${timePart} · ${repeatPart}`;
}

function isPresetDuration(minutes: number | null) {
  return minutes != null && DURATION_PRESET_VALUES.has(minutes);
}

const REPEAT_CONFIRM_OPTIONS = new Set<RepeatOption>([
  "daily",
  "weekday",
  "weekly",
  "monthly",
]);

function repeatConfirmMessage(option: RepeatOption) {
  switch (option) {
    case "daily":
      return "This task will repeat every day.";
    case "weekday":
      return "This task will repeat every weekday.";
    case "weekly":
      return "This task will repeat every week.";
    case "monthly":
      return "This task will repeat every month.";
    default:
      return "";
  }
}

function getRepeatOptionSubtitle(
  optionId: RepeatOption,
  selectedDate: Date | null,
): string | null {
  if (!selectedDate) return null;

  switch (optionId) {
    case "weekly":
      return selectedDate.toLocaleDateString(undefined, { weekday: "long" });
    case "monthly": {
      const nextMonth = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        selectedDate.getDate(),
      );
      const day = nextMonth.getDate();
      const month = nextMonth.toLocaleDateString(undefined, { month: "short" });
      return `${day}.${month}`;
    }
    case "weekday":
      return "Mon - Fri";
    default:
      return null;
  }
}

function ScheduleToggleSwitch({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.timeToggleSwitchWrap}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: "#e5e7eb",
          true: TIME_PICKER_BLUE,
        }}
        thumbColor="#ffffff"
        ios_backgroundColor="#e5e7eb"
        accessibilityLabel={accessibilityLabel}
        style={styles.timeToggleSwitchScaled}
      />
    </View>
  );
}

function WheelPicker({
  values,
  selectedValue,
  onSelect,
  formatValue,
}: {
  values: number[];
  selectedValue: number;
  onSelect: (value: number) => void;
  formatValue: (value: number) => string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const paddingRows = Math.floor(WHEEL_VISIBLE_ROWS / 2);

  useEffect(() => {
    const index = Math.max(0, values.indexOf(selectedValue));
    scrollRef.current?.scrollTo({
      y: index * WHEEL_ITEM_HEIGHT,
      animated: false,
    });
  }, [selectedValue, values]);

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(
      event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT,
    );
    const clamped = Math.max(0, Math.min(values.length - 1, index));
    onSelect(values[clamped] ?? selectedValue);
  }

  return (
    <View style={styles.wheelShell}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{
          paddingVertical: WHEEL_ITEM_HEIGHT * paddingRows,
        }}
      >
        {values.map((value) => (
          <View key={value} style={styles.wheelItem}>
            <ThemedText style={styles.wheelItemText}>
              {formatValue(value)}
            </ThemedText>
          </View>
        ))}
      </ScrollView>
      <View pointerEvents="none" style={styles.wheelHighlight} />
      <View pointerEvents="none" style={styles.wheelSelectedValue}>
        <Text style={styles.wheelItemTextActive}>
          {formatValue(selectedValue)}
        </Text>
      </View>
    </View>
  );
}

function DurationOptionsRow({
  durationMinutes,
  onSelectPreset,
}: {
  durationMinutes: number | null;
  onSelectPreset: (value: number) => void;
}) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const customActive = !isPresetDuration(durationMinutes);
  const canScroll = contentWidth > viewportWidth + 1;
  const maxScrollX = Math.max(1, contentWidth - viewportWidth);
  const thumbWidth = canScroll
    ? Math.max(
        REPEAT_SCROLL_THUMB_MIN_WIDTH,
        (viewportWidth / contentWidth) * viewportWidth,
      )
    : viewportWidth;
  const thumbOffset = canScroll
    ? (scrollX / maxScrollX) * Math.max(0, viewportWidth - thumbWidth)
    : 0;

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setScrollX(event.nativeEvent.contentOffset.x);
  }

  return (
    <View style={styles.durationSection}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onLayout={(event) => {
          setViewportWidth(event.nativeEvent.layout.width);
        }}
        onContentSizeChange={(width) => {
          setContentWidth(width);
        }}
        contentContainerStyle={styles.durationRow}
      >
        {DURATION_PRESETS.map((option) => {
          const active = durationMinutes === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.durationChip, active && styles.durationChipActive]}
              onPress={() => onSelectPreset(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <ThemedText
                style={[
                  styles.scheduleChipText,
                  active && styles.scheduleChipTextActive,
                ]}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}

        <Pressable
          style={[
            styles.durationChip,
            customActive && styles.durationChipActive,
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: customActive }}
        >
          <ThemedText
            style={[
              styles.scheduleChipText,
              styles.durationCustomChipText,
              customActive && styles.scheduleChipTextActive,
            ]}
          >
            Custom
          </ThemedText>
        </Pressable>
      </ScrollView>

      {canScroll ? (
        <View style={styles.repeatScrollTrack}>
          <View
            style={[
              styles.repeatScrollThumb,
              {
                width: thumbWidth,
                left: thumbOffset,
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

function RepeatOptionsRow({
  options,
  selected,
  selectedDate,
  onSelect,
}: {
  options: { id: RepeatOption; label: string }[];
  selected: RepeatOption;
  selectedDate: Date | null;
  onSelect: (id: RepeatOption) => void;
}) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const canScroll = contentWidth > viewportWidth + 1;
  const maxScrollX = Math.max(1, contentWidth - viewportWidth);
  const thumbWidth = canScroll
    ? Math.max(
        REPEAT_SCROLL_THUMB_MIN_WIDTH,
        (viewportWidth / contentWidth) * viewportWidth,
      )
    : viewportWidth;
  const thumbOffset = canScroll
    ? (scrollX / maxScrollX) * Math.max(0, viewportWidth - thumbWidth)
    : 0;

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setScrollX(event.nativeEvent.contentOffset.x);
  }

  return (
    <View style={styles.repeatSection}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onLayout={(event) => {
          setViewportWidth(event.nativeEvent.layout.width);
        }}
        onContentSizeChange={(width) => {
          setContentWidth(width);
        }}
        contentContainerStyle={styles.repeatRow}
      >
        {options.map((option) => {
          const active = selected === option.id;
          const subtitle = getRepeatOptionSubtitle(option.id, selectedDate);
          return (
            <Pressable
              key={option.id}
              style={[styles.repeatChip, active && styles.repeatChipActive]}
              onPress={() => onSelect(option.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={
                subtitle ? `${option.label}, ${subtitle}` : option.label
              }
            >
              {subtitle ? (
                <View style={styles.repeatChipContent}>
                  <ThemedText
                    style={[
                      styles.repeatChipTextCompact,
                      active && styles.repeatChipTextActive,
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.repeatChipSubtitle,
                      active && styles.repeatChipSubtitleActive,
                    ]}
                  >
                    {subtitle}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText
                  style={[
                    styles.scheduleChipText,
                    active && styles.scheduleChipTextActive,
                  ]}
                >
                  {option.label}
                </ThemedText>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {canScroll ? (
        <View style={styles.repeatScrollTrack}>
          <View
            style={[
              styles.repeatScrollThumb,
              {
                width: thumbWidth,
                left: thumbOffset,
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

export function TaskDatePickerSheet({
  visible,
  value,
  dueTimeMinutes = null,
  dueDurationMinutes = null,
  dueRepeat = null,
  onSelect,
  onClose,
}: TaskDatePickerSheetProps) {
  const insets = useSafeAreaInsets();
  const initialScheduleRef = useRef<TaskScheduleSelection>({
    dueDate: null,
    dueTimeMinutes: null,
    dueDurationMinutes: null,
    dueRepeat: null,
    reminderEnabled: false,
    reminderOffsetMinutes: null,
  });
  const userHasEditedRef = useRef(false);
  const reminderButtonRef = useRef<View>(null);
  const initialTime = fromMinutes(dueTimeMinutes);

  const [monthDate, setMonthDate] = useState(
    () => parseDateKey(value) ?? startOfDay(new Date()),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(() =>
    parseDateKey(value),
  );
  const [hour12, setHour12] = useState(initialTime.hour12);
  const [minute, setMinute] = useState(initialTime.minute);
  const [isPm, setIsPm] = useState(initialTime.isPm);
  const [draftRepeat, setDraftRepeat] = useState<RepeatOption>("none");
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState(0);
  const [reminderPickerAnchor, setReminderPickerAnchor] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [timeEnabled, setTimeEnabled] = useState(dueTimeMinutes != null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(
    dueDurationMinutes ?? DEFAULT_DURATION_MINUTES,
  );

  useEffect(() => {
    if (!visible) {
      userHasEditedRef.current = false;
      return;
    }

    if (userHasEditedRef.current) return;

    const parsed = parseDateKey(value);
    const time = fromMinutes(dueTimeMinutes);
    const nextDuration = dueDurationMinutes ?? DEFAULT_DURATION_MINUTES;

    initialScheduleRef.current = scheduleFromProps(
      value,
      dueTimeMinutes,
      dueDurationMinutes,
      dueRepeat,
    );
    setSelectedDate(parsed);
    setMonthDate(parsed ?? startOfDay(new Date()));
    setHour12(time.hour12);
    setMinute(time.minute);
    setIsPm(time.isPm);
    const nextRepeat =
      dueRepeat && dueRepeat !== "none" ? dueRepeat : ("none" as RepeatOption);
    setDraftRepeat(nextRepeat);
    setRepeatEnabled(nextRepeat !== "none" || dueTimeMinutes != null);
    setReminderEnabled(false);
    setReminderOffsetMinutes(0);
    setReminderPickerAnchor(null);
    setTimeEnabled(dueTimeMinutes != null);
    setDurationMinutes(nextDuration);
  }, [dueDurationMinutes, dueRepeat, dueTimeMinutes, value, visible]);

  const monthSequence = useMemo(
    () =>
      Array.from({ length: VISIBLE_MONTH_COUNT }, (_, index) =>
        startOfDay(
          new Date(monthDate.getFullYear(), monthDate.getMonth() + index, 1),
        ),
      ),
    [monthDate],
  );

  const monthLabel = monthDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const summary = formatScheduleSummary(
    selectedDate,
    hour12,
    minute,
    isPm,
    timeEnabled && draftRepeat !== "none" ? draftRepeat : "none",
    timeEnabled,
  );
  const effectiveRepeat =
    timeEnabled && draftRepeat !== "none" ? draftRepeat : "none";

  function buildScheduleSelection(
    date: Date | null,
    overrides: {
      timeEnabled?: boolean;
      hour12?: number;
      minute?: number;
      isPm?: boolean;
      durationMinutes?: number | null;
      reminderEnabled?: boolean;
      reminderOffsetMinutes?: number | null;
      dueRepeat?: TaskRepeatOption | null;
    } = {},
  ): TaskScheduleSelection {
    const enabled = overrides.timeEnabled ?? timeEnabled;
    const nextHour12 = overrides.hour12 ?? hour12;
    const nextMinute = overrides.minute ?? minute;
    const nextIsPm = overrides.isPm ?? isPm;
    const nextDuration =
      overrides.durationMinutes !== undefined
        ? overrides.durationMinutes
        : durationMinutes;
    const nextReminder =
      overrides.reminderEnabled !== undefined
        ? overrides.reminderEnabled
        : reminderEnabled;
    const nextReminderOffset =
      overrides.reminderOffsetMinutes !== undefined
        ? overrides.reminderOffsetMinutes
        : reminderOffsetMinutes;
    const nextRepeat =
      overrides.dueRepeat !== undefined
        ? overrides.dueRepeat
        : enabled && draftRepeat !== "none"
          ? draftRepeat
          : null;

    return {
      dueDate: date ? toDateKey(date) : null,
      dueTimeMinutes: enabled
        ? toMinutes(nextHour12, nextMinute, nextIsPm)
        : null,
      dueDurationMinutes: enabled ? nextDuration : null,
      dueRepeat: nextRepeat,
      reminderEnabled: enabled ? nextReminder : false,
      reminderOffsetMinutes:
        enabled && nextReminder ? nextReminderOffset : null,
    };
  }

  function commitSchedule(
    date: Date | null = selectedDate,
    overrides: {
      timeEnabled?: boolean;
      hour12?: number;
      minute?: number;
      isPm?: boolean;
      durationMinutes?: number | null;
      reminderEnabled?: boolean;
      reminderOffsetMinutes?: number | null;
      dueRepeat?: TaskRepeatOption | null;
    } = {},
  ) {
    onSelect(buildScheduleSelection(date, overrides));
  }

  function handleTimeToggle(nextEnabled: boolean) {
    markEdited();
    const nextDuration = nextEnabled
      ? (durationMinutes ?? DEFAULT_DURATION_MINUTES)
      : durationMinutes;

    setTimeEnabled(nextEnabled);
    if (nextEnabled) {
      setDurationMinutes((current) => current ?? DEFAULT_DURATION_MINUTES);
      setRepeatEnabled(true);
    } else {
      setReminderEnabled(false);
      setReminderOffsetMinutes(0);
      if (repeatEnabled) {
        setRepeatEnabled(false);
        setDraftRepeat("none");
      }
    }

    commitSchedule(selectedDate, {
      timeEnabled: nextEnabled,
      durationMinutes: nextEnabled ? nextDuration : null,
      reminderEnabled: nextEnabled ? reminderEnabled : false,
      reminderOffsetMinutes: nextEnabled ? undefined : null,
      dueRepeat: nextEnabled ? undefined : null,
    });
  }

  function handleHourSelect(nextHour12: number) {
    markEdited();
    setHour12(nextHour12);
    if (!timeEnabled) return;
    commitSchedule(selectedDate, { hour12: nextHour12 });
  }

  function handleMinuteSelect(nextMinute: number) {
    markEdited();
    setMinute(nextMinute);
    if (!timeEnabled) return;
    commitSchedule(selectedDate, { minute: nextMinute });
  }

  function handleAmPmSelect(nextIsPm: boolean) {
    markEdited();
    setIsPm(nextIsPm);
    if (!timeEnabled) return;
    commitSchedule(selectedDate, { isPm: nextIsPm });
  }

  function selectDurationPreset(nextDuration: number) {
    markEdited();
    setDurationMinutes(nextDuration);
    if (!timeEnabled) return;
    commitSchedule(selectedDate, { durationMinutes: nextDuration });
  }

  function openReminderPicker() {
    reminderButtonRef.current?.measureInWindow((x, y, width, height) => {
      setReminderPickerAnchor({ x, y, width, height });
    });
  }

  function closeReminderPicker() {
    setReminderPickerAnchor(null);
  }

  function selectReminderOption(
    option: (typeof REMINDER_PICKER_OPTIONS)[number],
  ) {
    markEdited();

    if (option.id === "custom") {
      closeReminderPicker();
      Alert.alert(
        "Custom reminder",
        "Custom reminder times are not available yet.",
      );
      return;
    }

    setReminderOffsetMinutes(option.offsetMinutes);
    setReminderEnabled(true);
    closeReminderPicker();
    if (!timeEnabled) return;
    commitSchedule(selectedDate, {
      reminderEnabled: true,
      reminderOffsetMinutes: option.offsetMinutes,
    });
  }

  function applyRepeatSelection(next: RepeatOption) {
    setDraftRepeat(next);
    setRepeatEnabled(true);

    if (!timeEnabled) {
      const nextDuration = durationMinutes ?? DEFAULT_DURATION_MINUTES;
      setTimeEnabled(true);
      setDurationMinutes(nextDuration);
      commitSchedule(selectedDate, {
        timeEnabled: true,
        durationMinutes: nextDuration,
        dueRepeat: next,
      });
      return;
    }

    commitSchedule(selectedDate, { dueRepeat: next });
  }

  function handleRepeatToggle(nextEnabled: boolean) {
    markEdited();
    setRepeatEnabled(nextEnabled);
    if (!nextEnabled) {
      setDraftRepeat("none");
      commitSchedule(selectedDate, { dueRepeat: null });
      return;
    }

    const nextRepeat = draftRepeat !== "none" ? draftRepeat : "daily";
    if (draftRepeat === "none") {
      setDraftRepeat(nextRepeat);
    }

    if (!timeEnabled) {
      const nextDuration = durationMinutes ?? DEFAULT_DURATION_MINUTES;
      setTimeEnabled(true);
      setDurationMinutes(nextDuration);
      commitSchedule(selectedDate, {
        timeEnabled: true,
        durationMinutes: nextDuration,
        dueRepeat: nextRepeat,
      });
      return;
    }

    commitSchedule(selectedDate, { dueRepeat: nextRepeat });
  }

  function handleRepeatSelect(next: RepeatOption) {
    if (next === draftRepeat) return;

    markEdited();

    if (next === "none") {
      setDraftRepeat("none");
      setRepeatEnabled(true);
      commitSchedule(selectedDate, { dueRepeat: null });
      return;
    }

    if (REPEAT_CONFIRM_OPTIONS.has(next)) {
      const label =
        REPEAT_OPTIONS.find((option) => option.id === next)?.label ?? next;
      Alert.alert(
        `Repeat ${label.toLowerCase()}?`,
        repeatConfirmMessage(next),
        [
          { text: "Cancel", style: "cancel" },
          { text: "Confirm", onPress: () => applyRepeatSelection(next) },
        ],
      );
      return;
    }

    applyRepeatSelection(next);
  }

  function handleConfirm() {
    closeReminderPicker();
    commitSchedule(selectedDate);
    onClose();
  }

  function markEdited() {
    userHasEditedRef.current = true;
  }

  function hasPendingChanges() {
    return !schedulesEqual(
      buildScheduleSelection(selectedDate),
      initialScheduleRef.current,
    );
  }

  function requestDismiss() {
    if (reminderPickerAnchor) {
      closeReminderPicker();
      return;
    }

    const hasChanges = userHasEditedRef.current && hasPendingChanges();

    if (!hasChanges) {
      onClose();
      return;
    }

    Alert.alert(
      "Save changes?",
      "You changed the date or time. Save before closing?",
      [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            onSelect(initialScheduleRef.current);
            onClose();
          },
        },
        { text: "Save", onPress: handleConfirm },
      ],
    );
  }

  function handleDaySelect(day: Date) {
    markEdited();
    setSelectedDate(day);
    commitSchedule(day);
  }

  function handleClearSchedule() {
    onClose();
    onSelect({
      dueDate: null,
      dueTimeMinutes: null,
      dueDurationMinutes: null,
      dueRepeat: null,
      reminderEnabled: false,
      reminderOffsetMinutes: null,
    });
  }

  const reminderPickerPosition = reminderPickerAnchor
    ? (() => {
        const windowWidth = Dimensions.get("window").width;
        const top = Math.max(
          insets.top + 8,
          reminderPickerAnchor.y - REMINDER_PICKER_ESTIMATED_HEIGHT - 8,
        );
        const left = Math.min(
          Math.max(8, reminderPickerAnchor.x),
          windowWidth - REMINDER_PICKER_MENU_WIDTH - 8,
        );
        return { top, left };
      })()
    : null;

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={requestDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={requestDismiss} />
        <View
          style={[
            styles.card,
            {
              marginTop: 51,
              marginBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}
        >
          <View style={styles.calendarPane}>
            <View style={styles.header}>
              <Pressable
                style={styles.headerCloseButton}
                onPress={requestDismiss}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <AppSymbol
                  ios="xmark"
                  android="close"
                  size={18}
                  tintColor={CLOSE_ICON_COLOR}
                />
              </Pressable>

              <View style={styles.headerCenter}>
                <ThemedText style={styles.headerSubtitle} numberOfLines={1}>
                  {summary}
                </ThemedText>
              </View>

              <View style={styles.headerSideSpacer} />
            </View>

            <View style={styles.monthHeader}>
              <ThemedText style={styles.monthLabel}>{monthLabel}</ThemedText>
              <View style={styles.monthNavGroup}>
                <Pressable
                  style={styles.monthNavButton}
                  onPress={() =>
                    setMonthDate(
                      startOfDay(
                        new Date(
                          monthDate.getFullYear(),
                          monthDate.getMonth() - 1,
                          1,
                        ),
                      ),
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                >
                  <AppSymbol
                    ios="chevron.left"
                    android="chevron-left"
                    size={MONTH_NAV_ICON_SIZE}
                    tintColor="#c3ccdb"
                  />
                </Pressable>
                <Pressable
                  style={styles.monthNavButton}
                  onPress={() =>
                    setMonthDate(
                      startOfDay(
                        new Date(
                          monthDate.getFullYear(),
                          monthDate.getMonth() + 1,
                          1,
                        ),
                      ),
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                >
                  <AppSymbol
                    ios="chevron.right"
                    android="chevron-right"
                    size={MONTH_NAV_ICON_SIZE}
                    tintColor="#c3ccdb"
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.calendarSection}>
              <View style={styles.weekdayRow}>
                {WEEKDAY_LABELS.map((label, index) => (
                  <ThemedText
                    key={`${label}-${index}`}
                    style={styles.weekdayLabel}
                  >
                    {label}
                  </ThemedText>
                ))}
              </View>

              <ScrollView
                style={styles.monthScroll}
                contentContainerStyle={styles.monthScrollContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
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
                          const inMonth =
                            day.getMonth() === visibleMonth.getMonth();
                          const selected = selectedDate
                            ? isSameDay(day, selectedDate)
                            : false;
                          const repeatOccurrence =
                            inMonth &&
                            selectedDate &&
                            effectiveRepeat !== "none" &&
                            !selected &&
                            matchesRepeatPattern(
                              day,
                              selectedDate,
                              effectiveRepeat,
                            );

                          return (
                            <Pressable
                              key={toDateKey(day)}
                              style={styles.dayCell}
                              onPress={() => handleDaySelect(day)}
                              accessibilityRole="button"
                              accessibilityLabel={day.toLocaleDateString()}
                            >
                              <View style={styles.dayMarker}>
                                {repeatOccurrence ? (
                                  <View style={styles.dayRepeatCircle} />
                                ) : null}
                                {selected ? (
                                  <View style={styles.daySelectedCircle} />
                                ) : null}
                                <ThemedText
                                  style={[
                                    styles.dayNumber,
                                    !inMonth && styles.dayNumberMuted,
                                    repeatOccurrence && styles.dayNumberRepeat,
                                    selected && styles.dayNumberSelected,
                                  ]}
                                >
                                  {day.getDate()}
                                </ThemedText>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <ScrollView
            style={[
              styles.optionsScroll,
              timeEnabled && styles.optionsScrollWithTime,
            ]}
            contentContainerStyle={[
              styles.optionsScrollContent,
              timeEnabled && styles.optionsScrollContentWithTime,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {timeEnabled ? (
              <>
                <View style={styles.timeSection}>
                  <View
                    style={[styles.sectionHeader, styles.timeSectionHeader]}
                  >
                    <IoMdTimeIcon size={16} color="#9ca3af" />
                    <ThemedText style={styles.sectionLabel}>TIME</ThemedText>
                    <View style={styles.timeSectionHeaderSpacer} />
                    <Pressable
                      style={styles.clearTimeButton}
                      onPress={() => handleTimeToggle(false)}
                      accessibilityRole="button"
                      accessibilityLabel="Clear time"
                    >
                      <ThemedText style={styles.clearTimeText}>
                        Clear time
                      </ThemedText>
                      <AppSymbol
                        ios="xmark"
                        android="close"
                        size={12}
                        tintColor={CLOSE_ICON_COLOR}
                      />
                    </Pressable>
                  </View>

                  <View style={styles.timePickerBar}>
                    <View style={styles.timeWheels}>
                      <WheelPicker
                        values={HOUR_VALUES}
                        selectedValue={hour12}
                        onSelect={handleHourSelect}
                        formatValue={(value) => String(value)}
                      />
                      <ThemedText style={styles.timeColon}>:</ThemedText>
                      <WheelPicker
                        values={MINUTE_VALUES}
                        selectedValue={minute}
                        onSelect={handleMinuteSelect}
                        formatValue={(value) => String(value).padStart(2, "0")}
                      />
                    </View>

                    <View style={styles.ampmColumn}>
                      <Pressable
                        style={[
                          styles.ampmButton,
                          !isPm && styles.ampmButtonActive,
                        ]}
                        onPress={() => handleAmPmSelect(false)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: !isPm }}
                      >
                        <ThemedText
                          style={[
                            styles.ampmText,
                            !isPm && styles.ampmTextActive,
                          ]}
                        >
                          AM
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.ampmButton,
                          isPm && styles.ampmButtonActive,
                        ]}
                        onPress={() => handleAmPmSelect(true)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isPm }}
                      >
                        <ThemedText
                          style={[
                            styles.ampmText,
                            isPm && styles.ampmTextActive,
                          ]}
                        >
                          PM
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View
                  style={[styles.sectionHeader, styles.durationSectionHeader]}
                >
                  <IoTimerOutlineIcon size={16} color="#9ca3af" />
                  <ThemedText style={styles.sectionLabel}>DURATION</ThemedText>
                </View>

                <DurationOptionsRow
                  durationMinutes={durationMinutes}
                  onSelectPreset={selectDurationPreset}
                />

                <View ref={reminderButtonRef} collapsable={false}>
                  <Pressable
                    style={styles.reminderButton}
                    onPress={openReminderPicker}
                    accessibilityRole="button"
                    accessibilityLabel="Reminder"
                    accessibilityState={{ selected: reminderEnabled }}
                  >
                    <View
                      style={[
                        styles.reminderIconCircle,
                        reminderEnabled && styles.reminderIconCircleActive,
                      ]}
                    >
                      <TimeReminderIcon
                        size={14}
                        color={reminderEnabled ? "#ffffff" : "#393939"}
                      />
                    </View>
                    <ThemedText
                      style={[
                        styles.reminderButtonText,
                        (reminderEnabled || reminderPickerAnchor) &&
                          styles.reminderButtonTextActive,
                      ]}
                    >
                      Reminder
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={[styles.timeToggleRow, styles.timeOffToggleRow]}>
                <View style={styles.timeToggleLeft}>
                  <IoMdTimeIcon size={16} color="#9ca3af" />
                  <ThemedText style={styles.timeToggleLabel}>TIME</ThemedText>
                  <ThemedText style={styles.timeToggleStatus}>
                    Not set
                  </ThemedText>
                </View>
                <ScheduleToggleSwitch
                  value={timeEnabled}
                  onValueChange={handleTimeToggle}
                  accessibilityLabel="Set time"
                />
              </View>
            )}

            <View style={styles.sectionDivider} />

            {timeEnabled ? (
              <>
                <View
                  style={[styles.sectionHeader, styles.repeatSectionHeader]}
                >
                  <AppSymbol
                    ios="arrow.triangle.2.circlepath"
                    android="repeat"
                    size={16}
                    tintColor="#9ca3af"
                  />
                  <ThemedText style={styles.sectionLabel}>REPEAT</ThemedText>
                </View>

                <RepeatOptionsRow
                  options={REPEAT_OPTIONS}
                  selected={draftRepeat}
                  selectedDate={selectedDate}
                  onSelect={handleRepeatSelect}
                />
              </>
            ) : (
              <View style={[styles.timeToggleRow, styles.repeatOffToggleRow]}>
                <View style={styles.timeToggleLeft}>
                  <AppSymbol
                    ios="arrow.triangle.2.circlepath"
                    android="repeat"
                    size={16}
                    tintColor="#9ca3af"
                  />
                  <ThemedText style={styles.timeToggleLabel}>REPEAT</ThemedText>
                  <ThemedText style={styles.timeToggleStatus}>
                    Not set
                  </ThemedText>
                </View>
                <ScheduleToggleSwitch
                  value={repeatEnabled}
                  onValueChange={handleRepeatToggle}
                  accessibilityLabel="Set repeat"
                />
              </View>
            )}

            <View style={styles.footerActions}>
              <View style={styles.footerActionsLeft}>
                {selectedDate ? (
                  <Pressable
                    style={styles.clearScheduleButton}
                    onPress={handleClearSchedule}
                    accessibilityRole="button"
                    accessibilityLabel="Clear date and time"
                  >
                    <ThemedText style={styles.clearScheduleButtonText}>
                      Clear
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                style={styles.footerConfirmButton}
                onPress={handleConfirm}
                accessibilityRole="button"
                accessibilityLabel="Confirm"
              >
                <AppSymbol
                  ios="checkmark"
                  android="check"
                  size={16}
                  tintColor="#ffffff"
                />
              </Pressable>
            </View>
          </ScrollView>
        </View>

        {reminderPickerAnchor && reminderPickerPosition ? (
          <View style={styles.reminderPickerOverlay} pointerEvents="box-none">
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={closeReminderPicker}
              accessibilityRole="button"
              accessibilityLabel="Dismiss reminder options"
            />
            <View
              style={[
                styles.reminderPickerMenu,
                {
                  top: reminderPickerPosition.top,
                  left: reminderPickerPosition.left,
                  width: REMINDER_PICKER_MENU_WIDTH,
                },
              ]}
            >
              {REMINDER_PICKER_OPTIONS.map((option) => {
                const selected =
                  reminderEnabled &&
                  option.offsetMinutes != null &&
                  option.offsetMinutes === reminderOffsetMinutes;

                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    onPress={() => selectReminderOption(option)}
                    style={({ pressed }) => [
                      styles.reminderPickerRow,
                      (pressed || selected) && styles.reminderPickerRowPressed,
                    ]}
                  >
                    <ThemedText style={styles.reminderPickerRowLabel}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.three - 4,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    maxHeight: "90%",
    overflow: "hidden",
  },
  calendarPane: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  optionsScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  optionsScrollWithTime: {
    marginTop: -TIME_SECTION_LIFT_PX,
  },
  optionsScrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  optionsScrollContentWithTime: {
    paddingTop: TIME_SECTION_LIFT_PX,
  },
  cardContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.two,
  },
  headerSideButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f4f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: HEADER_CORNER_INSET - Spacing.three,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.one,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
  },
  headerSideSpacer: {
    width: 36,
    height: 36,
    marginRight: HEADER_CORNER_INSET - Spacing.three,
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.two,
  },
  footerActionsLeft: {
    minHeight: 33,
    justifyContent: "center",
  },
  footerConfirmButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.one,
  },
  monthLabel: {
    fontSize: 19,
    fontWeight: "700",
    color: MONTH_LABEL_COLOR,
    marginTop: -12,
  },
  monthNavGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 10,
  },
  monthNavButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarSection: {
    marginHorizontal: -3,
  },
  monthScroll: {
    maxHeight: CALENDAR_MONTH_SCROLL_MAX_HEIGHT,
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
    color: MONTH_LABEL_COLOR,
    marginBottom: Spacing.one,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: Spacing.half,
  },
  weekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: "#9ca3af",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: Spacing.one,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayMarker: {
    width: DAY_SELECTION_CIRCLE_SIZE,
    height: DAY_SELECTION_CIRCLE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  daySelectedCircle: {
    ...StyleSheet.absoluteFill,
    borderRadius: DAY_SELECTION_CIRCLE_SIZE / 2,
    backgroundColor: ACCENT,
  },
  dayRepeatCircle: {
    ...StyleSheet.absoluteFill,
    borderRadius: DAY_SELECTION_CIRCLE_SIZE / 2,
    backgroundColor: "rgba(135, 161, 203, 0.28)",
  },
  dayNumber: {
    width: DAY_SELECTION_CIRCLE_SIZE,
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
    lineHeight: DAY_SELECTION_CIRCLE_SIZE,
  },
  dayNumberMuted: {
    color: "#d1d5db",
  },
  dayNumberRepeat: {
    color: ACCENT,
    fontWeight: "600",
  },
  dayNumberSelected: {
    color: "#ffffff",
    fontWeight: "700",
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e5e7eb",
    marginTop: Spacing.one,
    marginBottom: Spacing.one,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: Spacing.one,
  },
  timeSection: {
    marginTop: -2,
  },
  timeSectionHeader: {
    marginBottom: Spacing.one,
  },
  timeSectionHeaderSpacer: {
    flex: 1,
  },
  clearTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 8,
  },
  clearTimeText: {
    fontSize: 13,
    fontWeight: "500",
    color: TIME_TOGGLE_STATUS_COLOR,
  },
  timeToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 14,
    height: TIME_TOGGLE_ROW_HEIGHT,
  },
  timeOffToggleRow: {
    marginTop: 0,
    paddingTop: 6,
    paddingBottom: 6,
  },
  repeatOffToggleRow: {
    paddingTop: 6,
  },
  timeToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    width: 30,
    height: TIME_TOGGLE_ROW_HEIGHT,
  },
  timeToggleSwitchWrap: {
    width: TIME_TOGGLE_SWITCH_WIDTH,
    height: TIME_TOGGLE_SWITCH_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },
  timeToggleSwitchScaled: {
    transform: [
      {
        scaleX: TIME_TOGGLE_SWITCH_WIDTH / TIME_TOGGLE_SWITCH_BASE.width,
      },
      {
        scaleY: TIME_TOGGLE_SWITCH_HEIGHT / TIME_TOGGLE_SWITCH_BASE.height,
      },
    ],
  },
  timeToggleLabel: {
    fontSize: 12,
    lineHeight: TIME_TOGGLE_ROW_HEIGHT,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: TIME_TOGGLE_LABEL_COLOR,
  },
  timeToggleStatus: {
    fontSize: 10.5,
    lineHeight: TIME_TOGGLE_ROW_HEIGHT,
    fontWeight: "400",
    color: TIME_TOGGLE_STATUS_COLOR,
  },
  durationSectionHeader: {
    marginTop: Spacing.two - 2,
  },
  repeatSectionHeader: {
    paddingTop: 3,
    marginBottom: Spacing.one + 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#9ca3af",
  },
  timePickerBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TIME_PICKER_BAR_BG,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  timeWheels: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },
  timeColon: {
    fontSize: 21.5,
    fontWeight: "500",
    color: "#475569",
    marginHorizontal: 2,
    lineHeight: WHEEL_ITEM_HEIGHT,
    textAlign: "center",
  },
  wheelShell: {
    width: 72,
    height: WHEEL_SHELL_HEIGHT,
    overflow: "hidden",
    position: "relative",
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  wheelItemText: {
    width: "100%",
    fontSize: 19,
    fontWeight: "500",
    color: "#cbd5e1",
    textAlign: "center",
    lineHeight: WHEEL_ITEM_HEIGHT,
  },
  wheelItemTextActive: {
    color: "#393939",
    fontWeight: "500",
    fontSize: 18.5,
    textAlign: "center",
    lineHeight: WHEEL_ITEM_HEIGHT,
  },
  wheelHighlight: {
    position: "absolute",
    left: 2,
    right: 2,
    top: WHEEL_ITEM_HEIGHT,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    shadowColor: "#64748b",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  wheelSelectedValue: {
    position: "absolute",
    left: 2,
    right: 2,
    top: WHEEL_ITEM_HEIGHT,
    height: WHEEL_ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  ampmColumn: {
    gap: 8,
    marginLeft: Spacing.two,
  },
  ampmButton: {
    minWidth: 54,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "#e8edf3",
    alignItems: "center",
  },
  ampmButtonActive: {
    backgroundColor: TIME_PICKER_BLUE,
  },
  ampmText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  ampmTextActive: {
    color: "#ffffff",
  },
  durationSection: {
    gap: 8,
  },
  durationRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 2,
  },
  durationChip: {
    flexShrink: 0,
    height: SCHEDULE_CHIP_HEIGHT,
    paddingHorizontal: 17,
    borderRadius: 999,
    backgroundColor: TIME_PICKER_BAR_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  durationChipActive: {
    backgroundColor: TIME_PICKER_BLUE,
  },
  scheduleChipText: {
    fontSize: 13.5,
    lineHeight: 15,
    fontWeight: "500",
    color: "#393939",
  },
  durationCustomChipText: {
    fontSize: 12.5,
    lineHeight: 14,
  },
  scheduleChipTextActive: {
    color: "#ffffff",
  },
  reminderButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 6,
    marginLeft: 6,
  },
  reminderIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#babfdb",
    borderStyle: "dashed",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  reminderIconCircleActive: {
    backgroundColor: TIME_PICKER_BLUE,
    borderColor: TIME_PICKER_BLUE,
    borderStyle: "solid",
  },
  reminderButtonText: {
    fontSize: 13.5,
    lineHeight: 15,
    fontWeight: "400",
    marginTop: 1,
    color: "#383848",
  },
  reminderButtonTextActive: {
    color: TIME_PICKER_BLUE,
  },
  reminderPickerOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  reminderPickerMenu: {
    position: "absolute",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  reminderPickerRow: {
    minHeight: REMINDER_PICKER_ROW_HEIGHT,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  reminderPickerRowPressed: {
    backgroundColor: "#f4f4f5",
  },
  reminderPickerRowLabel: {
    fontSize: 16,
    color: "#393939",
    fontWeight: "400",
  },
  repeatSection: {
    gap: 8,
  },
  repeatRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 2,
  },
  repeatScrollTrack: {
    height: REPEAT_SCROLL_TRACK_HEIGHT,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  repeatScrollThumb: {
    position: "absolute",
    top: 0,
    height: REPEAT_SCROLL_TRACK_HEIGHT,
    borderRadius: 999,
    backgroundColor: SCHEDULE_SCROLL_THUMB_COLOR,
  },
  repeatChip: {
    flexShrink: 0,
    height: SCHEDULE_CHIP_HEIGHT,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: TIME_PICKER_BAR_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  repeatChipActive: {
    backgroundColor: TIME_PICKER_BLUE,
  },
  repeatChipContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  repeatChipTextCompact: {
    fontSize: 11.5,
    lineHeight: 12,
    fontWeight: "500",
    color: "#393939",
    textAlign: "center",
    marginTop: 2,
  },
  repeatChipSubtitle: {
    fontSize: 7,
    lineHeight: 8,
    fontWeight: "400",
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 1,
  },
  repeatChipTextActive: {
    color: "#ffffff",
  },
  repeatChipSubtitleActive: {
    color: "rgba(255,255,255,0.85)",
  },
  clearScheduleButton: {
    borderRadius: 10,
    backgroundColor: "#b5b5d0",
    width: 76,
    height: 33,
    alignItems: "center",
    justifyContent: "center",
  },
  clearScheduleButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
