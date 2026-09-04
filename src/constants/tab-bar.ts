import { Platform } from "react-native";

export const TAB_BAR_HEIGHT =
  Platform.select({ ios: 49, android: 56, default: 49 }) ?? 49;

/** Gap between the add-task FAB and the top edge of the bottom tab bar. */
export const FAB_GAP_ABOVE_TAB_BAR = 10;

/** Gap between the add-task FAB and the screen's right edge. */
export const FAB_RIGHT_INSET = 10;

export function getFabBottomOffset(safeAreaBottom: number, parentEndsAtTabBarTop: boolean) {
  if (parentEndsAtTabBarTop) {
    return FAB_GAP_ABOVE_TAB_BAR;
  }

  return TAB_BAR_HEIGHT + safeAreaBottom + FAB_GAP_ABOVE_TAB_BAR;
}
