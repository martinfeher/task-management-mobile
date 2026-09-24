import { Platform } from "react-native";

export const TAB_BAR_HEIGHT =
  Platform.select({ ios: 49, android: 56, default: 49 }) ?? 49;

/** Gap between the add-task FAB and the top edge of the bottom tab bar. */
export const FAB_GAP_ABOVE_TAB_BAR = 7;

/** Gap between the add-task FAB and the screen's right edge. */
export const FAB_RIGHT_INSET = 10;

export const ADD_TASK_FAB_SIZE = 60;

/** Matches `add-task-button.tsx` bottom offset adjustment. */
export const FAB_BOTTOM_NUDGE = 42;

export function getFabBottomOffset(
  safeAreaBottom: number,
  parentEndsAtTabBarTop: boolean,
) {
  if (parentEndsAtTabBarTop) {
    return FAB_GAP_ABOVE_TAB_BAR;
  }

  return TAB_BAR_HEIGHT + safeAreaBottom + FAB_GAP_ABOVE_TAB_BAR;
}

/** Scroll padding so the last task clears the floating add button. */
export function getAddTaskFabReservedHeight(
  safeAreaBottom: number,
  parentEndsAtTabBarTop = false,
  extraGap = 12,
) {
  const fabBottom = getFabBottomOffset(safeAreaBottom, parentEndsAtTabBarTop);
  return fabBottom - FAB_BOTTOM_NUDGE + ADD_TASK_FAB_SIZE + extraGap;
}
