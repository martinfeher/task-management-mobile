import { AppSymbol } from "@/components/app-symbol";
import { FiFlagIcon } from "@/components/fi-flag-icon";
import { TASK_PRIORITY_OPTIONS } from "@/components/task-context-menu";
import { ThemedText } from "@/components/themed-text";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

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

export function PriorityFlagToolbarIcon({
  size = 25.5,
  priority,
  defaultColor = "#5a6578",
}: {
  size?: number;
  priority: number | null;
  defaultColor?: string;
}) {
  const color =
    priority != null ? getTaskPriorityColor(priority) : defaultColor;

  return <FiFlagIcon size={size} color={color} strokeWidth={1.75} />;
}

function PriorityFlagOption({
  label,
  selected,
  onPress,
  tintColor,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  tintColor: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.flagSlot}
    >
      <AppSymbol
        ios="flag.fill"
        android="flag"
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
      </View>

      <View style={styles.divider} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Clear priority"
        onPress={() => onSelect(null)}
        style={({ pressed }) => [
          styles.noneRow,
          pressed && styles.noneRowPressed,
        ]}
      >
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
    opacity: 0.5,
  },
  noneText: {
    fontSize: 14,
    color: "#a5a5a9",
  },
});
