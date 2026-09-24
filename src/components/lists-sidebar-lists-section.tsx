import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { AppSymbol } from "@/components/app-symbol";
import { BiChevronDownIcon } from "@/components/bi-chevron-down-icon";
import { MdChecklistIcon } from "@/components/md-checklist-icon";
import { SidebarRow } from "@/components/sidebar-row";
import { findInboxList } from "@/lib/inbox-list";

import {
  buildSidebarTopLevelEntries,
  getListsForFolder,
} from "@/lib/sidebar-list-layout";
import type {
  SelectedView,
  SidebarData,
  SidebarFolderItem,
  SidebarListItem,
} from "@/types/todo";

export type SidebarDraggableTopLevelItem =
  | { key: string; kind: "folder"; folder: SidebarFolderItem }
  | { key: string; kind: "list"; list: SidebarListItem };

export function useSidebarExpandedFolders(
  data: SidebarData | null,
  selectedView: SelectedView | null,
) {
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (selectedView?.type !== "list" || !data) return;
    const selectedList = data.lists.find((list) => list.id === selectedView.id);
    if (!selectedList?.folderId) return;

    setExpandedFolderIds((current) => {
      if (current.has(selectedList.folderId!)) return current;
      const next = new Set(current);
      next.add(selectedList.folderId!);
      return next;
    });
  }, [data, selectedView]);

  const toggleFolderExpanded = (folderId: string) => {
    setExpandedFolderIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  return { expandedFolderIds, toggleFolderExpanded };
}

function showListContextMenu(
  list: SidebarListItem,
  handlers: {
    onRenameList?: (list: SidebarListItem) => void;
    onDeleteList?: (list: SidebarListItem) => void;
  },
) {
  Alert.alert(list.name, undefined, [
    {
      text: "Rename",
      onPress: () => handlers.onRenameList?.(list),
    },
    {
      text: "Delete",
      style: "destructive",
      onPress: () => handlers.onDeleteList?.(list),
    },
    { text: "Cancel", style: "cancel" },
  ]);
}

function showFolderContextMenu(
  folder: SidebarFolderItem,
  handlers: {
    onRenameFolder?: (folder: SidebarFolderItem) => void;
    onDeleteFolder?: (folder: SidebarFolderItem) => void;
  },
) {
  Alert.alert(folder.name, undefined, [
    {
      text: "Rename",
      onPress: () => handlers.onRenameFolder?.(folder),
    },
    {
      text: "Delete",
      style: "destructive",
      onPress: () => handlers.onDeleteFolder?.(folder),
    },
    { text: "Cancel", style: "cancel" },
  ]);
}

export function useSidebarTopLevelItems(data: SidebarData | null) {
  return useMemo(() => {
    const lists = data?.lists ?? [];
    const folders = data?.folders ?? [];
    const inboxId = findInboxList(lists)?.id ?? null;

    return buildSidebarTopLevelEntries(folders, lists, inboxId).map(
      (entry): SidebarDraggableTopLevelItem =>
        entry.kind === "folder"
          ? {
              key: `folder:${entry.folder.id}`,
              kind: "folder",
              folder: entry.folder,
            }
          : {
              key: `list:${entry.list.id}`,
              kind: "list",
              list: entry.list,
            },
    );
  }, [data?.folders, data?.lists]);
}

