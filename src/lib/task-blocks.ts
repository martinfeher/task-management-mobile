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
