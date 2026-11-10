import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ListsDrawerShell } from "@/components/lists-drawer-shell";
import { useApp } from "@/contexts/app-context";
import { TAB_BAR_HEIGHT } from "@/constants/tab-bar";

function normalizeTabPathname(pathname: string) {
  const withoutGroup = pathname.replace(/\/\(tabs\)/g, "");
  const trimmed = withoutGroup.replace(/\/$/, "");
  return trimmed.length === 0 ? "/" : trimmed;
}

function isTasksPathname(pathname: string) {
  const normalized = normalizeTabPathname(pathname);
  return normalized === "/tasks" || normalized.endsWith("/tasks");
}

function isListsTabPathname(pathname: string) {
  const normalized = normalizeTabPathname(pathname);
  return normalized === "/" || normalized === "/index";
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

  if (isTasksPathname(pathname)) {
    return null;
  }

  const onListsTab = isListsTabPathname(pathname);
  if (!onListsTab && !listsDrawerOpen) {
    return null;
  }

  const tabBarOffset = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, styles.overlayHost, { bottom: tabBarOffset }]}>
      <ListsDrawerShell
        open={listsDrawerOpen}
        onOpen={openListsDrawerPanel}
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
