import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";

export type CalendarViewMode = "day" | "threeDay" | "week" | "month";

export const CALENDAR_VIEW_OPTIONS: {
  id: CalendarViewMode;
  label: string;
  description: string;
}[] = [
  { id: "day", label: "Day", description: "Single day time grid" },
  { id: "threeDay", label: "3-Day", description: "Three day time grid" },
  { id: "week", label: "Week", description: "Seven day time grid" },
  { id: "month", label: "Month", description: "Month overview" },
];

type CalendarViewPickerSheetProps = {
  visible: boolean;
  activeView: CalendarViewMode;
  onSelectView: (view: CalendarViewMode) => void;
  onClose: () => void;
};

export function CalendarViewPickerSheet({
  visible,
  activeView,
  onSelectView,
  onClose,
}: CalendarViewPickerSheetProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <ThemedText style={styles.title}>Calendar view</ThemedText>
        {CALENDAR_VIEW_OPTIONS.map((option) => {
          const selected = activeView === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                onSelectView(option.id);
                onClose();
              }}
              style={[styles.option, selected && styles.optionSelected]}>
              <ThemedText style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {option.label}
              </ThemedText>
              <ThemedText style={styles.optionDescription}>{option.description}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  sheet: {
    position: "absolute",
    left: 20,
    right: 20,
    top: "22%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
    color: "#111827",
  },
  option: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
  },
  optionSelected: {
    backgroundColor: "#e8f2fc",
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  optionLabelSelected: {
    color: "#2563eb",
  },
  optionDescription: {
    marginTop: 2,
    fontSize: 13,
    color: "#6b7280",
  },
});
