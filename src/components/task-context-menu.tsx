import { Pressable, StyleSheet, View } from "react-native";

import { AppSymbol } from "@/components/app-symbol";
import { ThemedText } from "@/components/themed-text";
import type { TaskItem } from "@/types/todo";

export const TASK_PRIORITY_OPTIONS = [
  { level: 1 as const, color: "#e95440", label: "Priority 1" },
  { level: 2 as const, color: "#f97316", label: "Priority 2" },
  { level: 3 as const, color: "#5b8def", label: "Priority 3" },
];

export type TaskContextMenuAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TaskContextMenuProps = {
  task: TaskItem;
  /** Position relative to the overlay parent. */
  top: number;
  left: number;
  /** When false, backdrop taps are ignored (e.g. right after long-press release). */
  backdropEnabled?: boolean;
  /** Full task list menu vs calendar planning menu. */
  variant?: "full" | "calendar";
  onClose: () => void;
  onRename: () => void;
  onTogglePinned: () => void;
  onToggleImportant: () => void;
  onSetPriority: (priority: number | null) => void;
  onMoveTo: () => void;
  onAddLabel: () => void;
  onDelete: () => void;
  onChangeDate?: () => void;
};

const MENU_WIDTH = 220;

export function TaskContextMenu({
  task,
  top,
  left,
  backdropEnabled = true,
  variant = "full",
  onClose,
  onRename,
  onTogglePinned,
  onToggleImportant,
  onSetPriority,
  onMoveTo,
  onAddLabel,
  onDelete,
  onChangeDate,
}: TaskContextMenuProps) {
  const isCalendar = variant === "calendar";

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none">
      {backdropEnabled ? (
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss menu"
        />
      ) : null}
      <View style={[styles.menu, { top, left, width: MENU_WIDTH }]}>
        <MenuRow
          label={isCalendar ? "Open task" : "Rename"}
          onPress={onRename}
        />
        {!isCalendar ? (
          <>
            <MenuRow
              label={task.pinned ? "Unpin task" : "Pin task"}
              onPress={onTogglePinned}
            />
            <MenuRow
              label={task.important ? "Unmark important" : "Mark as important"}
              onPress={onToggleImportant}
            />

            <View style={styles.priorityBlock}>
              <ThemedText style={styles.priorityLabel}>Priority</ThemedText>
              <View style={styles.priorityRow}>
                {TASK_PRIORITY_OPTIONS.map((option) => {
                  const selected = task.priority === option.level;
                  return (
                    <Pressable
                      key={option.level}
                      accessibilityRole="button"
                      accessibilityLabel={option.label}
                      onPress={() => onSetPriority(option.level)}
                      style={[
                        styles.priorityDot,
                        { backgroundColor: option.color },
                        selected && styles.priorityDotSelected,
                      ]}
                    />
                  );
                })}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear priority"
                  onPress={() => onSetPriority(null)}
                  style={[
                    styles.priorityClear,
                    task.priority == null && styles.priorityDotSelected,
                  ]}>
                  <AppSymbol
                    ios="xmark"
                    android="close"
                    size={14}
                    tintColor="#9ca3af"
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Move to"
              onPress={onMoveTo}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <ThemedText style={styles.rowLabel}>Move to</ThemedText>
              <AppSymbol
                ios="chevron.right"
                android="chevron-right"
                size={16}
                tintColor="#c0c4cc"
              />
            </Pressable>

            <MenuRow label="Add label" onPress={onAddLabel} />
          </>
        ) : null}
        {onChangeDate ? (
          <MenuRow label="Change date" onPress={onChangeDate} />
        ) : null}
        <MenuRow label="Delete task" onPress={onDelete} destructive />
      </View>
    </View>
  );
}

export const TASK_CONTEXT_MENU_WIDTH = MENU_WIDTH;
export const TASK_CONTEXT_MENU_ESTIMATED_HEIGHT = 364;

function MenuRow({
  label,
  onPress,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <ThemedText style={[styles.rowLabel, destructive && styles.rowDestructive]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "transparent",
  },
  menu: {
    position: "absolute",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  row: {
    minHeight: 44,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowPressed: {
    backgroundColor: "#f4f4f5",
  },
  rowLabel: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "400",
  },
  rowDestructive: {
    color: "#dc2626",
  },
  priorityBlock: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
  },
  priorityLabel: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 10,
  },
  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  priorityDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  priorityDotSelected: {
    borderWidth: 2,
    borderColor: "#111827",
  },
  priorityClear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#eef0f3",
    alignItems: "center",
    justifyContent: "center",
  },
});
