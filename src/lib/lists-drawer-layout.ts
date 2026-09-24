const DRAWER_WIDTH_RATIO = 0.84;
const MAX_DRAWER_WIDTH = 320;
/** Keep 35% of the base right gap — drawer sits 65% closer to the screen edge. */
const DRAWER_RIGHT_GAP_FACTOR = 0.35;

export function computeListsDrawerWidth(windowWidth: number) {
  const baseWidth = Math.min(windowWidth * DRAWER_WIDTH_RATIO, MAX_DRAWER_WIDTH);
  const rightGap = windowWidth - baseWidth;
  return Math.round(windowWidth - rightGap * DRAWER_RIGHT_GAP_FACTOR);
}

/** Share of screen width (from the left edge) where a swipe can begin. */
const LISTS_DRAWER_SWIPE_EDGE_RATIO = 10;
/** Extra swipe-start width (px) extending the edge zone toward the center. */
const LISTS_DRAWER_SWIPE_EDGE_EXTRA_PX = 150;

export function computeListsDrawerSwipeEdgeWidth(windowWidth: number) {
  return (
    Math.round(windowWidth * LISTS_DRAWER_SWIPE_EDGE_RATIO) +
    LISTS_DRAWER_SWIPE_EDGE_EXTRA_PX
  );
}
