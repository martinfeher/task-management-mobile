import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { AppSymbol } from "@/components/app-symbol";

type SidebarRowProps = {
  title: string;
  count?: number;
  alwaysShowCount?: boolean;
  colorDot?: string;
  selected?: boolean;
  icon?: ReactNode;
  showMenu?: boolean;
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
  onPress,
  onLongPress,
  onPressMenu,
}: SidebarRowProps) {
  return (
    <View
      className={`mx-1.5 mb-px min-h-[45px] flex-row items-center gap-2 rounded-[3px] border-l-2 px-3 ${
        selected
          ? "border-l-lists-accentBorder bg-lists-selected/50"
          : "border-l-transparent"
      }`}>
      {icon ? (
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={150}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={title}
          className="items-center justify-center active:opacity-85">
          <View className="w-[22px] items-center">{icon}</View>
        </Pressable>
      ) : null}

      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={150}
        accessibilityRole="button"
        accessibilityLabel={title}
        className="min-w-0 flex-1 flex-row items-center gap-2 active:opacity-85">
        <Text
          className={`flex-1 text-[15px] leading-[21px] ${
            selected ? "font-medium text-[#111111]" : "font-normal text-zinc-700"
          }`}
          numberOfLines={1}>
          {title}
        </Text>
        {colorDot ? (
          <View
            className="mr-1.5 h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: colorDot }}
          />
        ) : null}
        {count !== undefined && (alwaysShowCount || count > 0) ? (
          <Text className="min-w-5 pr-1 text-right text-xs tabular-nums text-zinc-400">
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
          className="h-7 w-7 items-center justify-center rounded-lg active:bg-zinc-200/80">
          <AppSymbol
            ios="ellipsis"
            android="more-horiz"
            size={19}
            tintColor="#777777"
          />
        </Pressable>
      ) : null}
    </View>
  );
}
