import { Alert, ScrollView, Text } from "react-native";

import {
  ListIcon,
  ListsLabelsSection,
  ListsPinnedRows,
  ListsSidebarShell,
  type ListsSidebarProps,
} from "@/components/lists-sidebar-shared";
import { SidebarRow } from "@/components/sidebar-row";

export function ListsSidebar({
  data,
  loading,
  refreshing,
  error,
  selectedView,
  onSelectView,
  onRefresh,
  onRetry,
  onCreateList,
  onRenameList,
  onDeleteList,
  onRenameLabel,
  onDeleteLabel,
  onChangeLabelColor,
}: ListsSidebarProps) {
  const navIconColor = "#7c92a0";
  const lists = data?.lists ?? [];

  return (
    <ListsSidebarShell
      loading={loading}
      data={data}
      error={error}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onRetry={onRetry}>
      {(refreshControl) => (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 96 }}
          refreshControl={refreshControl as never}>
          <ListsPinnedRows
            data={data}
            selectedView={selectedView}
            onSelectView={onSelectView}
            navIconColor={navIconColor}
          />

          <SidebarRow title="New list" onPress={onCreateList} />

          {lists.length === 0 ? (
            <Text className="px-4 pt-2 text-sm text-zinc-500">
              No lists yet. Tap New list to create one.
            </Text>
          ) : (
            lists.map((list) => {
              const selected =
                selectedView?.type === "list" && selectedView.id === list.id;
              return (
                <SidebarRow
                  key={list.id}
                  title={list.name}
                  count={list.taskCount}
                  selected={selected}
                  icon={
                    <ListIcon color={selected ? "#111111" : navIconColor} />
                  }
                  showMenu
                  onPress={() => onSelectView({ type: "list", id: list.id })}
                  onPressMenu={() => {
                    Alert.alert(list.name, undefined, [
                      {
                        text: "Rename",
                        onPress: () => onRenameList?.(list),
                      },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => onDeleteList?.(list),
                      },
                      { text: "Cancel", style: "cancel" },
                    ]);
                  }}
                />
              );
            })
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
        </ScrollView>
      )}
    </ListsSidebarShell>
  );
}
