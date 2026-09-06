import { BlurView } from "expo-blur";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FAB_RIGHT_INSET, getFabBottomOffset } from "@/constants/tab-bar";
import { useApp } from "@/contexts/app-context";

const FAB_SIZE = 55;
const FAB_RADIUS = FAB_SIZE / 2;

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
          { bottom: fabBottom - 42, right: FAB_RIGHT_INSET },
          animatedStyle,
        ]}
      >
        <View style={styles.fabSurface}>
          <BlurView
            intensity={60}
            tint="systemChromeMaterial"
            experimentalBlurMethod="dimezisBlurView"
            style={styles.blur}
          >
            <View className="absolute inset-0 items-center justify-center bg-[#6c82dc]">
              <View className="flex-1 justify-center">
                <Text
                  className="text-white text-[34px] font-light leading-[38px] text-center mb-[1px]"
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
        </View>
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
    height: FAB_SIZE,
    width: FAB_SIZE,
    borderRadius: FAB_RADIUS,
    backgroundColor: "#6c82dc",
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
  fabSurface: {
    flex: 1,
    borderRadius: FAB_RADIUS,
    overflow: "hidden",
  },
  blur: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: FAB_RADIUS,
  },
  plusWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6c82dc",
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
