import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { VscSyncIcon } from "@/components/vsc-sync-icon";
import { syncNow, useSyncStatus } from "@/lib/offline/sync-engine";

const SYNC_ICON_COLOR = "#bdbdcd";
const SYNC_ICON_SIZE = 20;

/** Manual sync control for the task list header. */
export function TaskListSyncButton() {
  const { syncing, online } = useSyncStatus();
  const spin = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!syncing) {
      cancelAnimation(spin);
      cancelAnimation(pulse);
      spin.value = withTiming(0, { duration: 200 });
      pulse.value = withTiming(1, { duration: 200 });
      return;
    }

    spin.value = withRepeat(
      withTiming(360, { duration: 2_800, easing: Easing.linear }),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withTiming(0.72, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse, spin, syncing]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
    opacity: syncing ? pulse.value : 1,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        syncing ? "Syncing with server" : "Sync local changes with server"
      }
      accessibilityState={{ busy: syncing }}
      disabled={syncing}
      hitSlop={8}
      onPress={() => void syncNow()}
      style={({ pressed }) => [
        styles.button,
        !online && styles.buttonOffline,
        pressed && !syncing && styles.buttonPressed,
      ]}
    >
      <Animated.View style={animatedStyle}>
        <VscSyncIcon size={SYNC_ICON_SIZE} color={SYNC_ICON_COLOR} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 32,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  buttonPressed: {
    opacity: 0.65,
  },
  buttonOffline: {
    opacity: 0.45,
  },
});