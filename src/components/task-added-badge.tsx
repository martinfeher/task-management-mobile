import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/app-context";

export function TaskAddedBadge() {
  const insets = useSafeAreaInsets();
  const { taskAddedToast, clearTaskAddedToast } = useApp();

  useEffect(() => {
    if (!taskAddedToast) return;
    const timer = setTimeout(() => {
      clearTaskAddedToast();
    }, 2600);
    return () => clearTimeout(timer);
  }, [taskAddedToast, clearTaskAddedToast]);

  if (!taskAddedToast) return null;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent>
      <View pointerEvents="box-none" style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Task added to ${taskAddedToast}`}
          onPress={clearTaskAddedToast}
          style={[styles.badge, { marginTop: insets.top + 8 }]}>
          <Text style={styles.badgeText}>Task added to {taskAddedToast}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    maxWidth: "88%",
  },
  badgeText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  chevron: {
    fontSize: 18,
    color: "#8a8a8a",
    marginTop: -1,
  },
});
