import type { ReactNode } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { AppSymbol } from "@/components/app-symbol";

const SIDEBAR_MENU_ICON_SIZE = 18 * 0.86 * (1 - 0.13);
const SIDEBAR_MENU_ICON_COLOR = "#c5c5c5";

type SidebarRowProps = {
  title: string;
  count?: number;
  alwaysShowCount?: boolean;
  colorDot?: string;
  selected?: boolean;
  icon?: ReactNode;
  showMenu?: boolean;
  countNudgeLeft?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  onPressMenu?: () => void;
};

export function SidebarRow({
  title,
  count,
  alwaysShowCount = false,
  colorDot,
  selected = false,
  icon,
  showMenu = false,
  countNudgeLeft,
  onPress,
  onLongPress,
  onPressMenu,
}: SidebarRowProps) {
  return (
    <View
      className={`mb-px ml-[3px] mr-1.5 min-h-[45px] flex-row items-center gap-2 rounded-[3px] border-l-2 px-3 ${
        selected
          ? "border-l-lists-accent-border bg-lists-selected/50"
          : "border-l-transparent"
      }`}
    >
      {icon ? (
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={150}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={title}
          className="h-[22px] w-[22px] shrink-0 items-center justify-center active:opacity-85"
        >
          {icon}
        </Pressable>
      ) : null}

      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={150}
        accessibilityRole="button"
        accessibilityLabel={title}
        className="min-h-[22px] min-w-0 flex-1 flex-row items-center gap-2 active:opacity-85"
      >
        <Text
          className={`flex-1 shrink text-[17px] mb-[1px] leading-[22px] ${
            selected
              ? "font-medium text-[#111111]"
              : "font-normal text-zinc-700"
          }`}
          numberOfLines={1}
          {...(Platform.OS === "android"
            ? {
                includeFontPadding: false,
                textAlignVertical: "center" as const,
              }
            : {})}
        >
          {title}
        </Text>
        {colorDot ? (
          <View
            className="mr-1.5 h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: colorDot }}
          />
        ) : null}
        {count !== undefined && (alwaysShowCount || count > 0) ? (
          <Text
            className="min-w-5 ml-2 text-right text-xs tabular-nums text-[#cdcdd2]"
            style={countNudgeLeft ? { marginRight: countNudgeLeft } : undefined}
          >
            {count}
          </Text>
        ) : null}
      </Pressable>

      {showMenu ? (
        <Pressable
          onPress={onPressMenu}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Options for ${title}`}
          className="h-7 w-7 items-center justify-center rounded-lg active:bg-zinc-200/80"
        >
          <View style={{ marginLeft: 7 }}>
            <AppSymbol
              ios="ellipsis"
              android="more-horiz"
              size={SIDEBAR_MENU_ICON_SIZE}
              tintColor={SIDEBAR_MENU_ICON_COLOR}
            />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
