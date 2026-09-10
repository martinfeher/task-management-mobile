import { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Drawer } from "react-native-drawer-layout";

import { ListsDrawerContent } from "@/components/lists-drawer-content";
import { useApp } from "@/contexts/app-context";
import { TAB_BAR_HEIGHT } from "@/constants/tab-bar";

const DRAWER_WIDTH_RATIO = 0.84;
const MAX_DRAWER_WIDTH = 320;
/** Keep 35% of the base right gap — drawer sits 65% closer to the screen edge. */
const DRAWER_RIGHT_GAP_FACTOR = 0.35;

function computeDrawerWidth(windowWidth: number) {
  const baseWidth = Math.min(windowWidth * DRAWER_WIDTH_RATIO, MAX_DRAWER_WIDTH);
  const rightGap = windowWidth - baseWidth;
  return Math.round(windowWidth - rightGap * DRAWER_RIGHT_GAP_FACTOR);
}

export function ListsDrawerOverlay() {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const drawerWidth = computeDrawerWidth(windowWidth);
  const {
    listsDrawerOpen,
    setListsDrawerOpen,
    closeListsDrawer,
    flushDrawerCloseAction,
  } = useApp();

  useEffect(() => {
    if (!listsDrawerOpen) {
      flushDrawerCloseAction();
    }
  }, [flushDrawerCloseAction, listsDrawerOpen]);

  if (!listsDrawerOpen) {
    return null;
  }

  const tabBarOffset = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, styles.overlayHost, { bottom: tabBarOffset }]}>
      <Drawer
        open={listsDrawerOpen}
        onOpen={() => setListsDrawerOpen(true)}
        onClose={() => closeListsDrawer()}
        drawerPosition="left"
        drawerType="front"
        swipeEnabled={false}
        drawerStyle={{ width: drawerWidth }}
        overlayStyle={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}
        renderDrawerContent={() => <ListsDrawerContent />}>
        <View pointerEvents="none" style={styles.backdropContent} />
      </Drawer>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayHost: {
    zIndex: 100,
  },
  backdropContent: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
