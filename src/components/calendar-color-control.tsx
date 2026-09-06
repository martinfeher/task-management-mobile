import { Pressable, StyleSheet, View } from "react-native";

import { Spacing } from "@/constants/theme";
import { CALENDAR_COLOR_OPTIONS } from "@/lib/calendar-colors";

const COLOR_SWATCH_SIZE = 22;
const COLOR_SWATCH_RADIUS = 4;
const COLOR_PICKER_SWATCH_SIZE = 28;
const COLOR_PICKER_COLUMNS = 4;
const ACTION_BUTTON_SIZE = 34;
const COLOR_PICKER_BELOW_GAP = 10;
export const CALENDAR_COLOR_RIGHT_INSET = 6;

const CONTENT_PADDING_RIGHT = Spacing.three - 2;
const TITLE_COLOR_RIGHT_OFFSET = -(CONTENT_PADDING_RIGHT - CALENDAR_COLOR_RIGHT_INSET);

type CalendarColorControlProps = {
  color: string;
  pickerOpen: boolean;
  onTogglePicker: () => void;
  onSelectColor: (color: string) => void;
  onClosePicker: () => void;
  onKeepKeyboardFocus?: () => void;
};

export function CalendarColorControl({
  color,
  pickerOpen,
  onTogglePicker,
  onSelectColor,
  onClosePicker,
  onKeepKeyboardFocus,
}: CalendarColorControlProps) {
  return (
    <View style={styles.anchor} pointerEvents="box-none">
      {pickerOpen ? (
        <View style={styles.colorPickerPopup} pointerEvents="box-none">
          <View style={styles.colorPickerCard}>
            <View style={styles.colorGrid}>
              {CALENDAR_COLOR_OPTIONS.map((optionColor) => {
                const selected =
                  optionColor.toLowerCase() === color.toLowerCase();
                return (
                  <Pressable
                    key={optionColor}
                    accessibilityRole="button"
                    accessibilityLabel={`Set calendar color ${optionColor}`}
                    onPress={() => onSelectColor(optionColor)}
                    style={[
                      styles.colorPickerSwatch,
                      { backgroundColor: optionColor },
                      selected && styles.colorPickerSwatchSelected,
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </View>
      ) : null}

      <Pressable
        style={styles.colorButton}
        onPressIn={onKeepKeyboardFocus}
        onPress={onTogglePicker}
        accessibilityRole="button"
        accessibilityLabel="Calendar color"
        accessibilityState={{ expanded: pickerOpen }}>
        <View style={[styles.colorSwatch, { backgroundColor: color }]} />
      </Pressable>
    </View>
  );
}

export const calendarColorTitleReserveSpace = ACTION_BUTTON_SIZE + Spacing.one;

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    right: TITLE_COLOR_RIGHT_OFFSET,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 40,
    elevation: 40,
  },
  colorButton: {
    width: ACTION_BUTTON_SIZE,
    height: ACTION_BUTTON_SIZE,
    borderRadius: COLOR_SWATCH_RADIUS,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatch: {
    width: COLOR_SWATCH_SIZE,
    height: COLOR_SWATCH_SIZE,
    borderRadius: COLOR_SWATCH_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  colorPickerPopup: {
    position: "absolute",
    top: "50%",
    marginTop: ACTION_BUTTON_SIZE / 2 + COLOR_PICKER_BELOW_GAP,
    right: 0,
    zIndex: 41,
    elevation: 41,
  },
  colorPickerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  colorGrid: {
    width:
      COLOR_PICKER_COLUMNS * COLOR_PICKER_SWATCH_SIZE +
      (COLOR_PICKER_COLUMNS - 1) * 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorPickerSwatch: {
    width: COLOR_PICKER_SWATCH_SIZE,
    height: COLOR_PICKER_SWATCH_SIZE,
    borderRadius: COLOR_SWATCH_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  colorPickerSwatchSelected: {
    borderWidth: 2,
    borderColor: "#111827",
  },
});
