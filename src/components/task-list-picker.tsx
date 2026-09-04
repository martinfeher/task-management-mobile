import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppSymbol } from "@/components/app-symbol";
import { ListIcon } from "@/components/lists-sidebar-shared";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import type { SidebarListItem } from "@/types/todo";

type TaskListPickerProps = {
  visible: boolean;
  lists: SidebarListItem[];
  currentListId: string | null;
  onSelectList: (list: SidebarListItem) => void;
  onClose: () => void;
};

export function TaskListPicker({
  visible,
  lists,
  currentListId,
  onSelectList,
  onClose,
}: TaskListPickerProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const filteredLists = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return lists;
    return lists.filter((list) => list.name.toLowerCase().includes(normalized));
  }, [lists, query]);

  function handleClose() {
    setQuery("");
    onClose();
  }

  function handleSelectList(list: SidebarListItem) {
    setQuery("");
    onSelectList(list);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={handleClose}
              style={styles.closeButton}>
              <AppSymbol ios="xmark" android="close" size={20} tintColor="#111827" />
            </Pressable>
            <ThemedText style={styles.title}>Move to</ThemedText>
            <View style={styles.closeButton} />
          </View>

          <View style={styles.searchField}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor="#9ca3af"
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>

          <ScrollView
            style={styles.listScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {filteredLists.length === 0 ? (
              <ThemedText style={styles.empty} themeColor="textSecondary">
                No lists match your search.
              </ThemedText>
            ) : (
              filteredLists.map((list) => {
                const selected = list.id === currentListId;
                return (
                  <Pressable
                    key={list.id}
                    style={styles.row}
                    onPress={() => handleSelectList(list)}>
                    <ListIcon color={selected ? "#111111" : "#7c92a0"} />
                    <ThemedText
                      style={[styles.rowLabel, selected && styles.rowLabelSelected]}
                      numberOfLines={1}>
                      {list.name}
                    </ThemedText>
                    {selected ? (
                      <AppSymbol
                        ios="checkmark"
                        android="check"
                        size={18}
                        tintColor="#3c87f7"
                      />
                    ) : (
                      <View style={styles.checkPlaceholder} />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  sheet: {
    maxHeight: "88%",
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Spacing.two,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  searchField: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
  },
  searchInput: {
    fontSize: 16,
    color: "#111827",
    padding: 0,
  },
  listScroll: {
    paddingHorizontal: Spacing.two,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eef2f6",
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
  },
  rowLabelSelected: {
    color: "#111827",
    fontWeight: "600",
  },
  checkPlaceholder: {
    width: 18,
  },
  empty: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    fontSize: 14,
  },
});
