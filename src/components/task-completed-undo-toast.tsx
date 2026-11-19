import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppSymbol } from "@/components/app-symbol";
import { TAB_BAR_HEIGHT } from "@/constants/tab-bar";
import { useApp } from "@/contexts/app-context";

/** How long the undo offer stays on screen after a task is completed. */
export const TASK_COMPLETE_UNDO_DURATION_MS = 6000;

const GAP_ABOVE_TAB_BAR = 12;
const HORIZONTAL_INSET = 16;

/**
 * Bottom snackbar shown for a few seconds after a task is completed, with an Undo
 * action and a countdown bar. Mounted once in the root layout; driven by `completionUndo`
 * in the app context so every completion path (lists, calendar, search, task sheet)
 * shares it.
 */
export function TaskCompletedUndoToast() {
  const insets = useSafeAreaInsets();
  const { completionUndo, dismissCompletionUndo, undoCompletion } = useApp();
  const progress = useSharedValue(1);
  const token = completionUndo?.token;

  useEffect(() => {
    if (token == null) return;

    progress.value = 1;
    progress.value = withTiming(0, {
      duration: TASK_COMPLETE_UNDO_DURATION_MS,
      easing: Easing.linear,
    });
    const timer = setTimeout(dismissCompletionUndo, TASK_COMPLETE_UNDO_DURATION_MS);
    return () => clearTimeout(timer);
  }, [token, dismissCompletionUndo, progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  if (!completionUndo) return null;

  const taskName = completionUndo.taskName.trim();

  function handleUndo() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void undoCompletion();
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: insets.bottom + TAB_BAR_HEIGHT + GAP_ABOVE_TAB_BAR },
      ]}
    >
      <View
        style={styles.card}
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={
          taskName ? `Task completed: ${taskName}` : "Task completed"
        }
      >
        <View style={styles.row}>
          <View style={styles.checkBadge}>
            <AppSymbol
              ios="checkmark"
              android="check"
              size={12}
              weight="bold"
              tintColor="#ffffff"
            />
          </View>
          <View style={styles.textColumn}>
            <Text style={styles.title} numberOfLines={1}>
              Task completed
            </Text>
            {taskName ? (
              <Text style={styles.taskName} numberOfLines={1}>
                {taskName}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={handleUndo}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={
              taskName ? `Undo completing ${taskName}` : "Undo completing task"
            }
            style={({ pressed }) => [
              styles.undoButton,
              pressed && styles.undoButtonPressed,
            ]}
          >
            <AppSymbol
              ios="arrow.uturn.backward"
              android="undo"
              size={14}
              weight="semibold"
              tintColor="#9db9f7"
            />
            <Text style={styles.undoLabel}>Undo</Text>
          </Pressable>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: HORIZONTAL_INSET,
    right: HORIZONTAL_INSET,
    alignItems: "center",
    zIndex: 50,
    elevation: 50,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#272c37",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOpacity: 0.28,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 10 },
      default: { boxShadow: "0px 8px 16px 0px rgba(0, 0, 0, 0.25)" },
    }),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 14,
    paddingRight: 10,
    paddingTop: 12,
    paddingBottom: 13,
  },
  checkBadge: {
    height: 24,
    width: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#34c759",
  },
  textColumn: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  taskName: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.62)",
  },
  undoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(157, 185, 247, 0.16)",
  },
  undoButtonPressed: {
    backgroundColor: "rgba(157, 185, 247, 0.3)",
  },
  undoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9db9f7",
  },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  progressFill: {
    height: 3,
    backgroundColor: "rgba(157, 185, 247, 0.7)",
  },
});