export function ListsFolderRow({
  folder,
  expanded,
  navIconColor,
  onToggle,
  onRenameFolder,
  onDeleteFolder,
}: {
  folder: SidebarFolderItem;
  expanded: boolean;
  navIconColor: string;
  onToggle: () => void;
  onRenameFolder?: (folder: SidebarFolderItem) => void;
  onDeleteFolder?: (folder: SidebarFolderItem) => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      onLongPress={() =>
        showFolderContextMenu(folder, { onRenameFolder, onDeleteFolder })
      }
      delayLongPress={250}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={folder.name}
      className="mb-1 ml-[10px] mr-1.5 min-h-[34px] flex-row items-center rounded-md px-1.5 active:bg-zinc-200/60"
    >
      <AppSymbol
        ios={expanded ? "folder.fill" : "folder"}
        android="folder"
        size={22}
        tintColor="#98b5c7"
        style={{ marginLeft: -1 }}
      />
      <View
        className="min-w-0 flex-1 flex-row items-center gap-1 pr-8"
        style={{ paddingLeft: 6 }}
      >
        <Text
          className="min-w-0 flex-1 text-[17px] font-normal text-zinc-700"
          numberOfLines={1}
        >
          {folder.name}
        </Text>
        <View
          style={{
            transform: [{ rotate: expanded ? "0deg" : "-90deg" }],
          }}
          className="mr-2"
        >
          <BiChevronDownIcon size={16} color="#c0c5e0" />
        </View>
      </View>
    </Pressable>
  );
}

export function ListsSidebarListRow({
  list,
  selectedView,
  navIconColor,
  nested = false,
  onSelectView,
  onRenameList,
  onDeleteList,
}: {
  list: SidebarListItem;
  selectedView: SelectedView | null;
  navIconColor: string;
  nested?: boolean;
  onSelectView: (view: SelectedView) => void;
  onRenameList?: (list: SidebarListItem) => void;
  onDeleteList?: (list: SidebarListItem) => void;
}) {
  const selected = selectedView?.type === "list" && selectedView.id === list.id;
  const openContextMenu = () =>
    showListContextMenu(list, { onRenameList, onDeleteList });

  return (
    <SidebarRow
      title={list.name}
      count={list.taskCount}
      countNudgeLeft={nested ? 34 : undefined}
      selected={selected}
      selectedTitleClassName="font-normal text-zinc-700"
      nested={nested}
      icon={
        <View style={{ marginLeft: -3 }}>
          <MdChecklistIcon
            size={17}
            color={selected ? "#8a919d" : nested ? "#b3b8ca" : "#b3b8ca"}
          />
        </View>
      }
      showMenu={!nested}
      onPress={() => onSelectView({ type: "list", id: list.id })}
      onLongPress={openContextMenu}
      onPressMenu={openContextMenu}
    />
  );
}

export function ListsSidebarTopLevelBlock({
  item,
  data,
  selectedView,
  navIconColor,
  expandedFolderIds,
  onToggleFolder,
  onSelectView,
  onRenameList,
  onDeleteList,
  onRenameFolder,
  onDeleteFolder,
}: {
  item: SidebarDraggableTopLevelItem;
  data: SidebarData | null;
  selectedView: SelectedView | null;
  navIconColor: string;
  expandedFolderIds: Set<string>;
  onToggleFolder: (folderId: string) => void;
  onSelectView: (view: SelectedView) => void;
  onRenameList?: (list: SidebarListItem) => void;
  onDeleteList?: (list: SidebarListItem) => void;
  onRenameFolder?: (folder: SidebarFolderItem) => void;
  onDeleteFolder?: (folder: SidebarFolderItem) => void;
}) {
  if (item.kind === "list") {
    return (
      <ListsSidebarListRow
        list={item.list}
        selectedView={selectedView}
        navIconColor={navIconColor}
        onSelectView={onSelectView}
        onRenameList={onRenameList}
        onDeleteList={onDeleteList}
      />
    );
  }

  const isExpanded = expandedFolderIds.has(item.folder.id);
  const folderLists = getListsForFolder(data?.lists ?? [], item.folder.id);

  return (
    <View>
      <ListsFolderRow
        folder={item.folder}
        expanded={isExpanded}
        navIconColor={navIconColor}
        onToggle={() => onToggleFolder(item.folder.id)}
        onRenameFolder={onRenameFolder}
        onDeleteFolder={onDeleteFolder}
      />
      {isExpanded
        ? folderLists.map((list) => (
            <ListsSidebarListRow
              key={list.id}
              list={list}
              selectedView={selectedView}
              navIconColor={navIconColor}
              nested
              onSelectView={onSelectView}
              onRenameList={onRenameList}
              onDeleteList={onDeleteList}
            />
          ))
        : null}
    </View>
  );
}
