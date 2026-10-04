import { Pressable, StyleSheet, Text, View } from "react-native";

import { BiCalendarWeekIcon } from "@/components/bi-calendar-week-icon";
import { HiOutlineViewColumnsIcon } from "@/components/hi-outline-view-columns-icon";
import { WiDayHazeIcon } from "@/components/wi-day-haze-icon";
import { LiquidGlassSurface } from "@/components/liquid-glass-surface";
import { MdCalendarMonthIcon } from "@/components/md-calendar-month-icon";

export type CalendarViewMode = "day" | "threeDay" | "week" | "month";

export type CalendarViewPickerAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Size of the overlay host (calendar panel), for positioning above the FAB. */
  hostWidth: number;
  hostHeight: number;
};

export const CALENDAR_VIEW_OPTIONS: {
  id: CalendarViewMode;
  label: string;
}[] = [
  { id: "day", label: "Day" },
  { id: "threeDay", label: "3-Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

const POPUP_GAP = 10;
const SCREEN_INSET = 12;
const CALENDAR_VIEW_OPTION_ICON_COLOR = "#b7b7b8";
const CALENDAR_VIEW_OPTION_ICON_SIZE = 20;

function CalendarViewOptionIcon({ id }: { id: CalendarViewMode }) {
  const iconProps = {
    size: CALENDAR_VIEW_OPTION_ICON_SIZE,
    color: CALENDAR_VIEW_OPTION_ICON_COLOR,
  };

  switch (id) {
    case "day":
      return <WiDayHazeIcon {...iconProps} />;
    case "threeDay":
      return <HiOutlineViewColumnsIcon {...iconProps} />;
    case "week":
      return <BiCalendarWeekIcon {...iconProps} />;
    case "month":
      return <MdCalendarMonthIcon {...iconProps} />;
  }
}

type CalendarViewPickerSheetProps = {
  visible: boolean;
  activeView: CalendarViewMode;
  hideActiveHighlight?: boolean;
  anchor: CalendarViewPickerAnchor | null;
  onSelectView: (view: CalendarViewMode) => void;
  onClose: () => void;
};

function getPopupStyle(anchor: CalendarViewPickerAnchor) {
  const anchorRight = anchor.x + anchor.width;
  const right = Math.max(SCREEN_INSET, anchor.hostWidth - anchorRight);
  const bottom = Math.max(SCREEN_INSET, anchor.hostHeight - anchor.y + POPUP_GAP);

  return {
    right,
    bottom,
  };
}

export function CalendarViewPickerSheet({
  visible,
  activeView,
  hideActiveHighlight = false,
  anchor,
  onSelectView,
  onClose,
}: CalendarViewPickerSheetProps) {
  if (!visible || !anchor) return null;

  return (
    <View
      style={styles.overlay}
      pointerEvents="box-none"
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.popupAnchor, getPopupStyle(anchor)]}>
        <LiquidGlassSurface style={styles.menu} borderRadius={13} isInteractive>
          {CALENDAR_VIEW_OPTIONS.map((option, index) => {
            const selected =
              !hideActiveHighlight && activeView === option.id;

            return (
              <View key={option.id}>
                {index > 0 ? <View style={styles.menuDivider} /> : null}
                <Pressable
                  style={({ pressed }) => [
                    styles.menuRow,
                    pressed && styles.menuRowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${option.label} view`}
                  onPress={() => {
                    onSelectView(option.id);
                    onClose();
                  }}
                >
                  <View style={styles.menuRowContent}>
                    <CalendarViewOptionIcon id={option.id} />
                    <Text style={styles.menuLabel}>{option.label}</Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </LiquidGlassSurface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 25,
    elevation: 25,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "transparent",
  },
  popupAnchor: {
    position: "absolute",
  },
  menu: {
    minWidth: 152,
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
    color: "#70737E",
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(229, 231, 235, 0.85)",
    marginHorizontal: 12,
  },
});
