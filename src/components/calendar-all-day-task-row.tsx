import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  getCalendarTaskBackgroundColor,
  getCalendarTaskTitleColor,
} from "@/lib/calendar-colors";
import { CALENDAR_ALL_DAY_TASK_HEIGHT } from "@/lib/calendar-all-day";
import type { TaskItem } from "@/types/todo";

type CalendarAllDayTaskRowProps = {
  task: TaskItem;
  onPress: () => void;
};

export function CalendarAllDayTaskRow({
  task,
  onPress,
}: CalendarAllDayTaskRowProps) {
  const backgroundColor = getCalendarTaskBackgroundColor(task.calendarColor);
  const titleColor = getCalendarTaskTitleColor(backgroundColor);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={task.name}
      style={({ pressed }) => [
        styles.taskRow,
        { backgroundColor },
        pressed && styles.taskRowPressed,
      ]}
    >
      <ThemedText
        style={[styles.taskTitle, { color: titleColor }]}
        numberOfLines={1}
      >
        {task.name}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  taskRow: {
    minHeight: CALENDAR_ALL_DAY_TASK_HEIGHT,
    borderRadius: 8,
    paddingHorizontal: 5,
    justifyContent: "center",
  },
  taskRowPressed: {
    opacity: 0.85,
  },
  taskTitle: {
    fontSize: 12.5,
    fontWeight: "500",
  },
});
