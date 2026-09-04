import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AppSymbol } from "@/components/app-symbol";
import { ThemedText } from "@/components/themed-text";
import { TASK_PRIORITY_OPTIONS } from "@/components/task-context-menu";

type TaskPriorityFlagPopupProps = {
  selected: number | null;
  onSelect: (priority: number | null) => void;
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
  /** When true, only renders the card (backdrop handled by parent). */
  embedded?: boolean;
};

const NONE_FLAG_COLOR = "#9ca3af";

export function getTaskPriorityColor(priority: number | null) {
  if (priority == null) return NONE_FLAG_COLOR;
  return (
    TASK_PRIORITY_OPTIONS.find((option) => option.level === priority)?.color ??
    NONE_FLAG_COLOR
  );
}

function PriorityFlagOption({
  label,
  selected,
  onPress,
  tintColor,
  filled = true,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  tintColor: string;
  filled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.flagSlot}>
      <AppSymbol
        ios={filled ? "flag.fill" : "flag"}
        android={filled ? "flag" : "outlined-flag"}
        size={22}
        tintColor={tintColor}
      />
      {selected ? (
        <View style={styles.checkmarkBadge}>
          <AppSymbol
            ios="checkmark"
            android="check"
            size={9}
            weight="bold"
            tintColor="#2563eb"
          />
        </View>
      ) : null}
    </Pressable>
  );
}

export function TaskPriorityFlagPopup({
  selected,
  onSelect,
  onClose,
  style,
  embedded = false,
}: TaskPriorityFlagPopupProps) {
  const card = (
    <View style={[styles.popup, style]}>
      <ThemedText style={styles.label}>Priority</ThemedText>

      <View style={styles.row}>
        {TASK_PRIORITY_OPTIONS.map((option) => (
          <PriorityFlagOption
            key={option.level}
            label={option.label}
            selected={selected === option.level}
            onPress={() => onSelect(option.level)}
            tintColor={option.color}
          />
        ))}
        <PriorityFlagOption
          label="No priority flag"
          selected={selected == null}
          onPress={() => onSelect(null)}
          tintColor={NONE_FLAG_COLOR}
          filled={false}
        />
      </View>

      <View style={styles.divider} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Clear priority"
        onPress={() => onSelect(null)}
        style={({ pressed }) => [styles.noneRow, pressed && styles.noneRowPressed]}>
        <ThemedText style={styles.noneText}>None</ThemedText>
      </Pressable>
    </View>
  );

  if (embedded) {
    return card;
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss priority menu"
      />
      {card}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  popup: {
    position: "absolute",
    minWidth: 196,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  label: {
    fontSize: 14,
    color: "#9ca3af",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingHorizontal: 2,
  },
  flagSlot: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  checkmarkBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e5e7eb",
    marginTop: 10,
    marginBottom: 2,
  },
  noneRow: {
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  noneRowPressed: {
    opacity: 0.65,
  },
  noneText: {
    fontSize: 16,
    color: "#374151",
  },
});
