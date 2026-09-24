import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ListsDrawerShell } from "@/components/lists-drawer-shell";
import { useApp } from "@/contexts/app-context";
import { TAB_BAR_HEIGHT } from "@/constants/tab-bar";

function isTasksPathname(pathname: string) {
  return pathname === "/tasks" || pathname.endsWith("/tasks");
}

function isListsTabPathname(pathname: string) {
  return pathname === "/" || pathname === "/index";
}

export function ListsDrawerOverlay() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const {
    listsDrawerOpen,
    openListsDrawerPanel,
    openTasksForDrawerSelection,
    flushDrawerCloseAction,
  } = useApp();

  useEffect(() => {
    if (!listsDrawerOpen) {
      flushDrawerCloseAction();
    }
  }, [flushDrawerCloseAction, listsDrawerOpen]);

  const onTasks = isTasksPathname(pathname);
  const onListsTab = isListsTabPathname(pathname);
  if (!onTasks && !onListsTab && !listsDrawerOpen) {
    return null;
  }

  const tabBarOffset = TAB_BAR_HEIGHT + insets.bottom;
  const allowTouchPassthrough = onTasks && !listsDrawerOpen;

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, styles.overlayHost, { bottom: tabBarOffset }]}>
      <ListsDrawerShell
        open={listsDrawerOpen}
        onOpen={openListsDrawerPanel}
        onClose={openTasksForDrawerSelection}
        swipeEnabled={onTasks || onListsTab}
        style={[
          styles.drawerHost,
          allowTouchPassthrough && styles.drawerHostPassthrough,
        ]}>
        <View pointerEvents="none" style={styles.backdropContent} />
      </ListsDrawerShell>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayHost: {
    zIndex: 100,
  },
  drawerHost: {
    flex: 1,
  },
  drawerHostPassthrough: {
    pointerEvents: "box-none",
  },
  backdropContent: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
