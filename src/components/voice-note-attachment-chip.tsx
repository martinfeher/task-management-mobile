import { Pressable, StyleSheet, View } from "react-native";

import { AppSymbol } from "@/components/app-symbol";
import { ThemedText } from "@/components/themed-text";
import { formatVoiceNoteDuration } from "@/lib/task-voice-notes";

type VoiceNoteAttachmentChipProps = {
  durationMs: number;
  active?: boolean;
  onPress: () => void;
};

export function VoiceNoteAttachmentChip({
  durationMs,
  active = false,
  onPress,
}: VoiceNoteAttachmentChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Voice note ${formatVoiceNoteDuration(durationMs)}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.chipPressed,
      ]}
    >
      <View style={styles.iconWrap}>
        <AppSymbol
          ios="waveform"
          android="graphic-eq"
          size={14}
          tintColor={active ? "#ffffff" : "#4873c7"}
        />
      </View>
      <ThemedText style={[styles.label, active && styles.labelActive]}>
        {formatVoiceNoteDuration(durationMs)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#c7d7ef",
    backgroundColor: "#eef4ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: "#ef4444",
    backgroundColor: "#ef4444",
  },
  chipPressed: {
    opacity: 0.85,
  },
  iconWrap: {
    width: 16,
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4873c7",
  },
  labelActive: {
    color: "#ffffff",
  },
});
