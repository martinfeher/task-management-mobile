import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  Text,
  View,
  type RefreshControlProps,
} from "react-native";
import { GestureHandlerRootView as GHRootView } from "react-native-gesture-handler";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import { AppSymbol } from "@/components/app-symbol";
import { BiChevronDownIcon } from "@/components/bi-chevron-down-icon";
import { ListsCreateButton } from "@/components/lists-create-button";
import { LuInboxIcon } from "@/components/lu-inbox-icon";
import { LuPlusIcon } from "@/components/lu-plus-icon";
import { LuStarIcon } from "@/components/lu-star-icon";
import { SettingsModal } from "@/components/settings-modal";
import { SidebarRow } from "@/components/sidebar-row";
import { CiCalendarDateIcon } from "@/components/ci-calendar-date-icon";
import { API_BASE_URL } from "@/constants/api";
import { useTheme } from "@/hooks/use-theme";
import { fetchLabels } from "@/lib/api";
import { findInboxList } from "@/lib/inbox-list";
import { getLabelDotColor } from "@/lib/label-colors";
import type {
  SelectedView,
  SidebarData,
  SidebarLabelItem,
  SidebarListItem,
} from "@/types/todo";

const SafeAreaView = withUniwind(RNSafeAreaView);
const GestureHandlerRootView = withUniwind(GHRootView);

export type ListsSidebarProps = {
  data: SidebarData | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  selectedView: SelectedView | null;
  onSelectView: (view: SelectedView) => void;
  onRefresh: () => void;
  onRetry: () => void;
  onReorderSidebarTopLevel?: (sourceIndex: number, dropIndex: number) => void;
  onCreateList?: () => void;
  onCreateLabel?: () => void;
  onRenameList?: (list: SidebarListItem) => void;
  onDeleteList?: (list: SidebarListItem) => void;
  onRenameLabel?: (label: SidebarLabelItem) => void;
  onDeleteLabel?: (label: SidebarLabelItem) => void;
  onChangeLabelColor?: (label: SidebarLabelItem) => void;
};

export function ListIcon({
  color,
  size = 16,
}: {
  color: string;
  size?: number;
}) {
  return (
    <AppSymbol ios="list.bullet" android="list" size={size} tintColor={color} />
  );
}

export function ListsSidebarShell({
  loading,
  data,
  error,
  refreshing,
  onRefresh,
  onRetry,
  onCreateList,
  onCreateLabel,
  children,
}: {
  loading: boolean;
  data: SidebarData | null;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  onCreateList?: () => void;
  onCreateLabel?: () => void;
  children: (refreshControl: ReactNode) => ReactNode;
}) {
  const theme = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  ) as React.ReactElement<RefreshControlProps>;

  return (
    <View className="relative flex-1 bg-lists-bg">
      <GestureHandlerRootView className="flex-1">
        <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
          <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
            <View className="flex-row items-center gap-2">
              <View className="h-[24px] w-[24px] items-center justify-center rounded-full bg-[#a7a7a7]">
                <Text className="text-[12px] font-bold text-white">M</Text>
              </View>
              <Text className="text-[10px] font-semibold text-zinc-500">
                Martin Feher
              </Text>
            </View>
            <View className="flex-row items-center gap-4">
              <AppSymbol
                ios="bell"
                android="notifications"
                size={20}
                tintColor={theme.textSecondary}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Settings"
                hitSlop={8}
                onPress={() => setSettingsOpen(true)}
              >
                <AppSymbol
                  ios="gearshape"
                  android="settings"
                  size={20}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          {loading && !data ? (
            <View className="flex-1 items-center justify-center gap-2 px-6">
              <ActivityIndicator size="large" color="#4873c7" />
              <Text className="text-[15px] text-zinc-500">Loading lists…</Text>
            </View>
          ) : error && !data ? (
            <View className="flex-1 items-center justify-center gap-2 px-6">
              <Text className="text-center text-base font-semibold text-lists-error">
                {error}
              </Text>
              <Text className="text-center text-[13px] text-zinc-500">
                Make sure the web app is running at {API_BASE_URL}
              </Text>
              <Pressable
                className="mt-2 rounded-lg bg-lists-accent px-4 py-2 active:opacity-85"
                onPress={onRetry}
              >
                <Text className="font-semibold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : (
            children(refreshControl)
          )}
        </SafeAreaView>
      </GestureHandlerRootView>
      {onCreateList && onCreateLabel ? (
        <ListsCreateButton
          onCreateList={onCreateList}
          onCreateLabel={onCreateLabel}
        />
      ) : null}
      <SettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </View>
  );
}

export function ListsPinnedRows({
  data,
  selectedView,
  onSelectView,
  navIconColor,
}: {
  data: SidebarData | null;
  selectedView: SelectedView | null;
  onSelectView: (view: SelectedView) => void;
  navIconColor: string;
}) {
  const todaySelected = selectedView?.type === "today";
  const inboxList = findInboxList(data?.lists ?? []);
  const inboxSelected =
    inboxList != null &&
    selectedView?.type === "list" &&
    selectedView.id === inboxList.id;
  const importantSelected = selectedView?.type === "important";

  return (
    <>
      <SidebarRow
        title="Today"
        count={data?.counts.today}
        countNudgeLeft={36}
        selected={todaySelected}
        icon={
          <CiCalendarDateIcon
            size={20}
            color={todaySelected ? "#111111" : navIconColor}
          />
        }
        onPress={() => onSelectView({ type: "today" })}
      />
      {inboxList ? (
        <SidebarRow
          title="Inbox"
          count={inboxList.taskCount}
          countNudgeLeft={36}
          selected={inboxSelected}
          icon={
            <LuInboxIcon
              size={17}
              strokeWidth={1}
              color={inboxSelected ? "#111111" : navIconColor}
            />
          }
          onPress={() => onSelectView({ type: "list", id: inboxList.id })}
        />
      ) : null}
      <SidebarRow
        title="Important"
        count={data?.counts.important}
        countNudgeLeft={36}
        selected={importantSelected}
        icon={
          <LuStarIcon
            size={18}
            strokeWidth={1}
            color={importantSelected ? "#111111" : navIconColor}
          />
        }
        onPress={() => onSelectView({ type: "important" })}
      />

      <View className="mx-4 my-2 h-px bg-lists-divider" />

      <Text className="px-4 pb-1 text-xs font-medium text-lists-muted">
        Lists
      </Text>
    </>
  );
}

