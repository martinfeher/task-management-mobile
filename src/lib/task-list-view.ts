import { findInboxList } from "@/lib/inbox-list";
import type { SelectedView, SidebarListItem } from "@/types/todo";

/** Today, Important, or the Inbox list — views that can show multi-list tasks. */
export function isAggregateTaskListView(
  view: SelectedView | null,
  lists: SidebarListItem[],
) {
  if (!view) return false;
  if (view.type === "today" || view.type === "important") return true;
  if (view.type === "list") {
    const inbox = findInboxList(lists);
    return inbox?.id === view.id;
  }
  return false;
}
