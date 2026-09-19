import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { IoAddOutlineIcon } from "@/components/io-add-outline-icon";
import { LiquidGlassSurface } from "@/components/liquid-glass-surface";
import { ListsCreateSubmenu } from "@/components/lists-create-submenu";

const CREATE_COLOR = "#6f88e7";
const CREATE_ICON_WIDTH = 25;
const CREATE_ICON_HEIGHT = 26;

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
    <View
      pointerEvents="box-none"
      className="absolute inset-0 z-[99998]"
      style={{ elevation: 99998 }}
    >
      {menuOpen ? (
        <Pressable
          className="absolute inset-0"
          onPress={closeMenu}
          accessibilityRole="button"
          accessibilityLabel="Dismiss create menu"
        />
      ) : null}

      {menuOpen ? (
        <View className="absolute bottom-[51px] left-4">
          <ListsCreateSubmenu
            onCreateList={handleCreateList}
            onCreateLabel={handleCreateLabel}
          />
        </View>
      ) : null}

      <Pressable
        className="absolute bottom-[9px] left-4"
        accessibilityRole="button"
        accessibilityLabel="Create"
        accessibilityState={{ expanded: menuOpen }}
        onPress={() => setMenuOpen((open) => !open)}
      >
        <LiquidGlassSurface borderRadius={16} isInteractive>
          <View className="flex-row items-center gap-1.5 px-[9px] py-2">
            <IoAddOutlineIcon
              width={CREATE_ICON_WIDTH}
              height={CREATE_ICON_HEIGHT}
              color={CREATE_COLOR}
            />
            <Text
              className="text-[17px] font-medium leading-5 text-[#6f88e7]"
              style={
                Platform.OS === "android"
                  ? { includeFontPadding: false }
                  : undefined
              }
            >
              Create
            </Text>
          </View>
        </LiquidGlassSurface>
      </Pressable>
    </View>
  );
}
