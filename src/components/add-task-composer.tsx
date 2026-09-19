import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AppSymbol } from "@/components/app-symbol";
import { IoMdTimeIcon } from "@/components/io-md-time-icon";
import { RiAttachment2Icon } from "@/components/ri-attachment2-icon";
import { TASK_PRIORITY_OPTIONS } from "@/components/task-context-menu";
import { TaskDatePickerSheet } from "@/components/task-date-picker-sheet";
import { TaskLabelPicker } from "@/components/task-label-picker";
import { TaskListPicker } from "@/components/task-list-picker";
import { getTaskPriorityColor } from "@/components/task-priority-flag-popup";
import { TbSubtaskIcon } from "@/components/tb-subtask-icon";
import { ThemedText } from "@/components/themed-text";
import { useApp } from "@/contexts/app-context";
import { fetchLabels } from "@/lib/api";
import { formatTaskDueDate } from "@/lib/format-due-date";
import { findInboxList } from "@/lib/inbox-list";
import { getLabelDotColor } from "@/lib/label-colors";
import { nextTaskNamePlaceholder } from "@/lib/task-name-placeholders";
import type { SidebarListItem, TaskLabel } from "@/types/todo";

type AddTaskComposerProps = {
  visible: boolean;
  onClose: () => void;
};

const ICON_COLOR = "#5a6578";
const ACTIVE_ICON_COLOR = "#4873c7";
const TOOLBAR_LABELED_ICON_SIZE = 25.5;
const TOOLBAR_UTILITY_ICON_SIZE = 25.5;
const PLACEHOLDER_COLOR = "#b8c4d0";

