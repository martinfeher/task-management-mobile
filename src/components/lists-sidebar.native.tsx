import { useCallback } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";

import {
  ListIcon,
  ListsLabelsSection,
  ListsPinnedRows,
  ListsSidebarShell,
  type ListsSidebarProps,
} from "@/components/lists-sidebar-shared";
import { SidebarRow } from "@/components/sidebar-row";
import type { SidebarListItem } from "@/types/todo";

export function ListsSidebar({
  data,
  loading,
  refreshing,
  error,
  selectedView,
  onSelectView,
  onRefresh,
  onRetry,
  onReorderLists,
  onCreateList,
  onRenameList,
  onDeleteList,
  onRenameLabel,
  onDeleteLabel,
  onChangeLabelColor,
}: ListsSidebarProps) {
  const navIconColor = "#7c92a0";
  const lists = data?.lists ?? [];

  const renderListItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<SidebarListItem>) => {
      const selected =
        selectedView?.type === "list" && selectedView.id === item.id;
      return (
        <ScaleDecorator activeScale={1.03}>
          <View style={isActive ? styles.activeItem : undefined}>
            <SidebarRow
              title={item.name}
              count={item.taskCount}
              selected={selected}
              icon={<ListIcon color={selected ? "#111111" : navIconColor} />}
              showMenu
              onPress={() => onSelectView({ type: "list", id: item.id })}
              onLongPress={drag}
              onPressMenu={() => {
                Alert.alert(item.name, undefined, [
                  {
                    text: "Rename",
                    onPress: () => onRenameList?.(item),
                  },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => onDeleteList?.(item),
                  },
                  { text: "Cancel", style: "cancel" },
                ]);
              }}
            />
          </View>
        </ScaleDecorator>
      );
    },
    [navIconColor, onDeleteList, onRenameList, onSelectView, selectedView],
  );

  return (
    <ListsSidebarShell
      loading={loading}
      data={data}
      error={error}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onRetry={onRetry}>
      {(refreshControl) => (
        <NestableScrollContainer
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={refreshControl as never}>
          <ListsPinnedRows
            data={data}
            selectedView={selectedView}
            onSelectView={onSelectView}
            navIconColor={navIconColor}
          />

          <Pressable style={styles.newListRow} onPress={onCreateList}>
            <Text style={styles.newListText}>New list</Text>
          </Pressable>

          {lists.length === 0 ? (
            <Text style={styles.emptyLists}>No lists yet. Tap New list to create one.</Text>
          ) : (
            <NestableDraggableFlatList
              data={lists}
              keyExtractor={(item) => item.id}
              onDragEnd={({ data: nextLists }) => onReorderLists?.(nextLists)}
              renderItem={renderListItem}
              activationDistance={12}
              scrollEnabled={false}
            />
          )}

          <ListsLabelsSection
            data={data}
            selectedView={selectedView}
            onSelectView={onSelectView}
            navIconColor={navIconColor}
            onRenameLabel={onRenameLabel}
            onDeleteLabel={onDeleteLabel}
            onChangeLabelColor={onChangeLabelColor}
          />
        </NestableScrollContainer>
      )}
    </ListsSidebarShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  activeItem: {
    opacity: 0.95,
  },
  emptyLists: {
    paddingHorizontal: 16,
    paddingTop: 8,
    fontSize: 14,
    color: "#71717a",
  },
  newListRow: {
    marginHorizontal: 6,
    marginBottom: 2,
    minHeight: 45,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  newListText: {
    fontSize: 15,
    color: "#2563eb",
    fontWeight: "500",
  },
});
