import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CiFolderOnIcon } from "@/components/ci-folder-on-icon";
import { LiquidGlassSurface } from "@/components/liquid-glass-surface";
import { PiTagThinIcon } from "@/components/pi-tag-thin-icon";
import { VscChecklistIcon } from "@/components/vsc-checklist-icon";

const CREATE_MENU_ICON_COLOR = "#c5c5c5";
const CREATE_MENU_ICON_SIZE = 18;

type ListsCreateSubmenuProps = {
  onCreateList: () => void;
  onCreateFolder: () => void;
  onCreateLabel: () => void;
};

function CreateMenuRow({
  icon,
  label,
  accessibilityLabel,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
    >
      <View style={styles.menuRowContent}>
        {icon}
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function ListsCreateSubmenu({
  onCreateList,
  onCreateFolder,
  onCreateLabel,
}: ListsCreateSubmenuProps) {
  return (
    <LiquidGlassSurface style={styles.menu} borderRadius={13} isInteractive>
      <CreateMenuRow
        icon={
          <VscChecklistIcon
            size={CREATE_MENU_ICON_SIZE}
            color={CREATE_MENU_ICON_COLOR}
          />
        }
        label="List"
        accessibilityLabel="Create list"
        onPress={onCreateList}
      />
      <View style={styles.menuDivider} />
      <CreateMenuRow
        icon={
          <CiFolderOnIcon
            size={CREATE_MENU_ICON_SIZE}
            color={CREATE_MENU_ICON_COLOR}
          />
        }
        label="Folder"
        accessibilityLabel="Create folder"
        onPress={onCreateFolder}
      />
      <View style={styles.menuDivider} />
      <CreateMenuRow
        icon={
          <PiTagThinIcon
            size={CREATE_MENU_ICON_SIZE}
            color={CREATE_MENU_ICON_COLOR}
          />
        }
        label="Label"
        accessibilityLabel="Create label"
        onPress={onCreateLabel}
      />
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
  menuRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
