import { Image } from "expo-image";
import { type Href, router, useNavigation } from "expo-router";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    InteractionManager,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AppSymbol } from "@/components/app-symbol";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import {
    fetchLastSearchQuery,
    fetchSearchTasks,
    saveLastSearchQuery,
} from "@/lib/api";
import { parseTaskDetails } from "@/lib/parse-task-details";
import type { SearchTask } from "@/types/todo";

type SearchScope = "all" | "names" | "content";

const SEARCH_RESULT_LIMIT = 50;
const SEARCH_QUERY_SAVE_MS = 400;
const RESULT_ROW_HEIGHT = 64;
const RESULT_PREVIEW_SIZE = 52;
const COMPACT_SHEET_HEIGHT_RATIO = 0.72;
const EXPANDED_SHEET_TOP_MARGIN = 12;
const SHEET_HEIGHT_ANIMATION_MS = 280;

const SEARCH_SCOPE_TABS: { id: SearchScope; label: string }[] = [
  { id: "all", label: "All" },
  { id: "names", label: "Names" },
  { id: "content", label: "Task content" },
];

const EMPTY_DETAILS = new Set(["", "<br>", "<div><br></div>", "<p><br></p>"]);

function detailsToPlainText(details: string) {
  return details
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/div>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0|\u200B/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstDescriptionLine(details: string) {
  const text = details
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0|\u200B/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  if (!text) return "";
  return (
    text
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ?? ""
  );
}

function taskDetailsHasContent(details: string) {
  const trimmed = details.trim();
  if (!trimmed || EMPTY_DETAILS.has(trimmed)) return false;
  if (trimmed.includes("detail-image-wrapper") || /<img[\s>]/i.test(trimmed)) {
    return true;
  }
  return detailsToPlainText(trimmed).length > 0;
}

type IndexedSearchTask = SearchTask & {
  normalizedName: string;
  normalizedDetails: string;
  plainDetails: string;
  previewLine: string;
};

function buildSearchIndex(tasks: SearchTask[]): IndexedSearchTask[] {
  return tasks.map((task) => {
    const plainDetails = detailsToPlainText(task.details ?? "");
    return {
      ...task,
      normalizedName: task.name.toLowerCase(),
      plainDetails,
      previewLine: firstDescriptionLine(task.details ?? ""),
      normalizedDetails: plainDetails.toLowerCase(),
    };
  });
}

function taskMatchesScope(
  task: IndexedSearchTask,
  query: string,
  scope: SearchScope,
) {
  const trimmed = query.trim().toLowerCase();
  const nameMatch = task.normalizedName.includes(trimmed);
  const contentMatch = task.normalizedDetails.includes(trimmed);

  if (scope === "names") return nameMatch;
  if (scope === "content") return contentMatch;
  return nameMatch || contentMatch;
}

function filterTasks(
  index: IndexedSearchTask[],
  query: string,
  scope: SearchScope,
) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const openMatches: IndexedSearchTask[] = [];
  const completedMatches: IndexedSearchTask[] = [];

  for (const task of index) {
    if (!taskMatchesScope(task, trimmed, scope)) continue;
    if (task.completed) completedMatches.push(task);
    else openMatches.push(task);
  }

  return [...openMatches, ...completedMatches].slice(0, SEARCH_RESULT_LIMIT);
}

function HighlightedText({
  text,
  query,
  style,
  numberOfLines,
}: {
  text: string;
  query: string;
  style?: object;
  numberOfLines?: number;
}) {
  const trimmed = query.trim();
  if (!trimmed) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const parts: { text: string; match: boolean; key: string }[] = [];
  let lastIndex = 0;
  let matchIndex = lowerText.indexOf(lowerQuery, lastIndex);
  let key = 0;

  while (matchIndex !== -1) {
    if (matchIndex > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, matchIndex),
        match: false,
        key: `t-${key++}`,
      });
    }
    parts.push({
      text: text.slice(matchIndex, matchIndex + lowerQuery.length),
      match: true,
      key: `m-${key++}`,
    });
    lastIndex = matchIndex + lowerQuery.length;
    matchIndex = lowerText.indexOf(lowerQuery, lastIndex);
  }

  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      match: false,
      key: `t-${key++}`,
    });
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part) =>
        part.match ? (
          <Text key={part.key} style={styles.highlight}>
            {part.text}
          </Text>
        ) : (
          <Text key={part.key}>{part.text}</Text>
        ),
      )}
    </Text>
  );
}

