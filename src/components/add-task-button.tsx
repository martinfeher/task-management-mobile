import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useMemo, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ADD_TASK_FAB_SIZE,
  FAB_BOTTOM_NUDGE,
  FAB_RIGHT_INSET,
  getFabBottomOffset,
} from "@/constants/tab-bar";
import { useApp } from "@/contexts/app-context";
import { getCallstackLiquidGlass } from "@/lib/callstack-liquid-glass";

const FAB_SIZE = ADD_TASK_FAB_SIZE;
const FAB_RADIUS = FAB_SIZE / 2;
const FAB_TINT = "#007AFF";

const USE_EXPO_LIQUID_GLASS =
  Platform.OS === "ios" && isLiquidGlassAvailable();

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type AddTaskButtonProps = {
  onPress?: () => void;
  /** Set when the FAB host already ends at the top of the bottom tab bar (lists drawer). */
  parentEndsAtTabBarTop?: boolean;
};

function AddTaskButtonGlass({ children }: { children: ReactNode }) {
  const callstackLiquidGlass = useMemo(() => getCallstackLiquidGlass(), []);

  if (callstackLiquidGlass?.isLiquidGlassSupported) {
    const { LiquidGlassView } = callstackLiquidGlass;
    return (
      <LiquidGlassView
        effect="regular"
        tintColor={FAB_TINT}
        interactive
        style={styles.glass}
      >
        {children}
      </LiquidGlassView>
    );
  }

  if (USE_EXPO_LIQUID_GLASS) {
    return (
      <GlassView
        glassEffectStyle="regular"
        isInteractive
        tintColor={FAB_TINT}
        style={styles.glass}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View style={styles.glass}>
      <BlurView
        intensity={60}
        tint="systemChromeMaterial"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.fallbackTint} pointerEvents="none" />
      {children}
    </View>
  );
}

/**
 * Circular liquid-glass FAB. Render inside Lists / Tasks screens (not under NativeTabs root).
 */
export function AddTaskButton({
  onPress,
  parentEndsAtTabBarTop = false,
}: AddTaskButtonProps = {}) {
  const insets = useSafeAreaInsets();
  const { startAddingTask } = useApp();
  const scale = useSharedValue(1);
  const fabBottom = getFabBottomOffset(insets.bottom, parentEndsAtTabBarTop);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    if (onPress) {
      onPress();
      return;
    }
    startAddingTask({ stayOnPage: true });
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Add new task"
      hitSlop={16}
      onPressIn={() => {
        scale.value = withSpring(0.92, { damping: 16, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 320 });
      }}
      onPress={handlePress}
      style={[
        styles.fab,
        { bottom: fabBottom - FAB_BOTTOM_NUDGE, right: FAB_RIGHT_INSET },
        animatedStyle,
      ]}
    >
      <AddTaskButtonGlass>
        <Text style={styles.plus} allowFontScaling={false}>
          +
        </Text>
      </AddTaskButtonGlass>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    zIndex: 20,
    elevation: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 8,
      },
      default: {
        boxShadow: "0px 4px 12px 0px rgba(0, 0, 0, 0.1)",
      },
    }),
  },
  glass: {
    height: FAB_SIZE,
    width: FAB_SIZE,
    borderRadius: FAB_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fallbackTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 122, 255, 0.88)",
  },
  plus: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "300",
    lineHeight: 38,
    includeFontPadding: false,
    textAlign: "center",
    marginTop: Platform.OS === "android" ? -2 : -1,
  },
});
