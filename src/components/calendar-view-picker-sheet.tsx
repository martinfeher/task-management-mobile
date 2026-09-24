import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";

export type CalendarViewMode = "day" | "threeDay" | "week" | "month";

export type CalendarViewPickerAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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

const POPUP_WIDTH = 280;
const POPUP_GAP = 10;
const POPUP_MAX_HEIGHT = 420;
const SCREEN_INSET = 12;

type CalendarViewPickerSheetProps = {
  visible: boolean;
  activeView: CalendarViewMode;
  isUpcomingActive?: boolean;
  anchor: CalendarViewPickerAnchor | null;
  onSelectView: (view: CalendarViewMode) => void;
  onSelectUpcoming: () => void;
  onClose: () => void;
};

function getPopupStyle(anchor: CalendarViewPickerAnchor) {
  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
  const anchorRight = anchor.x + anchor.width;
  const right = Math.max(
    SCREEN_INSET,
    windowWidth - anchorRight,
  );
  const bottom = Math.max(
    SCREEN_INSET,
    windowHeight - anchor.y + POPUP_GAP,
  );

  return {
    right,
    bottom,
    width: POPUP_WIDTH,
    maxHeight: Math.min(
      POPUP_MAX_HEIGHT,
      anchor.y - POPUP_GAP - SCREEN_INSET,
    ),
  };
}

export function CalendarViewPickerSheet({
  visible,
  activeView,
  isUpcomingActive = false,
  anchor,
  onSelectView,
  onSelectUpcoming,
  onClose,
}: CalendarViewPickerSheetProps) {
  if (!anchor) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.popup, getPopupStyle(anchor)]}>
        <ThemedText style={styles.title}>Calendar view</ThemedText>
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isUpcomingActive }}
            onPress={() => {
              onSelectUpcoming();
              onClose();
            }}
            style={[styles.option, isUpcomingActive && styles.optionSelected]}
          >
            <ThemedText
              style={[
                styles.optionLabel,
                isUpcomingActive && styles.optionLabelSelected,
              ]}
            >
              Upcoming
            </ThemedText>
            <ThemedText style={styles.optionDescription}>
              Overdue, today, and scheduled days
            </ThemedText>
          </Pressable>
          {CALENDAR_VIEW_OPTIONS.map((option) => {
            const selected = !isUpcomingActive && activeView === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  onSelectView(option.id);
                  onClose();
                }}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <ThemedText
                  style={[styles.optionLabel, selected && styles.optionLabelSelected]}
                >
                  {option.label}
                </ThemedText>
                <ThemedText style={styles.optionDescription}>
                  {option.description}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  popup: {
    position: "absolute",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOpacity: 0.16,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 12,
      },
      default: {
        boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.14)",
      },
    }),
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
    paddingHorizontal: 2,
    color: "#111827",
  },
  option: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f9fafb",
    marginBottom: 6,
  },
  optionSelected: {
    backgroundColor: "#e8f2fc",
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  optionLabelSelected: {
    color: "#2563eb",
  },
  optionDescription: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
  },
});
