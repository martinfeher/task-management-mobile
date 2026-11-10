import type { TaskBlock } from "@/lib/task-blocks";
import type { TaskItem } from "@/types/todo";

export type TaskListGroupBy =
  | "none"
  | "priority"
  | "date"
  | "label"
  | "list";

export type TaskListSortField = "date" | "title";
export type TaskListSortDirection = "asc" | "desc";

export type TaskListSortOption = {
  field: TaskListSortField;
  direction: TaskListSortDirection;
  label: string;
};

export const TASK_LIST_SORT_OPTIONS: TaskListSortOption[] = [
  { field: "date", direction: "asc", label: "Date (ascending)" },
  { field: "date", direction: "desc", label: "Date (descending)" },
  { field: "title", direction: "asc", label: "Title (A-Z)" },
  { field: "title", direction: "desc", label: "Title (Z-A)" },
];

export const TASK_LIST_GROUP_OPTIONS: Array<{
  id: TaskListGroupBy;
  label: string;
}> = [
  { id: "none", label: "Group: None" },
  { id: "priority", label: "Group: Priority" },
  { id: "date", label: "Group: Date" },
  { id: "label", label: "Group: Label" },
  { id: "list", label: "Group: List" },
];

export type TaskListSection = {
  key: string;
  title: string;
  blocks: TaskBlock[];
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseDueDay(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return startOfDay(date);
}

function getDateGroupKey(task: TaskItem) {
  const dueDay = parseDueDay(task.dueDate);
  if (!dueDay) return "no-date";

  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dueDay.getTime() < today.getTime()) return "overdue";
  if (dueDay.getTime() === today.getTime()) return "today";
  if (dueDay.getTime() === tomorrow.getTime()) return "tomorrow";
  return "later";
}

const DATE_GROUP_META: Array<{ key: string; title: string }> = [
  { key: "overdue", title: "Overdue" },
  { key: "today", title: "Today" },
  { key: "tomorrow", title: "Tomorrow" },
  { key: "later", title: "Later" },
  { key: "no-date", title: "No date" },
];

const PRIORITY_GROUP_META: Array<{ key: string; title: string }> = [
  { key: "1", title: "Priority 1" },
  { key: "2", title: "Priority 2" },
  { key: "3", title: "Priority 3" },
  { key: "none", title: "No priority" },
];

function getPriorityGroupKey(task: TaskItem) {
  if (task.priority === 1 || task.priority === 2 || task.priority === 3) {
    return String(task.priority);
  }
  return "none";
}

function getLabelGroupKey(task: TaskItem) {
  if (task.labels.length === 0) return "__none__";
  const sorted = [...task.labels].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );
  return sorted[0]!.id;
}

function getLabelGroupTitle(task: TaskItem, key: string) {
  if (key === "__none__") return "No label";
  const match = task.labels.find((label) => label.id === key);
  return match?.label ?? "Label";
}

function compareBlocks(
  left: TaskBlock,
  right: TaskBlock,
  field: TaskListSortField,
  direction: TaskListSortDirection,
) {
  const factor = direction === "asc" ? 1 : -1;
  const leftTask = left.root;
  const rightTask = right.root;

  if (field === "title") {
    return (
      factor *
      leftTask.name.localeCompare(rightTask.name, undefined, {
        sensitivity: "base",
      })
    );
  }

  const leftDay = parseDueDay(leftTask.dueDate);
  const rightDay = parseDueDay(rightTask.dueDate);
  if (!leftDay && !rightDay) return 0;
  if (!leftDay) return 1;
  if (!rightDay) return -1;
  const diff = leftDay.getTime() - rightDay.getTime();
  if (diff !== 0) return factor * diff;

  const leftMinutes = leftTask.dueTimeMinutes ?? Number.MAX_SAFE_INTEGER;
  const rightMinutes = rightTask.dueTimeMinutes ?? Number.MAX_SAFE_INTEGER;
  return factor * (leftMinutes - rightMinutes);
}

export function sortTaskBlocks(
  blocks: TaskBlock[],
  sort: TaskListSortOption | null,
) {
  if (!sort || blocks.length < 2) return blocks;
  return [...blocks].sort((left, right) =>
    compareBlocks(left, right, sort.field, sort.direction),
  );
}

function bucketBlocks(
  blocks: TaskBlock[],
  getKey: (task: TaskItem) => string,
) {
  const buckets = new Map<string, TaskBlock[]>();
  for (const block of blocks) {
    const key = getKey(block.root);
    const current = buckets.get(key);
    if (current) current.push(block);
    else buckets.set(key, [block]);
  }
  return buckets;
}

export function groupTaskBlocks(
  blocks: TaskBlock[],
  groupBy: TaskListGroupBy,
): TaskListSection[] {
  if (groupBy === "none" || blocks.length === 0) {
    return blocks.length > 0 ? [{ key: "all", title: "", blocks }] : [];
  }

  if (groupBy === "priority") {
    const buckets = bucketBlocks(blocks, getPriorityGroupKey);
    return PRIORITY_GROUP_META.filter((meta) => buckets.has(meta.key)).map(
      (meta) => ({
        key: meta.key,
        title: meta.title,
        blocks: buckets.get(meta.key) ?? [],
      }),
    );
  }

  if (groupBy === "date") {
    const buckets = bucketBlocks(blocks, (task) => getDateGroupKey(task));
    return DATE_GROUP_META.filter((meta) => buckets.has(meta.key)).map(
      (meta) => ({
        key: meta.key,
        title: meta.title,
        blocks: buckets.get(meta.key) ?? [],
      }),
    );
  }

  if (groupBy === "list") {
    const buckets = bucketBlocks(
      blocks,
      (task) => task.listId || task.listName || "unknown",
    );
    const sections = [...buckets.entries()]
      .map(([key, sectionBlocks]) => ({
        key,
        title: sectionBlocks[0]?.root.listName?.trim() || "List",
        blocks: sectionBlocks,
      }))
      .sort((left, right) =>
        left.title.localeCompare(right.title, undefined, {
          sensitivity: "base",
        }),
      );
    return sections;
  }

  const buckets = bucketBlocks(blocks, getLabelGroupKey);
  const labelTitles = new Map<string, string>();
  for (const block of blocks) {
    const key = getLabelGroupKey(block.root);
    if (!labelTitles.has(key)) {
      labelTitles.set(key, getLabelGroupTitle(block.root, key));
    }
  }

  const keys = [...buckets.keys()].sort((left, right) => {
    if (left === "__none__") return 1;
    if (right === "__none__") return -1;
    const leftTitle = labelTitles.get(left) ?? "";
    const rightTitle = labelTitles.get(right) ?? "";
    return leftTitle.localeCompare(rightTitle, undefined, {
      sensitivity: "base",
    });
  });

  return keys.map((key) => ({
    key,
    title: labelTitles.get(key) ?? "Label",
    blocks: buckets.get(key) ?? [],
  }));
}

export function organizeTaskBlocks(
  blocks: TaskBlock[],
  options: {
    sort: TaskListSortOption | null;
    groupBy: TaskListGroupBy;
  },
) {
  const sorted = sortTaskBlocks(blocks, options.sort);
  return groupTaskBlocks(sorted, options.groupBy);
}

export function isTaskListManualOrderEnabled(options: {
  sort: TaskListSortOption | null;
  groupBy: TaskListGroupBy;
}) {
  return options.groupBy === "none" && options.sort == null;
}

export function sortOptionsEqual(
  a: TaskListSortOption | null,
  b: TaskListSortOption | null,
) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.field === b.field && a.direction === b.direction;
}
