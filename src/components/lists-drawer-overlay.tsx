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

export function ListsDrawerOverlay() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const {
    listsDrawerOpen,
    setListsDrawerOpen,
    openTasksForDrawerSelection,
    flushDrawerCloseAction,
  } = useApp();

  useEffect(() => {
    if (!listsDrawerOpen) {
      flushDrawerCloseAction();
    }
  }, [flushDrawerCloseAction, listsDrawerOpen]);

  if (isTasksPathname(pathname)) {
    return null;
  }

  if (!listsDrawerOpen) {
    return null;
  }

  const tabBarOffset = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, styles.overlayHost, { bottom: tabBarOffset }]}>
      <ListsDrawerShell
        open={listsDrawerOpen}
        onOpen={() => setListsDrawerOpen(true)}
        onClose={openTasksForDrawerSelection}
        style={styles.drawerHost}>
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
  backdropContent: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
