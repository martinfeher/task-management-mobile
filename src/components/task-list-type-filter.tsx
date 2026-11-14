import { Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ADD_TASK_FAB_SIZE,
  FAB_BOTTOM_NUDGE,
  FAB_RIGHT_INSET,
  getFabBottomOffset,
} from "@/constants/tab-bar";
import type { TaskBlock } from "@/lib/task-blocks";
import { blocksToTasks, tasksToBlocks } from "@/lib/task-blocks";
import type { TaskItem } from "@/types/todo";

export type TaskListContentFilter = "all" | "notes" | "tasks";

export const TASK_LIST_TYPE_FILTER_ABOVE_FAB_GAP = 11;
export const TASK_LIST_TYPE_FILTER_EXTRA_SCROLL_PADDING = 41;

const FILTER_OPTIONS: Array<{ id: TaskListContentFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "notes", label: "Notes" },
  { id: "tasks", label: "Tasks" },
];

const trackShadowStyle = Platform.select({
  ios: {
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
  },
  android: {
    elevation: 2,
  },
  default: {
    boxShadow: "0px 1px 5px rgba(0, 0, 0, 0.06)",
  },
});

export function getTaskListRootTypeCounts(items: TaskItem[]) {
  let noteCount = 0;
  let taskCount = 0;

  for (const item of items) {
    if (item.parentId) continue;
    if (item.isNote) noteCount += 1;
    else taskCount += 1;
  }

  return { noteCount, taskCount };
}

export function shouldShowTaskListTypeFilter(items: TaskItem[]) {
  const { noteCount, taskCount } = getTaskListRootTypeCounts(items);
  return noteCount > 2 && taskCount >= 2;
}

export function filterTaskBlocks(
  blocks: TaskBlock[],
  filter: TaskListContentFilter,
) {
  if (filter === "all") return blocks;

  return blocks.filter((block) =>
    filter === "notes" ? Boolean(block.root.isNote) : !block.root.isNote,
  );
}

export function filterTaskListItems(
  tasks: TaskItem[],
  filter: TaskListContentFilter,
) {
  if (filter === "all") return tasks;
  return blocksToTasks(filterTaskBlocks(tasksToBlocks(tasks), filter));
}

type TaskListTypeFilterBarProps = {
  value: TaskListContentFilter;
  onChange: (value: TaskListContentFilter) => void;
};

export function TaskListTypeFilterBar({
  value,
  onChange,
}: TaskListTypeFilterBarProps) {
  const insets = useSafeAreaInsets();
  const fabBottom = getFabBottomOffset(insets.bottom, false);
  const bottom =
    fabBottom -
    FAB_BOTTOM_NUDGE +
    ADD_TASK_FAB_SIZE +
    TASK_LIST_TYPE_FILTER_ABOVE_FAB_GAP;

  return (
    <View
      pointerEvents="box-none"
      className="absolute z-[19]"
      style={{
        bottom,
        right: 6 ,
        elevation: 19,
      }}
    >
      <View
        className="mb-[5px] flex-row items-center gap-px rounded-full border border-[#e4e4e7] bg-white p-0.5"
        style={trackShadowStyle}
      >
        {FILTER_OPTIONS.map((option) => {
          const selected = value === option.id;

          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Show ${option.label.toLowerCase()}`}
              onPress={() => onChange(option.id)}
              className={`min-w-[32px] h-[24px] items-center justify-center rounded-full px-[6px] py-0.5 ${
                selected ? "bg-[#eef4ff]" : ""
              }`}
            >
              <Text
                className={`text-[11px] ${
                  selected
                    ? "font-semibold text-[#126bff]"
                    : "font-medium text-[#9ca3af]"
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