export function AddTaskComposer({ visible, onClose }: AddTaskComposerProps) {
  const {
    createTask,
    composerDraft,
    selectedView,
    setAddTaskComposerHeight,
    sidebarData,
    loadSidebar,
  } = useApp();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [priority, setPriority] = useState<number | null>(null);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [listId, setListId] = useState<string | null>(null);
  const [allLabels, setAllLabels] = useState<TaskLabel[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [taskNamePlaceholder, setTaskNamePlaceholder] = useState(
    nextTaskNamePlaceholder,
  );
  const inputRef = useRef<TextInput>(null);
  const submittingRef = useRef(false);
  const refocusTitleRef = useRef(false);

  const lists = sidebarData?.lists ?? [];
  const defaultListId =
    composerDraft?.listId ??
    (selectedView?.type === "list" ? selectedView.id : null);
  const selectedList =
    lists.find((list) => list.id === listId) ??
    lists.find((list) => list.id === defaultListId) ??
    findInboxList(lists);
  const dueDateLabel = formatTaskDueDate(dueDate);
  const assignedLabelIds = new Set(labelIds);
  const composerLabels = useMemo(() => {
    const byId = new Map<string, TaskLabel>();
    for (const label of sidebarData?.labels ?? []) {
      byId.set(label.id, {
        id: label.id,
        label: label.label,
        color: label.color,
      });
    }
    for (const label of allLabels) {
      byId.set(label.id, label);
    }
    return labelIds
      .map((id) => byId.get(id))
      .filter((label): label is TaskLabel => label != null);
  }, [allLabels, labelIds, sidebarData?.labels]);

  function focusTitleInput() {
    InteractionManager.runAfterInteractions(() => {
      inputRef.current?.focus();
    });
    setTimeout(
      () => {
        inputRef.current?.focus();
      },
      Platform.OS === "ios" ? 50 : 0,
    );
  }

  useEffect(() => {
    if (!visible) {
      setName("");
      setDescription("");
      setDueDate(null);
      setPriority(null);
      setLabelIds([]);
      setListId(null);
      setDatePickerOpen(false);
      setLabelPickerOpen(false);
      setListPickerOpen(false);
      setPriorityMenuOpen(false);
      setMoreMenuOpen(false);
      setSubmitting(false);
      submittingRef.current = false;
      setAddTaskComposerHeight(0);
      return;
    }

    setDueDate(composerDraft?.dueDate ?? null);
    setPriority(composerDraft?.priority ?? null);
    setLabelIds(composerDraft?.labelIds ?? []);
    setListId(defaultListId);
    setTaskNamePlaceholder(nextTaskNamePlaceholder());
  }, [composerDraft, defaultListId, setAddTaskComposerHeight, visible]);

  useEffect(() => {
    if (!refocusTitleRef.current || submitting) return;
    refocusTitleRef.current = false;
    focusTitleInput();
  }, [name, submitting]);

  async function saveTask(options: { keepOpen: boolean }) {
    if (submittingRef.current) return false;
    const trimmed = name.trim();
    if (!trimmed) return false;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await createTask({
        name: trimmed,
        description: description.trim() || undefined,
        dueDate,
        priority,
        labelIds: labelIds.length > 0 ? labelIds : undefined,
        listId: listId ?? selectedList?.id,
      });
      setName("");
      setDescription("");
      submittingRef.current = false;
      setSubmitting(false);
      if (options.keepOpen) {
        refocusTitleRef.current = true;
      } else {
        Keyboard.dismiss();
        onClose();
      }
      return true;
    } catch {
      Alert.alert("Couldn't create task");
      submittingRef.current = false;
      setSubmitting(false);
      refocusTitleRef.current = true;
      return false;
    }
  }

  async function submitAndContinue() {
    await saveTask({ keepOpen: true });
  }

  async function submitAndClose() {
    if (submittingRef.current) return;
    const trimmed = name.trim();
    if (!trimmed) {
      Keyboard.dismiss();
      onClose();
      return;
    }

    await saveTask({ keepOpen: false });
  }

  async function openLabelPicker() {
    try {
      const labels = await fetchLabels();
      setAllLabels(labels);
      setLabelPickerOpen(true);
    } catch {
      Alert.alert("Couldn't load labels");
    }
  }

  async function openListPicker() {
    if (!lists.length) {
      await loadSidebar();
    }
    setListPickerOpen(true);
  }

  function handleToggleLabel(labelId: string, assigned: boolean) {
    setLabelIds((current) => {
      if (assigned) {
        return current.includes(labelId) ? current : [...current, labelId];
      }
      return current.filter((id) => id !== labelId);
    });
  }

  function handleSelectList(list: SidebarListItem) {
    setListId(list.id);
    setListPickerOpen(false);
  }

  function handleAttachment() {
    setMoreMenuOpen(false);
    Alert.alert(
      "Attachment",
      "Save the task first, then add attachments from the task detail screen.",
    );
  }

  function handleToolbarSubtask() {
    setMoreMenuOpen(false);
    Alert.alert(
      "Subtask",
      "Save the task first, then add subtasks from the task detail screen.",
    );
  }

  function handleMoreMenuLabel() {
    setMoreMenuOpen(false);
    void openLabelPicker();
  }

  function handleVoiceNote() {
    Alert.alert(
      "Voice note",
      "Voice note recording is not available in the mobile app yet.",
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={focusTitleInput}
      onRequestClose={() => {
        void submitAndClose();
      }}
      statusBarTranslucent
    >
      {visible ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View style={styles.backdrop}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
              style={StyleSheet.absoluteFill}
              onPress={() => {
                void submitAndClose();
              }}
            />

            <View
              style={styles.card}
              onLayout={(event) => {
                setAddTaskComposerHeight(event.nativeEvent.layout.height);
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={6}
                onPress={() => {
                  void submitAndClose();
                }}
                style={styles.closeButton}
              >
                <AppSymbol
                  ios="xmark"
                  android="close"
                  size={14}
                  weight="semibold"
                  tintColor="#7a8494"
                />
              </Pressable>

              <View style={styles.cardContent}>
                <View style={styles.header}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`List: ${selectedList?.name ?? "Inbox"}`}
                    hitSlop={8}
                    onPress={() => void openListPicker()}
                    style={({ pressed }) => [
                      styles.listPicker,
                      pressed && styles.listPickerPressed,
                    ]}
                  >
                    <ThemedText style={styles.listPickerText}>
                      In{" "}
                      <ThemedText style={styles.listPickerBold}>
                        {selectedList?.name ?? "Inbox"}
                      </ThemedText>
                    </ThemedText>
                    <AppSymbol
                      ios="chevron.down"
                      android="keyboard-arrow-down"
                      size={14}
                      tintColor="#8b95a5"
                    />
                  </Pressable>
                </View>

                <TextInput
                  ref={inputRef}
                  value={name}
                  onChangeText={setName}
                  placeholder={taskNamePlaceholder}
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  style={styles.titleInput}
                  selectionColor="#4873c7"
                  cursorColor="#4873c7"
                  returnKeyType="done"
                  blurOnSubmit={false}
                  editable={!submitting}
                  autoFocus={visible}
                  showSoftInputOnFocus
                  autoCorrect
                  autoCapitalize="sentences"
                  onSubmitEditing={() => {
                    void submitAndContinue();
                  }}
                />

                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Tap to add a description ..."
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  style={styles.descriptionInput}
                  selectionColor="#4873c7"
                  cursorColor="#4873c7"
                  editable={!submitting}
                  multiline
                  blurOnSubmit
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    void submitAndContinue();
                  }}
                />

                {dueDateLabel || priority != null || labelIds.length > 0 ? (
                  <View style={styles.metaRow}>
                    {dueDateLabel ? (
                      <ThemedText style={styles.metaChip}>
                        {dueDateLabel}
                      </ThemedText>
                    ) : null}
                    {priority != null ? (
                      <ThemedText style={styles.metaChip}>
                        P{priority}
                      </ThemedText>
                    ) : null}
                    {composerLabels.length > 0 ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.labelChipRow}
                        keyboardShouldPersistTaps="handled"
                      >
                        {composerLabels.map((label) => (
                          <Pressable
                            key={label.id}
                            accessibilityRole="button"
                            accessibilityLabel={`Label ${label.label}, edit labels`}
                            onPress={() => void openLabelPicker()}
                            style={({ pressed }) => [
                              styles.labelChip,
                              { backgroundColor: getLabelDotColor(label) },
                              pressed && styles.labelChipPressed,
                            ]}
                          >
                            <ThemedText style={styles.labelChipText}>
                              {label.label}
                            </ThemedText>
                          </Pressable>
                        ))}
                      </ScrollView>
                    ) : null}
                  </View>
                ) : null}

                {priorityMenuOpen ? (
                  <View style={styles.priorityMenu}>
                    {TASK_PRIORITY_OPTIONS.map((option) => (
                      <Pressable
                        key={option.level}
                        style={styles.priorityOption}
                        onPress={() => {
                          setPriority(option.level);
                          setPriorityMenuOpen(false);
                        }}
                      >
                        <View
                          style={[
                            styles.priorityDot,
                            { backgroundColor: option.color },
                          ]}
                        />
                        <ThemedText>{option.label}</ThemedText>
                      </Pressable>
                    ))}
                    <Pressable
                      style={styles.priorityOption}
                      onPress={() => {
                        setPriority(null);
                        setPriorityMenuOpen(false);
                      }}
                    >
                      <ThemedText style={styles.clearPriority}>
                        Clear priority
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : null}

                <View style={styles.divider} />

                <View style={styles.toolbar}>
                  <View style={styles.toolbarControls}>
                    <View style={styles.iconRow}>
                      <View style={styles.toolbarLabeledItem}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Date"
                          hitSlop={8}
                          onPress={() => {
                            setMoreMenuOpen(false);
                            setDatePickerOpen(true);
                          }}
                          style={({ pressed }) => [
                            styles.toolbarIconSlot,
                            pressed && styles.toolbarIconPressed,
                          ]}
                        >
                          <IoMdTimeIcon
                            size={TOOLBAR_LABELED_ICON_SIZE}
                            color={dueDate ? ACTIVE_ICON_COLOR : ICON_COLOR}
                          />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Date"
                          hitSlop={6}
                          onPress={() => {
                            setMoreMenuOpen(false);
                            setDatePickerOpen(true);
                          }}
                        >
                          <ThemedText style={styles.toolbarCaption}>
                            Date
                          </ThemedText>
                        </Pressable>
                      </View>

                      <View style={styles.flagAnchor}>
                        <View style={styles.toolbarLabeledItem}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Priority"
                            hitSlop={8}
                            onPress={() => {
                              setMoreMenuOpen(false);
                              setPriorityMenuOpen((open) => !open);
                            }}
                            style={({ pressed }) => [
                              styles.toolbarIconSlot,
                              pressed && styles.toolbarIconPressed,
                            ]}
                          >
                            <AppSymbol
                              ios={priority != null ? "flag.fill" : "flag"}
                              android={
                                priority != null ? "flag" : "outlined-flag"
                              }
                              size={TOOLBAR_LABELED_ICON_SIZE}
                              tintColor={
                                priority != null
                                  ? getTaskPriorityColor(priority)
                                  : ICON_COLOR
                              }
                            />
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Priority"
                            hitSlop={6}
                            onPress={() => {
                              setMoreMenuOpen(false);
                              setPriorityMenuOpen((open) => !open);
                            }}
                          >
                            <ThemedText
                              style={[
                                styles.toolbarCaption,
                                priority != null && {
                                  color: getTaskPriorityColor(priority),
                                },
                              ]}
                            >
                              Priority
                            </ThemedText>
                          </Pressable>
                        </View>
                      </View>

                      <View style={styles.moreMenuAnchor}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="More options"
                          hitSlop={8}
                          onPress={() => {
                            setPriorityMenuOpen(false);
                            setMoreMenuOpen((open) => !open);
                          }}
                          style={({ pressed }) => [
                            styles.toolbarIconSlot,
                            pressed && styles.toolbarIconPressed,
                          ]}
                        >
                          <AppSymbol
                            ios="ellipsis"
                            android="more-horiz"
                            size={TOOLBAR_UTILITY_ICON_SIZE}
                            tintColor={ICON_COLOR}
                          />
                        </Pressable>
                        {moreMenuOpen ? (
                          <View style={styles.moreMenu}>
                            <Pressable
                              style={styles.moreMenuRow}
                              onPress={handleMoreMenuLabel}
                            >
                              <AppSymbol
                                ios="tag"
                                android="local-offer"
                                size={18}
                                tintColor={
                                  labelIds.length > 0
                                    ? ACTIVE_ICON_COLOR
                                    : ICON_COLOR
                                }
                              />
                              <ThemedText style={styles.moreMenuRowText}>
                                Label
                              </ThemedText>
                            </Pressable>
                            <Pressable
                              style={styles.moreMenuRow}
                              onPress={handleToolbarSubtask}
                            >
                              <TbSubtaskIcon size={18} color={ICON_COLOR} />
                              <ThemedText style={styles.moreMenuRowText}>
                                subtasks
                              </ThemedText>
                            </Pressable>
                            <Pressable
                              style={styles.moreMenuRow}
                              onPress={handleAttachment}
                            >
                              <RiAttachment2Icon size={18} color={ICON_COLOR} />
                              <ThemedText style={styles.moreMenuRowText}>
                                Attachment
                              </ThemedText>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.toolbarTrailing}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Voice note"
                        hitSlop={8}
                        onPress={handleVoiceNote}
                        style={({ pressed }) => [
                          styles.toolbarIconSlot,
                          styles.voiceButton,
                          pressed && styles.toolbarIconPressed,
                        ]}
                      >
                        <AppSymbol
                          ios="mic"
                          android="mic"
                          size={TOOLBAR_UTILITY_ICON_SIZE}
                          tintColor={ICON_COLOR}
                        />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Confirm add task"
                        disabled={submitting || !name.trim()}
                        onPress={() => {
                          void submitAndContinue();
                        }}
                        style={({ pressed }) => [
                          styles.addButton,
                          !name.trim() && styles.addButtonDisabled,
                          pressed &&
                            name.trim() &&
                            !submitting &&
                            styles.addButtonPressed,
                        ]}
                      >
                        {submitting ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <AppSymbol
                            ios="arrow.up"
                            android="arrow-upward"
                            size={18}
                            weight="bold"
                            tintColor="#ffffff"
                          />
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <TaskDatePickerSheet
            visible={datePickerOpen}
            value={dueDate}
            onSelect={(selection) => setDueDate(selection.dueDate)}
            onClose={() => setDatePickerOpen(false)}
          />

          {labelPickerOpen ? (
            <TaskLabelPicker
              labels={allLabels}
              assignedLabelIds={assignedLabelIds}
              onToggleLabel={handleToggleLabel}
              onClose={() => setLabelPickerOpen(false)}
              onCreateLabel={(label) => {
                setAllLabels((current) => [...current, label]);
                setLabelIds((current) => [...current, label.id]);
              }}
            />
          ) : null}

          <TaskListPicker
            visible={listPickerOpen}
            lists={lists}
            currentListId={listId ?? selectedList?.id ?? null}
            onSelectList={handleSelectList}
            onClose={() => setListPickerOpen(false)}
          />
        </KeyboardAvoidingView>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: Platform.OS === "ios" ? 12 : 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  closeButton: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingRight: 36,
  },
  listPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
    flexShrink: 1,
  },
  listPickerPressed: {
    opacity: 0.7,
  },
  listPickerText: {
    fontSize: 14,
    color: "#6b7280",
    flexShrink: 1,
  },
  listPickerBold: {
    fontWeight: "600",
    color: "#424242",
  },
  titleInput: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111827",
    paddingVertical: 6,
    minHeight: 40,
  },
  descriptionInput: {
    fontSize: 15,
    color: "#374151",
    paddingVertical: 4,
    minHeight: 28,
    maxHeight: 80,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  metaChip: {
    fontSize: 12,
    color: "#4873c7",
    backgroundColor: "#eef4fc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  labelChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  labelChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2.25,
    flexShrink: 0,
  },
  labelChipPressed: {
    opacity: 0.85,
  },
  labelChipText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  priorityMenu: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    overflow: "hidden",
  },
  priorityOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f3f4f6",
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  clearPriority: {
    color: "#6b7280",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e5e7eb",
    marginTop: 14,
    marginBottom: 12,
  },
  toolbar: {
    marginTop: 2,
  },
  toolbarControls: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#7676E6",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    // Align button center with the 24px icon row (38px button → offset up by 8px).
    marginTop: -8,
  },
  addButtonDisabled: {
    backgroundColor: "#7676E6",
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  flagAnchor: {
    position: "relative",
  },
  moreMenuAnchor: {
    position: "relative",
    zIndex: 20,
  },
  moreMenu: {
    position: "absolute",
    left: 0,
    bottom: 30,
    minWidth: 168,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  moreMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f3f4f6",
  },
  moreMenuRowText: {
    fontSize: 14,
    color: "#374151",
  },
  voiceButton: {
    marginRight: 15,
  },
  toolbarTrailing: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexShrink: 0,
  },
  toolbarLabeledItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  toolbarCaption: {
    fontSize: 9,
    marginLeft: 3,
    lineHeight: 11,
    color: "#9ca3af",
  },
  toolbarIconSlot: {
    height: 24,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbarIconPressed: {
    opacity: 0.55,
  },
});
