import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNetworkStatus } from "@/lib/offline/network-status";
import {
  discardFailedSync,
  retryFailedSync,
  syncNow,
  useSyncStatus,
} from "@/lib/offline/sync-engine";

function changesLabel(count: number) {
  return count === 1 ? "1 change" : `${count} changes`;
}

/** Shows only when something is off: offline, unsynced changes, or changes the server rejected. */
export function SyncStatusPill() {
  const insets = useSafeAreaInsets();
  const online = useNetworkStatus();
  const { syncing, pendingCount, failedCount } = useSyncStatus();

  if (online && pendingCount === 0 && failedCount === 0) return null;

  let message: string;
  let action: { label: string; onPress: () => void } | null = null;

  if (failedCount > 0 && online) {
    message = `${changesLabel(failedCount)} couldn't sync`;
    action = { label: "Retry", onPress: retryFailedSync };
  } else if (!online) {
    message = pendingCount > 0 ? `Offline · ${changesLabel(pendingCount)} pending` : "Offline";
  } else if (syncing) {
    message = `Syncing ${changesLabel(pendingCount)}…`;
  } else {
    message = `${changesLabel(pendingCount)} pending`;
    action = { label: "Sync now", onPress: () => void syncNow() };
  }

  return (
    <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + 2 }]}>
      <View style={styles.pill} accessibilityRole="summary" accessibilityLabel={message}>
        {!online ? <View style={styles.offlineDot} /> : null}
        {online && syncing ? <ActivityIndicator size="small" color="#7a8494" /> : null}
        <Text style={styles.text}>{message}</Text>
        {action ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={action.onPress}>
            <Text style={styles.action}>{action.label}</Text>
          </Pressable>
        ) : null}
        {failedCount > 0 && online ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={discardFailedSync}>
            <Text style={styles.discard}>Discard</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    maxWidth: "90%",
  },
  offlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#a5a5a9",
  },
  text: {
    fontSize: 13,
    fontWeight: "500",
    color: "#3a3f47",
  },
  action: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4873c7",
  },
  discard: {
    fontSize: 13,
    fontWeight: "500",
    color: "#c2410c",
  },
});
