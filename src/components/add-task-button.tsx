import { BlurView } from "expo-blur";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/app-context";
import {
  FAB_RIGHT_INSET,
  getFabBottomOffset,
} from "@/constants/tab-bar";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type AddTaskButtonProps = {
  onPress?: () => void;
  /** Set when the FAB host already ends at the top of the bottom tab bar (lists drawer). */
  parentEndsAtTabBarTop?: boolean;
};

/**
 * Circular blurred FAB. Render inside Lists / Tasks screens (not under NativeTabs root).
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
    <View pointerEvents="box-none" style={styles.host}>
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
          { bottom: fabBottom, right: FAB_RIGHT_INSET },
          animatedStyle,
        ]}
      >
        <BlurView
          intensity={60}
          tint="systemChromeMaterial"
          experimentalBlurMethod="dimezisBlurView"
          style={styles.blur}
        >
          <View className="absolute inset-0 items-center justify-center bg-[#70a6e0]">
            <View className="flex-1 justify-center">
              <Text
                className="text-white text-[36px] font-light leading-[40px] text-center mb-[1px]"
                style={{
                  includeFontPadding: false,
                  marginTop: Platform.OS === "android" ? -2 : -1,
                }}
                allowFontScaling={false}
              >
                +
              </Text>
            </View>
          </View>
        </BlurView>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
  },
  fab: {
    position: "absolute",
    height: 64,
    width: 64,
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  blur: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 32,
  },
  plusWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#70a6e0",
  },
  plus: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "300",
    lineHeight: 40,
    includeFontPadding: false,
    textAlign: "center",
    marginTop: Platform.OS === "android" ? -2 : -1,
  },
});
