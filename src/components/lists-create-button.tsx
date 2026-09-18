import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { IoAddOutlineIcon } from "@/components/io-add-outline-icon";
import { LiquidGlassSurface } from "@/components/liquid-glass-surface";
import { ListsCreateSubmenu } from "@/components/lists-create-submenu";

const CREATE_COLOR = "#6f88e7";
const CREATE_GAP_ABOVE_TAB_BAR = 9;
const CREATE_ICON_WIDTH = 25;
const CREATE_ICON_HEIGHT = 26;
const CREATE_LEFT_INSET = 16;
const MENU_GAP_ABOVE_BUTTON = 8;

type ListsCreateButtonProps = {
  onCreateList: () => void;
  onCreateLabel: () => void;
};

export function ListsCreateButton({
  onCreateList,
  onCreateLabel,
}: ListsCreateButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleCreateList() {
    closeMenu();
    onCreateList();
  }

  function handleCreateLabel() {
    closeMenu();
    onCreateLabel();
  }

  return (
    <View pointerEvents="box-none" style={styles.host}>
      {menuOpen ? (
        <Pressable
          style={styles.backdrop}
          onPress={closeMenu}
          accessibilityRole="button"
          accessibilityLabel="Dismiss create menu"
        />
      ) : null}

      {menuOpen ? (
        <View style={styles.menuHost}>
          <ListsCreateSubmenu
            onCreateList={handleCreateList}
            onCreateLabel={handleCreateLabel}
          />
        </View>
      ) : null}

      <Pressable
        style={styles.buttonHost}
        accessibilityRole="button"
        accessibilityLabel="Create"
        accessibilityState={{ expanded: menuOpen }}
        onPress={() => setMenuOpen((open) => !open)}
      >
        <LiquidGlassSurface
          style={styles.buttonGlass}
          borderRadius={12}
          isInteractive
        >
          <View style={styles.buttonContent}>
            <IoAddOutlineIcon
              width={CREATE_ICON_WIDTH}
              height={CREATE_ICON_HEIGHT}
              color={CREATE_COLOR}
            />
            <Text style={styles.buttonLabel}>Create</Text>
          </View>
        </LiquidGlassSurface>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 99998,
    elevation: 99998,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  buttonHost: {
    position: "absolute",
    left: CREATE_LEFT_INSET,
    bottom: CREATE_GAP_ABOVE_TAB_BAR,
  },
  buttonGlass: {
    alignSelf: "flex-start",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 9,
  },
  buttonLabel: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: "500",
    color: CREATE_COLOR,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
  },
  menuHost: {
    position: "absolute",
    left: CREATE_LEFT_INSET,
    bottom: CREATE_GAP_ABOVE_TAB_BAR + 34 + MENU_GAP_ABOVE_BUTTON,
  },
});
