import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { API_BASE_URL } from "@/constants/api";
import { ensureNotificationPermissions } from "@/lib/notifications";

type SettingsModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.card}>
        <ThemedText style={styles.title}>Settings</ThemedText>

        <View style={styles.section}>
          <ThemedText style={styles.label}>API server</ThemedText>
          <ThemedText style={styles.value}>{API_BASE_URL}</ThemedText>
          <ThemedText style={styles.hint} themeColor="textSecondary">
            Set EXPO_PUBLIC_API_URL in .env and restart Expo to change this.
          </ThemedText>
        </View>

        <Pressable
          style={styles.button}
          onPress={() => void ensureNotificationPermissions()}>
          <ThemedText style={styles.buttonText}>Enable reminders</ThemedText>
        </Pressable>

        <Pressable style={styles.closeButton} onPress={onClose}>
          <ThemedText style={styles.closeText}>Close</ThemedText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  card: {
    position: "absolute",
    left: 24,
    right: 24,
    top: "22%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  section: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  value: {
    fontSize: 15,
    color: "#111827",
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  closeButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  closeText: {
    color: "#6b7280",
    fontSize: 16,
  },
});
