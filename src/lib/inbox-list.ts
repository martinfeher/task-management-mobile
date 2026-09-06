type ListLike = {
  id: string;
  name: string;
};

export function isInboxListName(name: string) {
  return name.trim().toLowerCase() === "inbox";
}

export function isInboxList(list: ListLike) {
  return isInboxListName(list.name);
}

export function findInboxList<T extends ListLike>(lists: T[]) {
  return (
    lists.find((list) => isInboxList(list)) ??
    lists[0] ??
    null
  );
}

export function listsWithoutInbox<T extends ListLike>(lists: T[]) {
  return lists.filter((list) => !isInboxList(list));
}
