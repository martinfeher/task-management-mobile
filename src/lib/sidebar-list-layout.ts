import { findInboxList } from "@/lib/inbox-list";
import type { SidebarFolderItem, SidebarListItem } from "@/types/todo";

export type SidebarTopLevelEntry =
  | { kind: "folder"; folder: SidebarFolderItem }
  | { kind: "list"; list: SidebarListItem };

type SidebarTopLevelRowKey = `list:${string}` | `folder:${string}`;

function reorderRowKeys(
  rowKeys: SidebarTopLevelRowKey[],
  sourceIndex: number,
  dropIndex: number,
) {
  const next = [...rowKeys];
  const [removed] = next.splice(sourceIndex, 1);
  next.splice(dropIndex, 0, removed);
  return next;
}

export function buildSidebarTopLevelEntries(
  folders: SidebarFolderItem[],
  lists: SidebarListItem[],
  inboxListId: string | null,
): SidebarTopLevelEntry[] {
  const ungroupedLists = lists.filter(
    (list) => list.id !== inboxListId && !list.folderId,
  );

  const entries: Array<SidebarTopLevelEntry & { sortKey: number }> = [
    ...folders.map((folder) => ({
      kind: "folder" as const,
      folder,
      sortKey: folder.position,
    })),
    ...ungroupedLists.map((list) => ({
      kind: "list" as const,
      list,
      sortKey: list.position ?? 0,
    })),
  ];

  return entries
    .sort((left, right) => left.sortKey - right.sortKey)
    .map(({ sortKey: _sortKey, ...entry }) => entry);
}

export function getListsForFolder(
  lists: SidebarListItem[],
  folderId: string,
) {
  return lists
    .filter((list) => list.folderId === folderId)
    .sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
}

function getSidebarTopLevelRowKeys(
  folders: SidebarFolderItem[],
  lists: SidebarListItem[],
  inboxListId: string | null,
): SidebarTopLevelRowKey[] {
  return buildSidebarTopLevelEntries(folders, lists, inboxListId).map(
    (entry) =>
      entry.kind === "list"
        ? (`list:${entry.list.id}` as const)
        : (`folder:${entry.folder.id}` as const),
  );
}

export function computeSidebarTopLevelAfterReorder(
  folders: SidebarFolderItem[],
  lists: SidebarListItem[],
  inboxListId: string | null,
  sourceIndex: number,
  dropIndex: number,
): {
  folders: SidebarFolderItem[];
  lists: SidebarListItem[];
  changed: boolean;
} {
  const rowKeys = getSidebarTopLevelRowKeys(folders, lists, inboxListId);
  const reorderedKeys = reorderRowKeys(rowKeys, sourceIndex, dropIndex);

  if (reorderedKeys.join(",") === rowKeys.join(",")) {
    return { folders, lists, changed: false };
  }

  const listById = new Map(lists.map((list) => [list.id, { ...list }]));
  const folderById = new Map(
    folders.map((folder) => [folder.id, { ...folder }]),
  );

  reorderedKeys.forEach((key, position) => {
    if (key.startsWith("list:")) {
      const listId = key.slice("list:".length);
      const current = listById.get(listId);
      if (current) {
        listById.set(listId, { ...current, position });
      }
      return;
    }

    const folderId = key.slice("folder:".length);
    const current = folderById.get(folderId);
    if (current) {
      folderById.set(folderId, { ...current, position });
    }
  });

  return {
    lists: lists.map((list) => listById.get(list.id) ?? list),
    folders: folders.map((folder) => folderById.get(folder.id) ?? folder),
    changed: true,
  };
}

export function getSidebarTopLevelPositionUpdates(
  folders: SidebarFolderItem[],
  lists: SidebarListItem[],
  inboxListId: string | null,
) {
  const topLevelListIds = new Set(
    buildSidebarTopLevelEntries(folders, lists, inboxListId)
      .filter((entry) => entry.kind === "list")
      .map((entry) => entry.list.id),
  );

  return {
    listPositions: lists
      .filter((list) => topLevelListIds.has(list.id))
      .map((list) => ({ id: list.id, position: list.position ?? 0 })),
    folderPositions: folders.map((folder) => ({
      id: folder.id,
      position: folder.position,
    })),
  };
}

export function getInboxListIdFromSidebar(lists: SidebarListItem[]) {
  return findInboxList(lists)?.id ?? null;
}
