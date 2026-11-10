import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { AppSymbol } from "@/components/app-symbol";
import { ThemedText } from "@/components/themed-text";
import {
  TASK_LIST_GROUP_OPTIONS,
  TASK_LIST_SORT_OPTIONS,
  sortOptionsEqual,
  type TaskListGroupBy,
  type TaskListSortOption,
} from "@/lib/task-list-grouping";

type TaskListOrganizeMenuProps = {
  activeSort: TaskListSortOption | null;
  activeGroupBy: TaskListGroupBy;
  onSelectSort: (option: TaskListSortOption) => void;
  onSelectGroupBy: (groupBy: TaskListGroupBy) => void;
};

export function TaskListOrganizeMenu({
  activeSort,
  activeGroupBy,
  onSelectSort,
  onSelectGroupBy,
}: TaskListOrganizeMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          activeSort
            ? `Organize tasks. Sorted by ${activeSort.label}`
            : "Organize tasks"
        }
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={styles.trigger}
      >
        <AppSymbol
          ios="arrow.up.arrow.down"
          android="sort"
          size={14}
          tintColor="#6b7280"
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.menuCard}>
          {TASK_LIST_SORT_OPTIONS.map((option) => {
            const selected = sortOptionsEqual(activeSort, option);
            return (
              <Pressable
                key={`${option.field}-${option.direction}`}
                accessibilityRole="menuitem"
                onPress={() => {
                  onSelectSort(option);
                  setOpen(false);
                }}
                style={[styles.menuRow, selected && styles.menuRowSelected]}
              >
                <ThemedText
                  style={[styles.menuLabel, selected && styles.menuLabelSelected]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}

          <View style={styles.separator} />

          {TASK_LIST_GROUP_OPTIONS.map((option) => {
            const selected = activeGroupBy === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="menuitem"
                onPress={() => {
                  onSelectGroupBy(option.id);
                  setOpen(false);
                }}
                style={[styles.menuRow, selected && styles.menuRowSelected]}
              >
                <ThemedText
                  style={[styles.menuLabel, selected && styles.menuLabelSelected]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 29,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e7e7eb",
    backgroundColor: "#fbfbfc",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  menuCard: {
    position: "absolute",
    top: 108,
    right: 16,
    minWidth: 220,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e4e4e7",
    backgroundColor: "#ffffff",
    paddingVertical: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuRowSelected: {
    backgroundColor: "#f4f4f5",
  },
  menuLabel: {
    fontSize: 13,
    color: "#3f3f46",
  },
  menuLabelSelected: {
    fontWeight: "600",
    color: "#18181b",
  },
  separator: {
    marginHorizontal: 10,
    marginVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e4e4e7",
  },
});