export function ListsLabelsSection({
  data,
  selectedView,
  onSelectView,
  onCreateLabel,
  onRenameLabel,
  onDeleteLabel,
  onChangeLabelColor,
}: {
  data: SidebarData | null;
  selectedView: SelectedView | null;
  onSelectView: (view: SelectedView) => void;
  navIconColor: string;
  onCreateLabel?: () => void;
  onRenameLabel?: (label: SidebarLabelItem) => void;
  onDeleteLabel?: (label: SidebarLabelItem) => void;
  onChangeLabelColor?: (label: SidebarLabelItem) => void;
}) {
  const [apiLabels, setApiLabels] = useState<SidebarLabelItem[] | null>(null);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [labelsExpanded, setLabelsExpanded] = useState(true);
  const showLabelItems = labelsExpanded || selectedView?.type === "label";

  useEffect(() => {
    let cancelled = false;
    setLabelsLoading(true);

    void fetchLabels()
      .then((labels) => {
        if (cancelled) return;
        const counts = new Map(
          (data?.labels ?? []).map((label) => [label.id, label.taskCount]),
        );
        setApiLabels(
          labels.map((label) => ({
            id: label.id,
            label: label.label,
            color: label.color ?? null,
            taskCount: counts.get(label.id) ?? 0,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setApiLabels(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLabelsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [data?.labels]);

  const labels = useMemo(() => {
    if (apiLabels) return apiLabels;
    return data?.labels ?? [];
  }, [apiLabels, data?.labels]);

  if (labelsLoading && labels.length === 0) {
    return (
      <>
        <LabelsSectionHeader
          expanded={showLabelItems}
          onToggle={() => setLabelsExpanded((current) => !current)}
          onAddLabel={onCreateLabel}
        />
        {showLabelItems ? (
          <View className="items-center py-3">
            <ActivityIndicator size="small" color="#4873c7" />
          </View>
        ) : null}
      </>
    );
  }

  function openLabelMenu(label: SidebarLabelItem) {
    const actions: {
      text: string;
      style?: "destructive" | "cancel";
      onPress?: () => void;
    }[] = [];

    if (onRenameLabel) {
      actions.push({
        text: "Edit title",
        onPress: () => onRenameLabel(label),
      });
    }

    if (onChangeLabelColor) {
      actions.push({
        text: "Color",
        onPress: () => onChangeLabelColor(label),
      });
    }

    if (onDeleteLabel) {
      actions.push({
        text: "Delete",
        style: "destructive",
        onPress: () => onDeleteLabel(label),
      });
    }

    actions.push({ text: "Cancel", style: "cancel" });

    if (actions.length <= 1) return;

    Alert.alert(label.label, undefined, actions);
  }

  return (
    <>
      <LabelsSectionHeader
        expanded={showLabelItems}
        onToggle={() => setLabelsExpanded((current) => !current)}
        onAddLabel={onCreateLabel}
      />
      {showLabelItems ? (
        labels.length === 0 ? (
          <Text className="px-4 pb-1 text-xs text-lists-muted">No labels</Text>
        ) : (
          labels.map((label) => {
            const selected =
              selectedView?.type === "label" && selectedView.id === label.id;
            const colorDot = getLabelDotColor(label);

            return (
              <SidebarRow
                key={label.id}
                title={label.label}
                count={label.taskCount}
                alwaysShowCount
                colorDot={colorDot}
                selected={selected}
                showMenu={Boolean(
                  onRenameLabel || onDeleteLabel || onChangeLabelColor,
                )}
                onPress={() => onSelectView({ type: "label", id: label.id })}
                onPressMenu={() => openLabelMenu(label)}
              />
            );
          })
        )
      ) : null}
    </>
  );
}

function LabelsSectionHeader({
  expanded,
  onToggle,
  onAddLabel,
}: {
  expanded: boolean;
  onToggle: () => void;
  onAddLabel?: () => void;
}) {
  return (
    <View className="mt-3 flex-row items-center px-4 pb-1.5">
      <Pressable
        className="min-w-0 flex-1 active:opacity-70"
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel="Labels"
      >
        <Text className="text-[11px] font-semibold uppercase tracking-[0.06em] text-lists-muted">
          Labels
        </Text>
      </Pressable>
      <View
        className="flex-row items-center"
        style={{ transform: [{ translateX: -10 }] }}
      >
        {onAddLabel ? (
          <Pressable
            className="h-6 w-6 items-center justify-center active:opacity-70"
            onPress={onAddLabel}
            accessibilityRole="button"
            accessibilityLabel="Add label"
            hitSlop={6}
          >
            <LuPlusIcon size={17} color="#acadb2" />
          </Pressable>
        ) : null}
        <Pressable
          className="-mr-3 h-6 w-6 items-center justify-center active:opacity-70"
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? "Collapse labels" : "Expand labels"}
          hitSlop={6}
        >
          <View
            style={{
              transform: [{ rotate: expanded ? "0deg" : "-90deg" }],
            }}
          >
            <BiChevronDownIcon size={19} color="#c0c5e0" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
