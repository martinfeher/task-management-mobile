import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LiquidGlassSurface } from "@/components/liquid-glass-surface";

export type CalendarViewMode = "day" | "threeDay" | "week" | "month";

export type CalendarViewPickerAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
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

type CalendarViewPickerSheetProps = {
  visible: boolean;
  activeView: CalendarViewMode;
  hideActiveHighlight?: boolean;
  anchor: CalendarViewPickerAnchor | null;
  onSelectView: (view: CalendarViewMode) => void;
  onClose: () => void;
};

function getPopupStyle(anchor: CalendarViewPickerAnchor) {
  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
  const anchorRight = anchor.x + anchor.width;
  const right = Math.max(SCREEN_INSET, windowWidth - anchorRight);
  const bottom = Math.max(SCREEN_INSET, windowHeight - anchor.y + POPUP_GAP);

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
  if (!anchor) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
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
                  <Text style={styles.menuLabel}>{option.label}</Text>
                </Pressable>
              </View>
            );
          })}
        </LiquidGlassSurface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "transparent",
  },
  popupAnchor: {
    position: "absolute",
  },
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
