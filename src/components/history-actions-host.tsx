import { Platform, Pressable, StyleSheet, View } from "react-native";
import { FullWindowOverlay } from "react-native-screens";

import { AppSymbol } from "@/components/app-symbol";
import { Spacing } from "@/constants/theme";
import type { HistoryActionsRegistration } from "@/contexts/history-actions-toolbar-context";
import { CALENDAR_COLOR_OPTIONS } from "@/lib/calendar-colors";

const HISTORY_ACTION_ICON_SIZE = 16;
const COLOR_SWATCH_SIZE = 22;
const COLOR_SWATCH_RADIUS = 4;
const COLOR_PICKER_SWATCH_SIZE = 28;
const COLOR_PICKER_COLUMNS = 4;
const ACTION_BUTTON_SIZE = 34;
const ACTIONS_COLUMN_GAP = 6;
const COLOR_PICKER_ABOVE_GAP = 10;

type HistoryActionsHostProps = {
  registration: HistoryActionsRegistration | null;
};

/**
 * Renders a floating undo/redo pair above the entire navigation stack
 * (mirrors TextFormatToolbarHost's FullWindowOverlay layering) so the
 * controls stay reachable while editing regardless of scroll position.
 */
export function HistoryActionsHost({ registration }: HistoryActionsHostProps) {
  if (!registration) return null;

  const {
    bottom,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onKeepKeyboardFocus,
    calendarColor,
  } = registration;

  const showUndoRedo = canUndo || canRedo;
  const colorSwatchTopFromBottom = calendarColor
    ? (showUndoRedo ? ACTION_BUTTON_SIZE + ACTIONS_COLUMN_GAP : 0) +
      ACTION_BUTTON_SIZE
    : 0;
  const colorPickerBottom = calendarColor
    ? bottom + colorSwatchTopFromBottom + COLOR_PICKER_ABOVE_GAP
    : bottom;

  const content = (
    <View style={styles.overlay} pointerEvents="box-none">
      {calendarColor?.pickerOpen ? (
        <Pressable
          style={styles.pickerBackdrop}
          onPress={calendarColor.onClosePicker}
          accessibilityRole="button"
          accessibilityLabel="Dismiss color picker"
        />
      ) : null}

      {calendarColor?.pickerOpen ? (
        <View
          style={[styles.colorPickerPopup, { bottom: colorPickerBottom }]}
          pointerEvents="box-none">
          <View style={styles.colorPickerCard}>
            <View style={styles.colorGrid}>
              {CALENDAR_COLOR_OPTIONS.map((optionColor) => {
                const selected =
                  optionColor.toLowerCase() ===
                  calendarColor.color.toLowerCase();
                return (
                  <Pressable
                    key={optionColor}
                    accessibilityRole="button"
                    accessibilityLabel={`Set calendar color ${optionColor}`}
                    onPress={() => calendarColor.onSelectColor(optionColor)}
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

      <View style={[styles.container, { bottom }]} pointerEvents="box-none">
        <View style={styles.actionsColumn}>
          {calendarColor ? (
            <Pressable
              style={styles.button}
              onPressIn={onKeepKeyboardFocus}
              onPress={calendarColor.onTogglePicker}
              accessibilityRole="button"
              accessibilityLabel="Calendar color"
              accessibilityState={{ expanded: calendarColor.pickerOpen }}>
              <View
                style={[
                  styles.colorSwatch,
                  { backgroundColor: calendarColor.color },
                ]}
              />
            </Pressable>
          ) : null}

          {showUndoRedo ? (
            <View style={styles.undoRedoRow}>
              <Pressable
                style={[styles.button, !canUndo && styles.buttonDisabled]}
                onPressIn={onKeepKeyboardFocus}
                onPress={onUndo}
                disabled={!canUndo}
                accessibilityRole="button"
                accessibilityLabel="Undo"
                accessibilityState={{ disabled: !canUndo }}>
                <AppSymbol
                  ios="arrow.uturn.backward"
                  android="undo"
                  size={HISTORY_ACTION_ICON_SIZE}
                  tintColor={canUndo ? "#374151" : "#c7c7cc"}
                />
              </Pressable>
              <Pressable
                style={[styles.button, !canRedo && styles.buttonDisabled]}
                onPressIn={onKeepKeyboardFocus}
                onPress={onRedo}
                disabled={!canRedo}
                accessibilityRole="button"
                accessibilityLabel="Redo"
                accessibilityState={{ disabled: !canRedo }}>
                <AppSymbol
                  ios="arrow.uturn.forward"
                  android="redo"
                  size={HISTORY_ACTION_ICON_SIZE}
                  tintColor={canRedo ? "#374151" : "#c7c7cc"}
                />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );

  if (Platform.OS === "web") {
    return content;
  }

  return <FullWindowOverlay>{content}</FullWindowOverlay>;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  container: {
    position: "absolute",
    right: Spacing.three,
    zIndex: 50,
    elevation: 50,
  },
  actionsColumn: {
    alignItems: "center",
    gap: ACTIONS_COLUMN_GAP,
  },
  undoRedoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  button: {
    width: ACTION_BUTTON_SIZE,
    height: ACTION_BUTTON_SIZE,
    borderRadius: ACTION_BUTTON_SIZE / 2,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.55,
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
    right: Spacing.three,
    zIndex: 51,
    elevation: 51,
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
    width: COLOR_PICKER_COLUMNS * COLOR_PICKER_SWATCH_SIZE + (COLOR_PICKER_COLUMNS - 1) * 10,
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
