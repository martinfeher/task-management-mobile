import { AppSymbol } from "@/components/app-symbol";
import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { createLabel } from "@/lib/api";
import { getLabelDotColor } from "@/lib/label-colors";
import type { TaskLabel } from "@/types/todo";

const LABEL_CHECKMARK_SIZE = Math.round(18 * 0.88);
const LABEL_CHECKMARK_COLOR = "#22c55e"; // tailwind green-500
const CLOSE_ICON_COLOR = "#6f7c8d";
const CLOSE_BUTTON_TOP = 8;
const CLOSE_BUTTON_RIGHT = 8;
const SHEET_BOTTOM_EXTENSION = 40;

type TaskLabelPickerProps = {
  labels: TaskLabel[];
  assignedLabelIds: Set<string>;
  onToggleLabel: (labelId: string, assigned: boolean) => void;
  onClose: () => void;
  onCreateLabel?: (label: TaskLabel) => void;
  /** Space reserved at the bottom (e.g. task toolbar height). */
  bottomInset?: number;
  /** Sheet height as a fraction of the screen height. */
  sheetHeightRatio?: number;
  /**
   * When true, renders in a root Modal so height is based on the full screen
   * rather than a parent sheet (e.g. iOS task edit form sheet).
   */
  fullScreen?: boolean;
};

export function TaskLabelPicker({
  labels,
  assignedLabelIds,
  onToggleLabel,
  onClose,
  onCreateLabel,
  bottomInset = 0,
  sheetHeightRatio = 0.4,
  fullScreen = false,
}: TaskLabelPickerProps) {
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = fullScreen
    ? windowHeight * sheetHeightRatio
    : windowHeight * sheetHeightRatio + SHEET_BOTTOM_EXTENSION;
  const sheetBottom = bottomInset;
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);

  const query = draft.trim();
  const normalizedQuery = query.toLowerCase();

  const filteredLabels = useMemo(() => {
    if (!query) return labels;
    return labels.filter((label) =>
      label.label.toLowerCase().includes(normalizedQuery),
    );
  }, [labels, normalizedQuery, query]);

  const hasExactMatch = useMemo(() => {
    if (!query) return false;
    return labels.some(
      (label) => label.label.trim().toLowerCase() === normalizedQuery,
    );
  }, [labels, normalizedQuery, query]);

  const showCreateOption = query.length > 0 && !hasExactMatch;

  async function handleCreateLabel() {
    if (!query || creating) return;
    setCreating(true);
    try {
      const label = await createLabel(query);
      onCreateLabel?.(label);
      onToggleLabel(label.id, true);
      setDraft("");
    } catch {
      Alert.alert("Couldn't create label");
    } finally {
      setCreating(false);
    }
  }

  const sheet = (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable
        style={[styles.backdrop, { bottom: sheetBottom }]}
        onPress={onClose}
      />
      <View
        style={[styles.sheet, { height: sheetHeight, bottom: sheetBottom }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close labels"
          hitSlop={8}
          onPress={onClose}
          style={styles.closeButton}
        >
          <AppSymbol
            ios="xmark"
            android="close"
            size={18}
            tintColor={CLOSE_ICON_COLOR}
          />
        </Pressable>

        <View style={styles.sheetBody}>
          <View style={styles.sheetHeader}>
            <View style={styles.handle} />
            <ThemedText style={styles.title}>Labels</ThemedText>

            <View style={styles.searchRow}>
              <AppSymbol
                ios="magnifyingglass"
                android="search"
                size={16}
                tintColor="#9ca3af"
              />
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Type in a label"
                placeholderTextColor="#9ca3af"
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="done"
                {...(Platform.OS === "android"
                  ? {
                      includeFontPadding: false,
                      textBreakStrategy: "simple" as const,
                    }
                  : null)}
                onSubmitEditing={() => {
                  if (showCreateOption) {
                    void handleCreateLabel();
                  }
                }}
              />
            </View>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            bounces
          >
            {showCreateOption ? (
              <Pressable
                style={styles.createRow}
                disabled={creating}
                onPress={() => void handleCreateLabel()}
              >
                <AppSymbol
                  ios="tag"
                  android="label"
                  size={18}
                  tintColor="#6b7280"
                />
                <ThemedText style={styles.createRowText}>
                  Create label &quot;{query}&quot;
                </ThemedText>
              </Pressable>
            ) : null}

            {filteredLabels.length === 0 && !showCreateOption ? (
              <ThemedText style={styles.empty} themeColor="textSecondary">
                {query ? "No matching labels." : "No labels yet."}
              </ThemedText>
            ) : (
              filteredLabels.map((label) => {
                const assigned = assignedLabelIds.has(label.id);
                return (
                  <Pressable
                    key={label.id}
                    style={styles.row}
                    onPress={() => onToggleLabel(label.id, !assigned)}
                  >
                    <View
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: getLabelDotColor(label) },
                      ]}
                    />
                    <ThemedText
                      style={[
                        styles.labelText,
                        assigned && styles.labelTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {label.label}
                    </ThemedText>
                    {assigned ? (
                      <View style={styles.checkmarkSlot}>
                        <AppSymbol
                          ios="checkmark"
                          android="check"
                          size={LABEL_CHECKMARK_SIZE}
                          tintColor={LABEL_CHECKMARK_COLOR}
                        />
                      </View>
                    ) : (
                      <View style={styles.checkPlaceholder} />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );

  if (fullScreen) {
    return (
      <Modal transparent animationType="fade" visible onRequestClose={onClose}>
        {sheet}
      </Modal>
    );
  }

  return sheet;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  sheetBody: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  sheetHeader: {
    flexShrink: 0,
  },
  closeButton: {
    position: "absolute",
    top: CLOSE_BUTTON_TOP,
    right: CLOSE_BUTTON_RIGHT,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f4f4f6",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 10,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d1d5db",
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.two,
    paddingRight: 44,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 42,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d4d4d8",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: Spacing.two,
  },
  searchInput: {
    flex: 1,
    margin: 0,
    fontSize: 16,
    lineHeight: 20,
    color: "#111827",
    ...(Platform.OS === "android"
      ? {
          height: 42,
          paddingVertical: 0,
          textAlignVertical: "center" as const,
        }
      : {
          paddingVertical: 11,
        }),
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    paddingBottom: Spacing.two,
  },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eef2f6",
  },
  createRowText: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
  },
  empty: {
    paddingVertical: Spacing.three,
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eef2f6",
  },
  colorSwatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
    flexShrink: 0,
  },
  labelText: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
  },
  labelTextSelected: {
    color: "#2563eb",
    fontWeight: "500",
  },
  checkmarkSlot: {
    marginRight: 18,
  },
  checkPlaceholder: {
    width: LABEL_CHECKMARK_SIZE,
    height: LABEL_CHECKMARK_SIZE,
    marginRight: 18,
  },
});
