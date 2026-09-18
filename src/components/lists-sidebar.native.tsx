import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";

import {
  ListsSidebarTopLevelBlock,
  type SidebarDraggableTopLevelItem,
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
  onReorderSidebarTopLevel,
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

  const renderTopLevelItem = useCallback(
    ({
      item,
      drag,
      isActive,
    }: RenderItemParams<SidebarDraggableTopLevelItem>) => (
      <ScaleDecorator activeScale={1.02}>
        <View style={isActive ? styles.activeItem : undefined}>
          <ListsSidebarTopLevelBlock
            item={item}
            data={data}
            selectedView={selectedView}
            navIconColor={navIconColor}
            expandedFolderIds={expandedFolderIds}
            onToggleFolder={toggleFolderExpanded}
            onSelectView={onSelectView}
            onRenameList={onRenameList}
            onDeleteList={onDeleteList}
            onLongPress={drag}
          />
        </View>
      </ScaleDecorator>
    ),
    [
      data,
      expandedFolderIds,
      navIconColor,
      onDeleteList,
      onRenameList,
      onSelectView,
      selectedView,
      toggleFolderExpanded,
    ],
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
        <NestableScrollContainer
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={refreshControl as never}
        >
          <ListsPinnedRows
            data={data}
            selectedView={selectedView}
            onSelectView={onSelectView}
            navIconColor={navIconColor}
          />

          {topLevelItems.length === 0 ? (
            <Text style={styles.emptyLists}>
              No lists yet. Use Create to add one.
            </Text>
          ) : (
            <NestableDraggableFlatList
              data={topLevelItems}
              keyExtractor={(item) => item.key}
              onDragEnd={({ from, to }) => {
                if (from === to) return;
                onReorderSidebarTopLevel?.(from, to);
              }}
              renderItem={renderTopLevelItem}
              activationDistance={12}
              scrollEnabled={false}
            />
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
});
