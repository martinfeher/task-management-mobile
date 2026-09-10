import { useState } from "react";
import { Alert, Modal, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import { LabelColorPickerSheet } from "@/components/label-color-picker-sheet";
import { ListsSidebar } from "@/components/lists-sidebar";
import { ThemedText } from "@/components/themed-text";
import { useApp } from "@/contexts/app-context";
import {
  createLabel,
  createList,
  deleteLabelApi,
  deleteList,
  renameLabelApi,
  renameList,
  updateLabelColorApi,
} from "@/lib/api";
import type { SelectedView, SidebarLabelItem, SidebarListItem } from "@/types/todo";

type NamePromptState =
  | { mode: "create-list" }
  | { mode: "create-label" }
  | { mode: "rename-list"; list: SidebarListItem }
  | { mode: "rename-label"; label: SidebarLabelItem };

export function ListsDrawerContent() {
  const {
    sidebarData,
    sidebarLoading,
    sidebarRefreshing,
    sidebarError,
    selectedView,
    loadSidebar,
    selectViewFromDrawer,
    reorderLists,
  } = useApp();
  const [namePrompt, setNamePrompt] = useState<NamePromptState | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [colorPickerLabel, setColorPickerLabel] = useState<SidebarLabelItem | null>(
    null,
  );

  function handleSelectView(view: SelectedView) {
    selectViewFromDrawer(view);
  }

  function openCreatePrompt() {
    setNameDraft("");
    setNamePrompt({ mode: "create-list" });
  }

  function openRenameListPrompt(list: SidebarListItem) {
    setNameDraft(list.name);
    setNamePrompt({ mode: "rename-list", list });
  }

  function openRenameLabelPrompt(label: SidebarLabelItem) {
    setNameDraft(label.label);
    setNamePrompt({ mode: "rename-label", label });
  }

  function openCreateLabelPrompt() {
    setNameDraft("");
    setNamePrompt({ mode: "create-label" });
  }

  async function submitNamePrompt() {
    if (!namePrompt) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) return;

    try {
      if (namePrompt.mode === "create-list") {
        await createList(trimmed);
      } else if (namePrompt.mode === "create-label") {
        await createLabel(trimmed);
      } else if (namePrompt.mode === "rename-list") {
        await renameList(namePrompt.list.id, trimmed);
      } else {
        await renameLabelApi(namePrompt.label.id, trimmed);
      }
      setNamePrompt(null);
      await loadSidebar(true);
    } catch {
      Alert.alert(
        namePrompt.mode === "create-list"
          ? "Couldn't create list"
          : namePrompt.mode === "create-label"
            ? "Couldn't create label"
          : namePrompt.mode === "rename-list"
            ? "Couldn't rename list"
            : "Couldn't rename label",
      );
    }
  }

  function promptForListName(mode: "create" | "rename", list?: SidebarListItem) {
    if (Platform.OS === "ios") {
      Alert.prompt(
        mode === "create" ? "New list" : "Rename list",
        undefined,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (value?: string) => {
              const trimmed = value?.trim();
              if (!trimmed) return;
              void (async () => {
                try {
                  if (mode === "create") {
                    await createList(trimmed);
                  } else if (list) {
                    await renameList(list.id, trimmed);
                  }
                  await loadSidebar(true);
                } catch {
                  Alert.alert(
                    mode === "create" ? "Couldn't create list" : "Couldn't rename list",
                  );
                }
              })();
            },
          },
        ],
        "plain-text",
        list?.name ?? "",
      );
      return;
    }

    if (mode === "create") {
      openCreatePrompt();
      return;
    }
    if (list) {
      openRenameListPrompt(list);
    }
  }

  function promptForLabelCreate() {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "New label",
        undefined,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (value?: string) => {
              const trimmed = value?.trim();
              if (!trimmed) return;
              void (async () => {
                try {
                  await createLabel(trimmed);
                  await loadSidebar(true);
                } catch {
                  Alert.alert("Couldn't create label");
                }
              })();
            },
          },
        ],
        "plain-text",
      );
      return;
    }

    openCreateLabelPrompt();
  }

  function promptForLabelName(label: SidebarLabelItem) {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Edit title",
        undefined,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (value?: string) => {
              const trimmed = value?.trim();
              if (!trimmed) return;
              void (async () => {
                try {
                  await renameLabelApi(label.id, trimmed);
                  await loadSidebar(true);
                } catch {
                  Alert.alert("Couldn't rename label");
                }
              })();
            },
          },
        ],
        "plain-text",
        label.label,
      );
      return;
    }

    openRenameLabelPrompt(label);
  }

  function handleDeleteLabel(label: SidebarLabelItem) {
    Alert.alert(
      "Delete label",
      `Are you sure you want to delete "${label.label}"? It will be removed from all tasks.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteLabelApi(label.id);
                await loadSidebar(true);
              } catch {
                Alert.alert("Couldn't delete label");
              }
            })();
          },
        },
      ],
    );
  }

  async function handleSelectLabelColor(color: string) {
    if (!colorPickerLabel) return;

    try {
      await updateLabelColorApi(colorPickerLabel.id, color);
      await loadSidebar(true);
    } catch {
      Alert.alert("Couldn't update label color");
    }
  }

  async function handleDeleteList(list: SidebarListItem) {
    Alert.alert(
      "Delete list",
      `Delete "${list.name}" and all its tasks?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteList(list.id);
                await loadSidebar(true);
              } catch {
                Alert.alert("Couldn't delete list");
              }
            })();
          },
        },
      ],
    );
  }

  return (
    <>
      <ListsSidebar
        data={sidebarData}
        loading={sidebarLoading}
        refreshing={sidebarRefreshing}
        error={sidebarError}
        selectedView={selectedView}
        onSelectView={handleSelectView}
        onRefresh={() => void loadSidebar(true)}
        onRetry={() => void loadSidebar()}
        onReorderLists={reorderLists}
        onCreateList={() => promptForListName("create")}
        onCreateLabel={promptForLabelCreate}
        onRenameList={(list) => promptForListName("rename", list)}
        onDeleteList={(list) => void handleDeleteList(list)}
        onRenameLabel={promptForLabelName}
        onDeleteLabel={handleDeleteLabel}
        onChangeLabelColor={setColorPickerLabel}
      />

      <LabelColorPickerSheet
        visible={colorPickerLabel !== null}
        label={colorPickerLabel}
        onSelectColor={(color) => void handleSelectLabelColor(color)}
        onClose={() => setColorPickerLabel(null)}
      />

      {namePrompt && Platform.OS !== "ios" ? (
        <Modal transparent animationType="fade" onRequestClose={() => setNamePrompt(null)}>
          <Pressable style={styles.backdrop} onPress={() => setNamePrompt(null)} />
          <View style={styles.card}>
            <ThemedText style={styles.title}>
              {namePrompt.mode === "create-list"
                ? "New list"
                : namePrompt.mode === "create-label"
                  ? "New label"
                : namePrompt.mode === "rename-list"
                  ? "Rename list"
                  : "Edit title"}
            </ThemedText>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              autoFocus
              style={styles.input}
              onSubmitEditing={() => void submitNamePrompt()}
            />
            <View style={styles.actions}>
              <Pressable onPress={() => setNamePrompt(null)}>
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable onPress={() => void submitNamePrompt()}>
                <ThemedText style={styles.save}>Save</ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  card: {
    position: "absolute",
    left: 28,
    right: 28,
    top: "35%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
  },
  save: {
    color: "#2563eb",
    fontWeight: "600",
  },
});
