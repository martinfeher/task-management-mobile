import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppSymbol } from "@/components/app-symbol";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import {
  getMonthGrid,
  isSameDay,
  parseDateKey,
  startOfDay,
  toDateKey,
} from "@/lib/task-dates";

export type TaskScheduleSelection = {
  dueDate: string | null;
  dueTimeMinutes: number | null;
  dueDurationMinutes: number | null;
};

type TaskDatePickerSheetProps = {
  visible: boolean;
  value: string | null;
  dueTimeMinutes?: number | null;
  dueDurationMinutes?: number | null;
  onSelect: (selection: TaskScheduleSelection) => void;
  onClose: () => void;
};

type RepeatOption = "none" | "daily" | "weekly" | "monthly";


const ACCENT = "#87a1cb";
// const ACCENT = "#8caacf";
// const ACCENT = "#88a4c8";
// const ACCENT = "#7a94b4";
const TIME_PICKER_BLUE = "#8095be";
// const TIME_PICKER_BLUE = "#85b6bc";
// const TIME_PICKER_BLUE = "#85a6c9";
/** #6d8eb5 adjusted +23% lightness, −20% saturation (HSL) */
const TIME_PICKER_WHEEL_BORDER = "#cedeee";
const TIME_PICKER_BAR_BG = "#eef3f8";
const DAY_SELECTION_CIRCLE_SIZE = 36;
const MONTH_NAV_ICON_SIZE = 21;
/** #111827 lightened 15% toward white */
const MONTH_LABEL_COLOR = "#3c4351";
/** #374151 lightened 15% toward white */
const CLOSE_ICON_COLOR = "#6f7c8d";
const HEADER_CORNER_INSET = Spacing.two;
const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const REPEAT_OPTIONS: { id: RepeatOption; label: string }[] = [
  { id: "none", label: "Once" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];
const HOUR_VALUES = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTE_VALUES = Array.from({ length: 60 }, (_, index) => index);
const WHEEL_ITEM_HEIGHT = 44;
const WHEEL_VISIBLE_ROWS = 3;

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
) {
  if (!date) return "Select a date";

  const datePart = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timePart = formatTime12h(hour12, minute, isPm);
  const repeatPart =
    REPEAT_OPTIONS.find((option) => option.id === repeat)?.label ?? "Once";

  return `${datePart} · ${timePart} · ${repeatPart}`;
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
    const index = Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);
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
        }}>
        {values.map((value) => {
          const active = value === selectedValue;
          return (
            <View key={value} style={styles.wheelItem}>
              <ThemedText style={[styles.wheelItemText, active && styles.wheelItemTextActive]}>
                {formatValue(value)}
              </ThemedText>
            </View>
          );
        })}
      </ScrollView>
      <View pointerEvents="none" style={styles.wheelHighlight} />
    </View>
  );
}

