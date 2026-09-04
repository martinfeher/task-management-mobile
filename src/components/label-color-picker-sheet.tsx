import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { LABEL_PRESET_COLORS, getLabelDotColor } from "@/lib/label-colors";
import type { SidebarLabelItem } from "@/types/todo";

type LabelColorPickerSheetProps = {
  visible: boolean;
  label: SidebarLabelItem | null;
  onSelectColor: (color: string) => void;
  onClose: () => void;
};

export function LabelColorPickerSheet({
  visible,
  label,
  onSelectColor,
  onClose,
}: LabelColorPickerSheetProps) {
  if (!label) return null;

  const currentColor = getLabelDotColor(label);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <ThemedText style={styles.title}>Label color</ThemedText>
        <ThemedText style={styles.subtitle} numberOfLines={1}>
          {label.label}
        </ThemedText>
        <View style={styles.colorRow}>
          {LABEL_PRESET_COLORS.map((preset) => {
            const selected =
              preset.dot.toLowerCase() === currentColor.toLowerCase();
            return (
              <Pressable
                key={preset.dot}
                accessibilityRole="button"
                accessibilityLabel={`Set color ${preset.dot}`}
                onPress={() => {
                  onSelectColor(preset.dot);
                  onClose();
                }}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: preset.dot },
                  selected && styles.colorSwatchSelected,
                ]}
              />
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sheet: {
    position: "absolute",
    left: 24,
    right: 24,
    top: "34%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: "#111827",
  },
});
