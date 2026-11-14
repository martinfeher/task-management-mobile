import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/auth-context";
import { isDevMobileSessionEnabled } from "@/lib/dev-mobile-session";
import { useNetworkStatus } from "@/lib/offline/network-status";
import { useSyncStatus } from "@/lib/offline/sync-engine";

/** Dev-only indicator when signed in via server-minted session (or dev build). */
export function DevSessionBanner() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const online = useNetworkStatus();
  const { pendingCount, failedCount } = useSyncStatus();

  if (!isDevMobileSessionEnabled() || !user) {
    return null;
  }

  const syncPillVisible = !online || pendingCount > 0 || failedCount > 0;
  const topOffset = insets.top + (syncPillVisible ? 36 : 2);

  return (
    <View pointerEvents="box-none" style={[styles.overlay, { top: topOffset }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Signs out so the next launch can mint a fresh dev session"
        onPress={() => void signOut()}
        style={styles.pill}
      >
        <View style={styles.accent} />
        <Text style={styles.text} numberOfLines={1}>
          Dev session · {user.email}
        </Text>
        <Text style={styles.action}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 90,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "100%",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#c4b5fd",
    backgroundColor: "rgba(245, 243, 255, 0.96)",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  accent: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#7c3aed",
  },
  text: {
    flexShrink: 1,
    color: "#5b21b6",
    fontSize: 12,
    fontWeight: "500",
  },
  action: {
    color: "#7c3aed",
    fontSize: 12,
    fontWeight: "600",
  },
});
