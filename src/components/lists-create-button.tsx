import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { IoAddOutlineIcon } from "@/components/io-add-outline-icon";

const CREATE_COLOR = "#5f5f5f";
const CREATE_GAP_ABOVE_TAB_BAR = 6;
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
        <View style={styles.menu}>
          <Pressable
            style={({ pressed }) => [
              styles.menuRow,
              pressed && styles.menuRowPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create list"
            onPress={handleCreateList}
          >
            <Text style={styles.menuLabel}>List</Text>
          </Pressable>
          <View style={styles.menuDivider} />
          <Pressable
            style={({ pressed }) => [
              styles.menuRow,
              pressed && styles.menuRowPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create label"
            onPress={handleCreateLabel}
          >
            <Text style={styles.menuLabel}>Label</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Create"
        accessibilityState={{ expanded: menuOpen }}
        onPress={() => setMenuOpen((open) => !open)}
      >
        <IoAddOutlineIcon size={18} color={CREATE_COLOR} />
        <Text style={styles.buttonLabel}>Create</Text>
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
  button: {
    position: "absolute",
    left: CREATE_LEFT_INSET,
    bottom: CREATE_GAP_ABOVE_TAB_BAR,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 9,
    backgroundColor: "#ffffff",
    borderRadius: 12,
  },
  buttonPressed: {
    opacity: 0.65,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: CREATE_COLOR,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
  },
  menu: {
    position: "absolute",
    left: CREATE_LEFT_INSET,
    bottom: CREATE_GAP_ABOVE_TAB_BAR + 34 + MENU_GAP_ABOVE_BUTTON,
    minWidth: 132,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  menuRow: {
    minHeight: 42,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  menuRowPressed: {
    backgroundColor: "#f4f4f5",
  },
  menuLabel: {
    fontSize: 16,
    color: "#111827",
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 12,
  },
});
