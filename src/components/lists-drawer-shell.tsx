import type { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { Drawer } from "react-native-drawer-layout";

import { ListsDrawerContent } from "@/components/lists-drawer-content";
import {
  computeListsDrawerSwipeEdgeWidth,
  computeListsDrawerWidth,
  LISTS_DRAWER_OVERLAY_COLOR,
} from "@/lib/lists-drawer-layout";

type ListsDrawerShellProps = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  swipeEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function ListsDrawerShell({
  open,
  onOpen,
  onClose,
  swipeEnabled = true,
  style,
  children,
}: ListsDrawerShellProps) {
  const { width: windowWidth } = useWindowDimensions();
  const drawerWidth = computeListsDrawerWidth(windowWidth);
  const swipeEdgeWidth = computeListsDrawerSwipeEdgeWidth(windowWidth);

  return (
    <Drawer
      open={open}
      onOpen={onOpen}
      onClose={onClose}
      drawerPosition="left"
      drawerType="front"
      swipeEnabled={swipeEnabled}
      swipeEdgeWidth={swipeEdgeWidth}
      drawerStyle={{ width: drawerWidth }}
      overlayStyle={styles.overlay}
      overlayAccessibilityLabel="Open tasks for selected list"
      style={style}
      renderDrawerContent={() => <ListsDrawerContent />}>
      {children}
    </Drawer>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: LISTS_DRAWER_OVERLAY_COLOR,
  },
});