function SearchResultPreview({ task }: { task: IndexedSearchTask }) {
  const blocks = useMemo(
    () => parseTaskDetails(task.details ?? ""),
    [task.details],
  );
  const image = blocks.find((block) => block.type === "image");

  if (image && image.type === "image") {
    return (
      <Image
        source={{ uri: image.uri }}
        style={[styles.resultPreview, styles.resultPreviewImage]}
        contentFit="cover"
      />
    );
  }

  return (
    <View style={styles.resultPreview}>
      <Text style={styles.resultPreviewTitle} numberOfLines={2}>
        {task.name}
      </Text>
      {task.plainDetails ? (
        <Text style={styles.resultPreviewBody} numberOfLines={5}>
          {task.plainDetails}
        </Text>
      ) : (
        <Text style={styles.resultPreviewEmpty} numberOfLines={2}>
          {task.listName}
        </Text>
      )}
    </View>
  );
}

type SearchModalProps = {
  /** Embedded in the Search tab (tab bar stays visible). Default is full-screen modal. */
  variant?: "modal" | "embedded";
};

export function SearchModal({ variant = "modal" }: SearchModalProps) {
  const isEmbedded = variant === "embedded";
  const { completeTask, uncompleteTask, lastTabHref, suppressNextSearchOpen } =
    useApp();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const inputRef = useRef<TextInput>(null);
  const queryRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTabHrefRef = useRef(lastTabHref);
  const openingTaskRef = useRef(false);

  const [query, setQuery] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("all");
  const [tasks, setTasks] = useState<SearchTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const isFiltering = query !== deferredQuery;

  queryRef.current = query;
  lastTabHrefRef.current = lastTabHref;

  function focusSearchInput() {
    InteractionManager.runAfterInteractions(() => {
      inputRef.current?.focus();
    });
    setTimeout(() => inputRef.current?.focus(), Platform.OS === "ios" ? 80 : 0);
  }

  function leaveSearchTab() {
    const target = lastTabHrefRef.current || "/";
    if (target.includes("search")) return;
    router.navigate(target as Href);
  }

  function handleClose() {
    if (openingTaskRef.current) return;
    void saveLastSearchQuery(queryRef.current).catch(() => {});
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
    leaveSearchTab();
  }

  useEffect(() => {
    if (isEmbedded) return;
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      void saveLastSearchQuery(queryRef.current).catch(() => {});
      // Opening a task replaces this screen — do not navigate to Lists/Tasks.
      if (openingTaskRef.current) return;
      setTimeout(() => {
        leaveSearchTab();
      }, 0);
    });
    return unsubscribe;
  }, [isEmbedded, navigation]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoadingTasks(true);
      try {
        const [savedQuery, searchTasks] = await Promise.all([
          fetchLastSearchQuery().catch(() => ""),
          fetchSearchTasks(),
        ]);
        if (cancelled) return;
        setQuery(savedQuery);
        setTasks(searchTasks);
      } catch {
        if (!cancelled) setTasks([]);
      } finally {
        if (!cancelled) {
          setLoadingTasks(false);
          focusSearchInput();
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
      void saveLastSearchQuery(queryRef.current).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveLastSearchQuery(query).catch(() => {});
    }, SEARCH_QUERY_SAVE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [query]);

  const searchIndex = useMemo(() => buildSearchIndex(tasks), [tasks]);
  const results = useMemo(
    () => filterTasks(searchIndex, deferredQuery, searchScope),
    [deferredQuery, searchIndex, searchScope],
  );

  useEffect(() => {
    if (results.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !results.some((task) => task.id === activeId)) {
      setActiveId(results[0]?.id ?? null);
    }
  }, [results, activeId]);

  const activeTask = results.find((task) => task.id === activeId) ?? null;
  const previewBlocks = useMemo(() => {
    if (!activeTask) return [];
    return parseTaskDetails(activeTask.details ?? "");
  }, [activeTask]);

  const trimmedQuery = query.trim();
  const highlightQuery = deferredQuery.trim();
  const hasResults =
    trimmedQuery.length > 0 &&
    results.length > 0 &&
    !isFiltering &&
    !loadingTasks;
  const compactSheetHeight = windowHeight * COMPACT_SHEET_HEIGHT_RATIO;
  const expandedSheetHeight = Math.max(
    compactSheetHeight,
    windowHeight - insets.top - EXPANDED_SHEET_TOP_MARGIN,
  );
  const sheetHeight = useSharedValue(compactSheetHeight);

  useEffect(() => {
    if (isEmbedded) return;
    sheetHeight.value = withTiming(
      hasResults ? expandedSheetHeight : compactSheetHeight,
      { duration: SHEET_HEIGHT_ANIMATION_MS },
    );
  }, [
    compactSheetHeight,
    expandedSheetHeight,
    hasResults,
    isEmbedded,
    sheetHeight,
  ]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }));

  const emptyStateMessage =
    searchScope === "names"
      ? "Start typing to search task names"
      : searchScope === "content"
        ? "Start typing to search task content"
        : "Start typing to search task names and content";

  function handleSelectTask(task: SearchTask) {
    openingTaskRef.current = true;
    suppressNextSearchOpen();
    void saveLastSearchQuery(queryRef.current).catch(() => {});
    // Only present the task sheet for now; on close, open that task's list.
    router.replace({
      pathname: "/task/[id]",
      params: {
        id: task.id,
        name: task.name,
        listName: task.listName ?? "",
        dueDate: task.dueDate ?? "",
        listId: task.listId,
        fromSearch: "1",
      },
    });
  }

  function handleToggleComplete(task: SearchTask, completed: boolean) {
    if (completed) {
      void completeTask(task.id);
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, completed: true } : item,
        ),
      );
      return;
    }
    void uncompleteTask(task.id);
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, completed: false } : item,
      ),
    );
  }

  const previewPanelPaddingBottom = isEmbedded
    ? Spacing.three
    : Math.max(insets.bottom, Spacing.three);

  const searchContent = (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {!isEmbedded ? (
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>
      ) : null}

      <View style={styles.header}>
        <View style={styles.searchBar}>
          <AppSymbol
            ios="magnifyingglass"
            android="search"
            size={20}
            tintColor="#a1a1aa"
          />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search tasks and notes"
            placeholderTextColor="#a1a1aa"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={styles.input}
          />
          {loadingTasks ? (
            <ActivityIndicator size="small" color="#a1a1aa" />
          ) : null}
        </View>
        {!isEmbedded ? (
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close search"
          >
            <ThemedText style={styles.cancel}>Cancel</ThemedText>
          </Pressable>
        ) : null}
      </View>

          <View style={styles.scopeRow}>
            {SEARCH_SCOPE_TABS.map((tab) => {
              const selected = searchScope === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => {
                    setSearchScope(tab.id);
                    focusSearchInput();
                  }}
                  style={[styles.scopeTab, selected && styles.scopeTabSelected]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.scopeTabText,
                      selected && styles.scopeTabTextSelected,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.body, isFiltering && styles.bodyFiltering]}>
            {!trimmedQuery ? (
              <ThemedText themeColor="textSecondary" style={styles.emptyHint}>
                {emptyStateMessage}
              </ThemedText>
            ) : results.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.emptyHint}>
                {loadingTasks ? "Searching…" : "No tasks found"}
              </ThemedText>
            ) : (
              <>
                <FlatList
                  style={styles.resultsList}
                  data={results}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.listContent}
                  ListFooterComponent={
                    results.length >= SEARCH_RESULT_LIMIT ? (
                      <ThemedText
                        themeColor="textSecondary"
                        style={styles.limitHint}
                      >
                        Showing first {SEARCH_RESULT_LIMIT} matches
                      </ThemedText>
                    ) : null
                  }
                  renderItem={({ item, index }) => {
                    const isFirstCompleted =
                      item.completed &&
                      (index === 0 || !results[index - 1]?.completed);
                    const selected = item.id === activeId;

                    return (
                      <View>
                        {isFirstCompleted ? (
                          <Text style={styles.completedHeader}>Completed</Text>
                        ) : null}
                        <Pressable
                          style={[
                            styles.resultRow,
                            selected && styles.resultRowSelected,
                            item.completed && !selected && styles.resultBlurred,
                          ]}
                          onPress={() => handleSelectTask(item)}
                          accessibilityRole="button"
                          accessibilityLabel={`Open task ${item.name}`}
                        >
                          <Pressable
                            style={styles.checkboxHit}
                            onPress={() =>
                              handleToggleComplete(item, !item.completed)
                            }
                            hitSlop={8}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: item.completed }}
                            accessibilityLabel={`Complete ${item.name}`}
                          >
                            <View
                              style={[
                                styles.checkbox,
                                item.completed && styles.checkboxChecked,
                              ]}
                            >
                              {item.completed ? (
                                <AppSymbol
                                  ios="checkmark"
                                  android="check"
                                  size={12}
                                  tintColor="#fff"
                                />
                              ) : null}
                            </View>
                          </Pressable>
                          <View style={styles.resultText}>
                            <HighlightedText
                              text={item.name}
                              query={highlightQuery}
                              numberOfLines={1}
                              style={[
                                styles.resultTitle,
                                item.completed && styles.completedTitle,
                              ]}
                            />
                            {item.previewLine ? (
                              <HighlightedText
                                text={item.previewLine}
                                query={
                                  searchScope === "names" ? "" : highlightQuery
                                }
                                numberOfLines={1}
                                style={styles.resultDescription}
                              />
                            ) : null}
                            <Text style={styles.meta} numberOfLines={1}>
                              {item.listName}
                            </Text>
                          </View>
                          <SearchResultPreview task={item} />
                        </Pressable>
                      </View>
                    );
                  }}
                />

                <View
                  style={[
                    styles.previewPanel,
                    { paddingBottom: previewPanelPaddingBottom },
                  ]}
                >
                  {activeTask ? (
                    <>
                      <Pressable
                        style={styles.previewHeader}
                        onPress={() => handleSelectTask(activeTask)}
                        accessibilityRole="button"
                        accessibilityLabel={`Open task ${activeTask.name}`}
                      >
                        <HighlightedText
                          text={activeTask.name}
                          query={highlightQuery}
                          numberOfLines={2}
                          style={[
                            styles.previewTitle,
                            activeTask.completed && styles.completedTitle,
                          ]}
                        />
                        <Text style={styles.meta}>{activeTask.listName}</Text>
                        <Text style={styles.openHint}>Tap to open</Text>
                      </Pressable>
                      <ScrollView
                        style={styles.previewScroll}
                        contentContainerStyle={styles.previewContent}
                        keyboardShouldPersistTaps="handled"
                      >
                        {searchScope === "names" ? (
                          <Text style={styles.previewEmpty}>
                            Switch to All or Task content to preview notes
                          </Text>
                        ) : previewBlocks.length === 0 ? (
                          <Text style={styles.previewEmpty}>
                            {taskDetailsHasContent(activeTask.details)
                              ? "Loading content…"
                              : "No content"}
                          </Text>
                        ) : (
                          previewBlocks.map((block, index) => {
                            if (block.type === "text") {
                              return (
                                <HighlightedText
                                  key={`text-${index}`}
                                  text={block.text}
                                  query={
                                    searchScope === "content" ||
                                    searchScope === "all"
                                      ? highlightQuery
                                      : ""
                                  }
                                  style={styles.previewBody}
                                />
                              );
                            }
                            if (block.type === "link") {
                              return (
                                <Text
                                  key={`link-${index}`}
                                  style={styles.previewLink}
                                >
                                  {block.text}
                                </Text>
                              );
                            }
                            return (
                              <Text
                                key={`image-${index}`}
                                style={styles.previewEmpty}
                              >
                                [Image]
                              </Text>
                            );
                          })
                        )}
                      </ScrollView>
                    </>
                  ) : (
                    <Text style={styles.previewEmpty}>
                      Select a task to preview
                    </Text>
                  )}
                </View>
              </>
            )}
          </View>
    </KeyboardAvoidingView>
  );

  if (isEmbedded) {
    return (
      <SafeAreaView style={styles.embeddedRoot} edges={["top", "left", "right"]}>
        {searchContent}
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.overlay}>
      <Pressable
        style={styles.backdrop}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Close search"
      />
      <Animated.View style={[styles.sheet, sheetAnimatedStyle]}>
        {searchContent}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  embeddedRoot: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  root: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  handleRow: {
    alignItems: "center",
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#d1d5db",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    minHeight: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e4e4e7",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#18181b",
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
  },
  cancel: {
    fontSize: 16,
    color: "#4873c7",
    fontWeight: "500",
  },
  scopeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e4e4e7",
  },
  scopeTab: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 5,
    backgroundColor: "#e4e4e7",
  },
  scopeTabSelected: {
    backgroundColor: "#18181b",
  },
  scopeTabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#52525b",
  },
  scopeTabTextSelected: {
    color: "#ffffff",
  },
  body: {
    flex: 1,
  },
  bodyFiltering: {
    opacity: 0.7,
  },
  emptyHint: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    fontSize: 14,
  },
  resultsList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.two,
  },
  limitHint: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 12,
  },
  completedHeader: {
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
    paddingBottom: 4,
    fontSize: 10,
    fontWeight: "500",
    color: "#999999",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: Spacing.three,
    minHeight: RESULT_ROW_HEIGHT,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f4f4f5",
  },
  resultRowSelected: {
    backgroundColor: "#f4f4f5",
  },
  resultBlurred: {
    opacity: 0.55,
  },
  checkboxHit: {
    paddingVertical: 10,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: "#469bd3",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  resultText: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 4,
    gap: 2,
  },
  resultTitle: {
    fontSize: 15,
    color: "#18181b",
  },
  resultDescription: {
    fontSize: 13,
    lineHeight: 17,
    color: "#71717a",
  },
  completedTitle: {
    textDecorationLine: "line-through",
    color: "#a1a1aa",
  },
  meta: {
    fontSize: 12,
    color: "#a1a1aa",
    marginTop: 1,
  },
  resultPreview: {
    width: RESULT_PREVIEW_SIZE,
    height: RESULT_PREVIEW_SIZE,
    borderRadius: 8,
    backgroundColor: "#f4f4f5",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e4e4e7",
    overflow: "hidden",
    padding: 5,
  },
  resultPreviewImage: {
    padding: 0,
  },
  resultPreviewTitle: {
    fontSize: 7,
    lineHeight: 9,
    fontWeight: "700",
    color: "#18181b",
  },
  resultPreviewBody: {
    marginTop: 3,
    fontSize: 6,
    lineHeight: 8,
    color: "#52525b",
  },
  resultPreviewEmpty: {
    marginTop: 3,
    fontSize: 6,
    lineHeight: 8,
    color: "#a1a1aa",
  },
  highlight: {
    backgroundColor: "#f5fcd0",
  },
  previewPanel: {
    flex: 0.9,
    minHeight: 180,
    maxHeight: "42%",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e4e4e7",
    backgroundColor: "rgba(250,250,250,0.9)",
  },
  previewHeader: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f4f4f5",
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#18181b",
  },
  openHint: {
    marginTop: 6,
    fontSize: 12,
    color: "#4873c7",
    fontWeight: "500",
  },
  previewScroll: {
    flex: 1,
  },
  previewContent: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: 8,
  },
  previewBody: {
    fontSize: 14,
    lineHeight: 21,
    color: "#3f3f46",
  },
  previewLink: {
    fontSize: 14,
    color: "#2563eb",
  },
  previewEmpty: {
    fontSize: 14,
    color: "#a1a1aa",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
});
