import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { TASK_PRIORITY_OPTIONS } from "@/components/task-context-menu";

type TaskPriorityPickerProps = {
  selected: number | null;
  onSelect: (priority: number | null) => void;
};

export function TaskPriorityPicker({
  selected,
  onSelect,
}: TaskPriorityPickerProps) {
  return (
    <View style={styles.block}>
      <ThemedText style={styles.label}>Priority</ThemedText>
      <View style={styles.row}>
        {TASK_PRIORITY_OPTIONS.map((option) => {
          const isSelected = selected === option.level;
          return (
            <Pressable
              key={option.level}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              onPress={() => onSelect(option.level)}
              style={[
                styles.dot,
                { backgroundColor: option.color },
                isSelected && styles.dotSelected,
              ]}
            />
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear priority"
          onPress={() => onSelect(null)}
          style={[styles.clear, selected == null && styles.dotSelected]}>
          <ThemedText style={styles.clearText}>×</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
  },
  label: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  dotSelected: {
    borderWidth: 2,
    borderColor: "#111827",
  },
  clear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#eef0f3",
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: {
    fontSize: 18,
    color: "#9ca3af",
    lineHeight: 20,
  },
});
