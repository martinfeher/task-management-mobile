import { Pressable, StyleSheet, Text, View } from "react-native";

import { LiquidGlassSurface } from "@/components/liquid-glass-surface";

type ListsCreateSubmenuProps = {
  onCreateList: () => void;
  onCreateFolder: () => void;
  onCreateLabel: () => void;
};

export function ListsCreateSubmenu({
  onCreateList,
  onCreateFolder,
  onCreateLabel,
}: ListsCreateSubmenuProps) {
  return (
    <LiquidGlassSurface style={styles.menu} borderRadius={13} isInteractive>
      <Pressable
        style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
        accessibilityRole="button"
        accessibilityLabel="Create list"
        onPress={onCreateList}
      >
        <Text style={styles.menuLabel}>List</Text>
      </Pressable>
      <View style={styles.menuDivider} />
      <Pressable
        style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
        accessibilityRole="button"
        accessibilityLabel="Create folder"
        onPress={onCreateFolder}
      >
        <Text style={styles.menuLabel}>Folder</Text>
      </Pressable>
      <View style={styles.menuDivider} />
      <Pressable
        style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
        accessibilityRole="button"
        accessibilityLabel="Create label"
        onPress={onCreateLabel}
      >
        <Text style={styles.menuLabel}>Label</Text>
      </Pressable>
    </LiquidGlassSurface>
  );
}

const styles = StyleSheet.create({
  menu: {
    minWidth: 132,
  },
  menuRow: {
    minHeight: 46,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  menuRowPressed: {
    backgroundColor: "rgba(244, 244, 245, 0.45)",
  },
  menuLabel: {
    fontSize: 16,
    color: "#111827",
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(229, 231, 235, 0.85)",
    marginHorizontal: 12,
  },
});
