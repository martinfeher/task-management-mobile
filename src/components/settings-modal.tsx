import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useAppSettings } from "@/contexts/app-settings-context";
import { useAuth } from "@/contexts/auth-context";
import { ensureNotificationPermissions } from "@/lib/notifications";

type SettingsModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { user, signOut } = useAuth();
  const { subtasksEnabled, setSubtasksEnabled } = useAppSettings();

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.card}>
        <ThemedText style={styles.title}>Settings</ThemedText>

        <View style={styles.section}>
          <ThemedText style={styles.sectionHeading}>Account settings</ThemedText>
          {user ? (
            <>
              <ThemedText style={styles.value} numberOfLines={1}>
                {user.name?.trim() || "Signed in"}
              </ThemedText>
              <ThemedText style={styles.valueSecondary} numberOfLines={1}>
                {user.email}
              </ThemedText>
            </>
          ) : (
            <ThemedText style={styles.valueSecondary}>Not signed in</ThemedText>
          )}
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              void signOut();
              onClose();
            }}>
            <ThemedText style={styles.secondaryButtonText}>Sign out</ThemedText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionHeading}>Global options</ThemedText>
          <View style={styles.optionRow}>
            <View style={styles.optionLabels}>
              <ThemedText style={styles.optionTitle}>Subtasks</ThemedText>
              <ThemedText style={styles.optionHint} themeColor="textSecondary">
                Show subtasks in add task and task detail.
              </ThemedText>
            </View>
            <Switch
              value={subtasksEnabled}
              onValueChange={setSubtasksEnabled}
              trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
              thumbColor={subtasksEnabled ? "#2563eb" : "#f9fafb"}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionHeading}>Reminders</ThemedText>
          <Pressable
            style={styles.primaryButton}
            onPress={() => void ensureNotificationPermissions()}>
            <ThemedText style={styles.primaryButtonText}>
              Enable reminders
            </ThemedText>
          </Pressable>
        </View>

        <Pressable style={styles.closeButton} onPress={onClose}>
          <ThemedText style={styles.closeText}>Close</ThemedText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  card: {
    position: "absolute",
    left: 24,
    right: 24,
    top: "18%",
    maxHeight: "72%",
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
    gap: 10,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  valueSecondary: {
    fontSize: 15,
    color: "#4b5563",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionLabels: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  optionHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  secondaryButtonText: {
    color: "#dc2626",
    fontSize: 16,
    fontWeight: "600",
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
