import type { TaskItem } from "@/types/todo";

export type TaskBlock = {
  id: string;
  root: TaskItem;
  children: TaskItem[];
};

/** Group a visible task list into root + following children blocks for drag reorder. */
export function tasksToBlocks(tasks: TaskItem[]): TaskBlock[] {
  const blocks: TaskBlock[] = [];
  let index = 0;

  while (index < tasks.length) {
    const root = tasks[index]!;
    const children: TaskItem[] = [];
    index += 1;

    while (index < tasks.length && tasks[index]?.parentId === root.id) {
      children.push(tasks[index]!);
      index += 1;
    }

    blocks.push({ id: root.id, root, children });
  }

  return blocks;
}

export function blocksToTasks(blocks: TaskBlock[]): TaskItem[] {
  return blocks.flatMap((block) => [block.root, ...block.children]);
}

/** Apply drag result; fall back to from/to when the library returns unchanged data. */
export function reorderBlocks(
  blocks: TaskBlock[],
  data: TaskBlock[],
  from: number,
  to: number,
): TaskBlock[] {
  if (from === to) return blocks;

  const dataOrder = data.map((block) => block.id).join(",");
  const currentOrder = blocks.map((block) => block.id).join(",");
  if (dataOrder !== currentOrder) return data;

  const next = [...blocks];
  const [moved] = next.splice(from, 1);
  if (!moved) return blocks;
  next.splice(to, 0, moved);
  return next;
}

export function getBlockOrderVersion(blocks: TaskBlock[]) {
  return blocks.map((block) => block.id).join(",");
}

/** Reorder children under a parent block while preserving the rest of the list. */
export function reorderBlockChildren(
  tasks: TaskItem[],
  parentId: string,
  reorderedChildIds: string[],
): TaskItem[] {
  const blocks = tasksToBlocks(tasks);
  const blockIndex = blocks.findIndex((block) => block.root.id === parentId);
  if (blockIndex < 0) return tasks;

  const block = blocks[blockIndex]!;
  const childById = new Map(block.children.map((child) => [child.id, child]));
  const reorderedChildren = reorderedChildIds
    .map((id) => childById.get(id))
    .filter((child): child is TaskItem => child != null);

  if (reorderedChildren.length !== block.children.length) return tasks;

  const nextBlocks = [...blocks];
  nextBlocks[blockIndex] = { ...block, children: reorderedChildren };
  return blocksToTasks(nextBlocks);
}
