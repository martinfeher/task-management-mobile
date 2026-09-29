import type { ReactNode } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { AppSymbol } from "@/components/app-symbol";

const SIDEBAR_MENU_ICON_COLOR = "#c5c5c5";

/** Selection is indicated by the row icon only, not by a row background. */
export const SIDEBAR_SELECTED_ICON_COLOR = "#585858";

type SidebarRowProps = {
  title: string;
  count?: number;
  alwaysShowCount?: boolean;
  colorDot?: string;
  selected?: boolean;
  icon?: ReactNode;
  showMenu?: boolean;
  countNudgeLeft?: number;
  titleNudgeRight?: number;
  nested?: boolean;
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
  titleNudgeRight = 0,
  nested = false,
  onPress,
  onLongPress,
  onPressMenu,
}: SidebarRowProps) {
  return (
    <View
      className={`mb-px ${nested ? "ml-[13px]" : "ml-[2px]"} mr-1.5 min-h-[45px] flex-row items-stretch gap-2 rounded-[3px] border-l-2 border-l-transparent px-3`}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={250}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ selected }}
        className="min-w-0 flex-1 flex-row items-center gap-2 active:opacity-85"
      >
        {icon ? (
          <View className="h-[22px] w-[22px] mr-px shrink-0 items-center justify-center">
            {icon}
          </View>
        ) : null}
        <Text
          className={`flex-1 shrink text-[17px] mb-[1px] font-normal leading-[22px] ${
            nested ? "text-[#676a6f]" : "text-zinc-700"
          }`}
          style={{ marginLeft: -4 + titleNudgeRight }}
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
            className="min-w-5 ml-2 text-right text-[11.5px] tabular-nums text-[#cdcdd2]"
            style={countNudgeLeft ? { marginRight: countNudgeLeft } : undefined}
          >
            {count}
          </Text>
        ) : null}
      </Pressable>

      {showMenu ? (
        <Pressable
          onPress={onPressMenu}
          accessibilityRole="button"
          accessibilityLabel={`Options for ${title}`}
          className="w-7 ml-[2px] shrink-0 items-center justify-center self-stretch rounded-lg active:bg-zinc-200/80"
        >
          <View style={{ marginLeft: 7 }}>
            <AppSymbol
              ios="ellipsis"
              android="more-horiz"
              size={12}
              tintColor={SIDEBAR_MENU_ICON_COLOR}
            />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
