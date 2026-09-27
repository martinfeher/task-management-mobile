import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { IoAddOutlineIcon } from "@/components/io-add-outline-icon";
import { LiquidGlassSurface } from "@/components/liquid-glass-surface";
import { ListsCreateSubmenu } from "@/components/lists-create-submenu";

const CREATE_COLOR = "#6f88e7";
const CREATE_ICON_SIZE = 22;
const CREATE_TEXT_LINE_HEIGHT = 17;

type ListsCreateButtonProps = {
  onCreateList: () => void;
  onCreateFolder: () => void;
  onCreateLabel: () => void;
};

export function ListsCreateButton({
  onCreateList,
  onCreateFolder,
  onCreateLabel,
}: ListsCreateButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  function runAfterMenuClose(action: () => void) {
    closeMenu();
    setTimeout(action, 100);
  }

  function handleCreateList() {
    runAfterMenuClose(onCreateList);
  }

  function handleCreateFolder() {
    runAfterMenuClose(onCreateFolder);
  }

  function handleCreateLabel() {
    runAfterMenuClose(onCreateLabel);
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
        <View
          className="absolute bottom-[51px] left-4 z-[99999]"
          style={{ elevation: 99999 }}
        >
          <ListsCreateSubmenu
            onCreateList={handleCreateList}
            onCreateFolder={handleCreateFolder}
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
          <View className="flex-row items-center gap-1.5 px-[10px] py-[8px]">
            <View
              className="items-center justify-center"
              style={{ width: CREATE_ICON_SIZE, height: CREATE_ICON_SIZE }}
            >
              <IoAddOutlineIcon
                width={CREATE_ICON_SIZE}
                height={CREATE_ICON_SIZE}
                color={CREATE_COLOR}
              />
            </View>
            <View
              className="justify-center"
              style={{ height: CREATE_ICON_SIZE }}
            >
              <Text
                className="text-[17px] mt-[3px] pr-[3px] font-medium text-[#6f88e7]"
                style={{
                  lineHeight: CREATE_TEXT_LINE_HEIGHT,
                  includeFontPadding: false,
                  ...(Platform.OS === "android"
                    ? { textAlignVertical: "center" as const }
                    : null),
                }}
              >
                Create
              </Text>
            </View>
          </View>
        </LiquidGlassSurface>
      </Pressable>
    </View>
  );
}
