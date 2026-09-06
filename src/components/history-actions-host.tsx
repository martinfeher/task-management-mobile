import { Platform, Pressable, StyleSheet, View } from "react-native";
import { FullWindowOverlay } from "react-native-screens";

import { AppSymbol } from "@/components/app-symbol";
import { Spacing } from "@/constants/theme";
import type { HistoryActionsRegistration } from "@/contexts/history-actions-toolbar-context";

const HISTORY_ACTION_ICON_SIZE = 16;
const ACTION_BUTTON_SIZE = 34;

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
  } = registration;

  const showUndoRedo = canUndo || canRedo;
  if (!showUndoRedo) return null;

  const content = (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={[styles.container, { bottom }]} pointerEvents="box-none">
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
  container: {
    position: "absolute",
    right: Spacing.three,
    zIndex: 50,
    elevation: 50,
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
});
