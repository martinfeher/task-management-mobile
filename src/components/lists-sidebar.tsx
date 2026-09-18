import { ScrollView, Text } from "react-native";

import {
  ListsSidebarTopLevelBlock,
  useSidebarExpandedFolders,
  useSidebarTopLevelItems,
} from "@/components/lists-sidebar-lists-section";
import {
  ListsLabelsSection,
  ListsPinnedRows,
  ListsSidebarShell,
  type ListsSidebarProps,
} from "@/components/lists-sidebar-shared";

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
  onCreateLabel,
  onRenameList,
  onDeleteList,
  onRenameLabel,
  onDeleteLabel,
  onChangeLabelColor,
}: ListsSidebarProps) {
  const navIconColor = "#7c92a0";
  const topLevelItems = useSidebarTopLevelItems(data);
  const { expandedFolderIds, toggleFolderExpanded } = useSidebarExpandedFolders(
    data,
    selectedView,
  );

  return (
    <ListsSidebarShell
      loading={loading}
      data={data}
      error={error}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onRetry={onRetry}
      onCreateList={onCreateList}
      onCreateLabel={onCreateLabel}
    >
      {(refreshControl) => (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 96 }}
          refreshControl={refreshControl as never}
        >
          <ListsPinnedRows
            data={data}
            selectedView={selectedView}
            onSelectView={onSelectView}
            navIconColor={navIconColor}
          />

          {topLevelItems.length === 0 ? (
            <Text className="px-4 pt-2 text-sm text-zinc-500">
              No lists yet. Use Create to add one.
            </Text>
          ) : (
            topLevelItems.map((item) => (
              <ListsSidebarTopLevelBlock
                key={item.key}
                item={item}
                data={data}
                selectedView={selectedView}
                navIconColor={navIconColor}
                expandedFolderIds={expandedFolderIds}
                onToggleFolder={toggleFolderExpanded}
                onSelectView={onSelectView}
                onRenameList={onRenameList}
                onDeleteList={onDeleteList}
              />
            ))
          )}

          <ListsLabelsSection
            data={data}
            selectedView={selectedView}
            onSelectView={onSelectView}
            navIconColor={navIconColor}
            onCreateLabel={onCreateLabel}
            onRenameLabel={onRenameLabel}
            onDeleteLabel={onDeleteLabel}
            onChangeLabelColor={onChangeLabelColor}
          />
        </ScrollView>
      )}
    </ListsSidebarShell>
  );
}