export function TaskDatePickerSheet({
  visible,
  value,
  dueTimeMinutes = null,
  dueDurationMinutes = null,
  onSelect,
  onClose,
}: TaskDatePickerSheetProps) {
  const insets = useSafeAreaInsets();
  const initialTime = fromMinutes(dueTimeMinutes);

  const [monthDate, setMonthDate] = useState(() => parseDateKey(value) ?? startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => parseDateKey(value));
  const [hour12, setHour12] = useState(initialTime.hour12);
  const [minute, setMinute] = useState(initialTime.minute);
  const [isPm, setIsPm] = useState(initialTime.isPm);
  const [draftRepeat, setDraftRepeat] = useState<RepeatOption>("none");

  useEffect(() => {
    if (!visible) return;

    const parsed = parseDateKey(value);
    const time = fromMinutes(dueTimeMinutes);
    setSelectedDate(parsed);
    setMonthDate(parsed ?? startOfDay(new Date()));
    setHour12(time.hour12);
    setMinute(time.minute);
    setIsPm(time.isPm);
    setDraftRepeat("none");
  }, [dueTimeMinutes, value, visible]);

  const monthDays = useMemo(
    () => getMonthGrid(monthDate.getFullYear(), monthDate.getMonth()),
    [monthDate],
  );

  const monthLabel = monthDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const summary = formatScheduleSummary(selectedDate, hour12, minute, isPm, draftRepeat);

  function handleConfirm() {
    onSelect({
      dueDate: selectedDate ? toDateKey(selectedDate) : null,
      dueTimeMinutes: toMinutes(hour12, minute, isPm),
      dueDurationMinutes,
    });
    onClose();
  }

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.card, { marginBottom: Math.max(insets.bottom, Spacing.three) }]}>
          <View style={styles.header}>
            <Pressable
              style={styles.headerCloseButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close">
              <AppSymbol ios="xmark" android="close" size={18} tintColor={CLOSE_ICON_COLOR} />
            </Pressable>

            <View style={styles.headerCenter}>
              <ThemedText style={styles.headerTitle}>Set date & time</ThemedText>
              <ThemedText style={styles.headerSubtitle} numberOfLines={1}>
                {summary}
              </ThemedText>
            </View>

            <Pressable
              style={styles.confirmButton}
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel="Confirm">
              <AppSymbol ios="checkmark" android="check" size={16} tintColor="#ffffff" />
            </Pressable>
          </View>

          <View style={styles.monthHeader}>
            <ThemedText style={styles.monthLabel}>{monthLabel}</ThemedText>
            <View style={styles.monthNavGroup}>
              <Pressable
                style={styles.monthNavButton}
                onPress={() =>
                  setMonthDate(
                    startOfDay(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Previous month">
                <AppSymbol ios="chevron.left" android="chevron-left" size={MONTH_NAV_ICON_SIZE} tintColor="#c3ccdb" />
                {/* <AppSymbol ios="chevron.left" android="chevron-left" size={MONTH_NAV_ICON_SIZE} tintColor="#9ca3af" /> */}
              </Pressable>
              <Pressable
                style={styles.monthNavButton}
                onPress={() =>
                  setMonthDate(
                    startOfDay(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Next month">
                <AppSymbol
                  ios="chevron.right"
                  android="chevron-right"
                  size={MONTH_NAV_ICON_SIZE}
                  tintColor="#c3ccdb"
                  // tintColor="#9ca3af"
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label, index) => (
              <ThemedText key={`${label}-${index}`} style={styles.weekdayLabel}>
                {label}
              </ThemedText>
            ))}
          </View>

          <View style={styles.monthGrid}>
            {monthDays.map((day) => {
              const inMonth = day.getMonth() === monthDate.getMonth();
              const selected = selectedDate ? isSameDay(day, selectedDate) : false;

              return (
                <Pressable
                  key={toDateKey(day)}
                  style={styles.dayCell}
                  onPress={() => setSelectedDate(day)}
                  accessibilityRole="button"
                  accessibilityLabel={day.toLocaleDateString()}>
                  <View style={styles.dayMarker}>
                    {selected ? <View style={styles.daySelectedCircle} /> : null}
                    <ThemedText
                      style={[
                        styles.dayNumber,
                        !inMonth && styles.dayNumberMuted,
                        selected && styles.dayNumberSelected,
                      ]}>
                      {day.getDate()}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.sectionHeader, styles.timeSectionHeader]}>
            <AppSymbol ios="clock" android="schedule" size={16} tintColor="#9ca3af" />
            <ThemedText style={styles.sectionLabel}>TIME</ThemedText>
          </View>

          <View style={styles.timePickerBar}>
            <View style={styles.timeWheels}>
              <WheelPicker
                values={HOUR_VALUES}
                selectedValue={hour12}
                onSelect={setHour12}
                formatValue={(value) => String(value)}
              />
              <ThemedText style={styles.timeColon}>:</ThemedText>
              <WheelPicker
                values={MINUTE_VALUES}
                selectedValue={minute}
                onSelect={setMinute}
                formatValue={(value) => String(value).padStart(2, "0")}
              />
            </View>

            <View style={styles.ampmColumn}>
              <Pressable
                style={[styles.ampmButton, !isPm && styles.ampmButtonActive]}
                onPress={() => setIsPm(false)}
                accessibilityRole="button"
                accessibilityState={{ selected: !isPm }}>
                <ThemedText style={[styles.ampmText, !isPm && styles.ampmTextActive]}>AM</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.ampmButton, isPm && styles.ampmButtonActive]}
                onPress={() => setIsPm(true)}
                accessibilityRole="button"
                accessibilityState={{ selected: isPm }}>
                <ThemedText style={[styles.ampmText, isPm && styles.ampmTextActive]}>PM</ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionDivider} />

          <View style={[styles.sectionHeader, styles.repeatSectionHeader]}>
            <AppSymbol
              ios="arrow.triangle.2.circlepath"
              android="repeat"
              size={16}
              tintColor="#9ca3af"
            />
            <ThemedText style={styles.sectionLabel}>REPEAT</ThemedText>
          </View>

          <View style={styles.repeatRow}>
            {REPEAT_OPTIONS.map((option) => {
              const active = draftRepeat === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.repeatChip, active && styles.repeatChipActive]}
                  onPress={() => setDraftRepeat(option.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}>
                  <ThemedText
                    style={[styles.repeatChipText, active && styles.repeatChipTextActive]}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    alignItems: "center",
    justifyContent: "center",
    marginLeft: HEADER_CORNER_INSET - Spacing.three,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.one,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
  },
  confirmButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  },
  monthNavGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  monthNavButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
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
    gap: 8,
    marginBottom: Spacing.one,
  },
  timeSectionHeader: {
    marginTop: 0,
    // marginTop: Spacing.two * 0.3,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  timeWheels: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  timeColon: {
    fontSize: 30,
    fontWeight: "600",
    color: "#64748b",
    marginHorizontal: 2,
    lineHeight: WHEEL_ITEM_HEIGHT,
    textAlign: "center",
  },
  wheelShell: {
    width: 68,
    height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS,
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
    fontSize: 24,
    fontWeight: "500",
    color: "#cbd5e1",
    textAlign: "center",
    lineHeight: WHEEL_ITEM_HEIGHT,
  },
  wheelItemTextActive: {
    color: "#1e293b",
    fontWeight: "700",
  },
  wheelHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: WHEEL_ITEM_HEIGHT,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: TIME_PICKER_WHEEL_BORDER,
    backgroundColor: "transparent",
  },
  ampmColumn: {
    gap: 6,
    marginLeft: Spacing.two,
  },
  ampmButton: {
    minWidth: 54,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#dfe6ef",
    alignItems: "center",
  },
  ampmButtonActive: {
    backgroundColor: TIME_PICKER_BLUE,
  },
  ampmText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },
  ampmTextActive: {
    color: "#ffffff",
  },
  repeatRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  repeatChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  repeatChipActive: {
    backgroundColor: ACCENT,
  },
  repeatChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  repeatChipTextActive: {
    color: "#ffffff",
  },
});
