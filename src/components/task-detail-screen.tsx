import { Image } from "expo-image";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";

import { AppSymbol } from "@/components/app-symbol";
import { CalendarColorControl } from "@/components/calendar-color-control";
import {
  FormattedNotesInput,
  type NotesInputHandle,
} from "@/components/formatted-notes-input";
import { IoMdTimeIcon } from "@/components/io-md-time-icon";
import { LuPlusIcon } from "@/components/lu-plus-icon";
import { RiAttachment2Icon } from "@/components/ri-attachment2-icon";
import { TaskCheckbox } from "@/components/task-checkbox";
import {
  TaskDatePickerSheet,
  type TaskScheduleSelection,
} from "@/components/task-date-picker-sheet";
import { TaskLabelPicker } from "@/components/task-label-picker";
import { TaskListPicker } from "@/components/task-list-picker";
import {
  getTaskPriorityColor,
  PriorityFlagToolbarIcon,
  TaskPriorityFlagPopup,
} from "@/components/task-priority-flag-popup";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { useHistoryActionsRegistration } from "@/contexts/history-actions-toolbar-context";
import { useTextFormatToolbarRegistration } from "@/contexts/text-format-toolbar-context";
import {
  createSubtask,
  fetchLabels,
  fetchTaskDetail,
  fetchTasks,
  moveTaskToList,
  toggleTaskCompleted,
  toggleTaskLabel,
  updateTaskCalendarColor,
  updateTaskDetails,
  updateTaskName,
  updateTaskPriority,
  updateTaskSchedule,
} from "@/lib/api";
import { normalizeCalendarColor } from "@/lib/calendar-colors";
import { isEnrichedNotesInputAvailable } from "@/lib/enriched-notes-support";
import { formatTaskDueDate } from "@/lib/format-due-date";
import {
  htmlHasInlineFormatting,
  htmlNeedsFormattingMirror,
} from "@/lib/html-to-text-runs";
import { getLabelDotColor } from "@/lib/label-colors";
import { applyTaskReminder } from "@/lib/notifications";
import {
  parseTaskDetails,
  type ParsedDetailBlock,
} from "@/lib/parse-task-details";
import {
  detailsHtmlToPlainText,
  mergePlainTextEditIntoHtml,
} from "@/lib/task-content";
import {
  createEmptyTaskDetailHistory,
  snapshotsEqual,
  type TaskDetailSnapshot,
} from "@/lib/task-detail-history";
import {
  resolveTaskDetailsForSave,
  resolveTaskDetailsHtml,
  sanitizeTaskDetailsHtml,
  shouldPersistTaskDetails,
} from "@/lib/task-details-content";
import {
  extractMediaBlocksFromDoc,
  resolveTaskDoc,
  taskDocToPreviewText,
} from "@/lib/task-doc";
import { normalizeTaskRepeat } from "@/lib/task-repeat";
import {
  applyTextFormat,
  getEffectiveSelection,
  getSelectionBoldActive,
  getSelectionFontFamily,
  getSelectionFontSize,
  getSelectionHighlightColor,
  getSelectionLineHeight,
  hasTextSelection,
  type TextBlockType,
  type TextFormatAction,
} from "@/lib/text-format";
import type {
  SidebarListItem,
  TaskDetail,
  TaskItem,
  TaskLabel,
} from "@/types/todo";

function parseRouteInt(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

const VISUAL_SPAN_FORMAT_ACTIONS = new Set<TextFormatAction>([
  "highlight",
  "color",
  "fontSize",
  "lineHeight",
  "fontFamily",
]);

/** Span formats that collapse the selection to the caret after applying. */
const COLLAPSE_SELECTION_AFTER_FORMAT = new Set<TextFormatAction>([
  "highlight",
  "color",
]);

function shouldSkipNativeContentUpdateOnFormat(
  action: TextFormatAction,
  plainTextUnchanged: boolean,
) {
  return (
    plainTextUnchanged &&
    (action === "fontFamily" ||
      action === "fontSize" ||
      action === "lineHeight")
  );
}

function collapseSelectionAfterFormat(
  action: TextFormatAction,
  selection: { start: number; end: number },
) {
  if (!COLLAPSE_SELECTION_AFTER_FORMAT.has(action)) return selection;
  return { start: selection.end, end: selection.end };
}

const NATIVE_INLINE_TOGGLE_ACTIONS = new Set<TextFormatAction>([
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "code",
]);

const NAME_SAVE_DEBOUNCE_MS = 500;
const USE_NATIVE_RICH_NOTES = isEnrichedNotesInputAvailable();
const DETAILS_SAVE_DEBOUNCE_MS = 700;
/** Wait for native editor init callbacks before allowing notes persistence. */
const NOTES_HYDRATION_DELAY_MS = 1000;
const HISTORY_COMMIT_DEBOUNCE_MS = 500;
/** Minimum collapsed sheet height as a fraction of the screen. */
const TASK_SHEET_MIN_HEIGHT_FRACTION = 0.47;
/** Max scroll area when notes are long; keeps the sheet from exceeding ~80% screen. */
const TASK_SHEET_MAX_HEIGHT_FRACTION = 0.8;
const TASK_DETAIL_HANDLE_HEIGHT = 28;
const TASK_DETAIL_TOOLBAR_BODY_HEIGHT = 56;
const TOOLBAR_BOTTOM_SHIFT = 13;
const SCHEDULE_UNDO_ABOVE_GAP = 10;
const SCHEDULE_UNDO_RIGHT_INSET = 7;
const SCHEDULE_UNDO_BUTTON_HEIGHT = 36;
const SCHEDULE_UNDO_DURATION_MS = 6000;
const SUBTASKS_LINK_FONT_SIZE = 10;
const MARK_COMPLETE_BOTTOM_OFFSET = 57;
const MARK_COMPLETE_BUTTON_HEIGHT = 26;
const HISTORY_ACTIONS_ABOVE_MARK_COMPLETE = 7;

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function TaskDetailScreen() {
  const {
    id,
    name,
    listName,
    dueDate,
    listId,
    fromSearch,
    fromCalendar,
    calendarColor: calendarColorParam,
    dueTimeMinutes: dueTimeMinutesParam,
    dueDurationMinutes: dueDurationMinutesParam,
    dueRepeat: dueRepeatParam,
  } = useLocalSearchParams<{
    id: string;
    name?: string;
    listName?: string;
    dueDate?: string;
    listId?: string;
    fromSearch?: string;
    fromCalendar?: string;
    calendarColor?: string;
    dueTimeMinutes?: string;
    dueDurationMinutes?: string;
    dueRepeat?: string;
  }>();
  const resolvedTaskId = Array.isArray(id) ? id[0] : id;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const navigation = useNavigation();
  const {
    handleTaskCompleted,
    openTask,
    selectView,
    suppressNextSearchOpen,
    sidebarData,
    loadSidebar,
    deleteTask: removeTask,
    setCalendarTaskColor,
    patchCalendarTask,
    calendarTasks,
    calendarColorEpoch,
  } = useApp();
  const closingRef = useRef(false);
  const openedFromCalendar = fromCalendar === "1";
  const calendarTask = useMemo(
    () => calendarTasks.find((task) => task.id === resolvedTaskId),
    [calendarTasks, resolvedTaskId],
  );
  const calendarTasksRef = useRef(calendarTasks);
  calendarTasksRef.current = calendarTasks;
  const routeDueTimeMinutes = parseRouteInt(dueTimeMinutesParam);
  const routeDueDurationMinutes = parseRouteInt(dueDurationMinutesParam);
  const routeDueRepeat = normalizeTaskRepeat(
    Array.isArray(dueRepeatParam) ? dueRepeatParam[0] : dueRepeatParam,
  );

  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [subtasksSectionOpen, setSubtasksSectionOpen] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(true);
  const [subtasks, setSubtasks] = useState<TaskItem[]>([]);
  const [subtasksLoading, setSubtasksLoading] = useState(false);
  const [subtaskInputOpen, setSubtaskInputOpen] = useState(false);
  const [subtaskName, setSubtaskName] = useState("");
  const subtaskInputRef = useRef<TextInput>(null);
  const addingSubtaskRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [allLabels, setAllLabels] = useState<TaskLabel[]>([]);

  const pickerSchedule = useMemo(
    () => ({
      dueDate:
        detail?.dueDate ??
        (typeof dueDate === "string" && dueDate.length > 0 ? dueDate : null),
      dueTimeMinutes:
        detail?.dueTimeMinutes ??
        calendarTask?.dueTimeMinutes ??
        routeDueTimeMinutes,
      dueDurationMinutes:
        detail?.dueDurationMinutes ??
        calendarTask?.dueDurationMinutes ??
        routeDueDurationMinutes,
      dueRepeat:
        normalizeTaskRepeat(detail?.dueRepeat) ??
        normalizeTaskRepeat(calendarTask?.dueRepeat) ??
        routeDueRepeat,
    }),
    [
      calendarTask?.dueDurationMinutes,
      calendarTask?.dueRepeat,
      calendarTask?.dueTimeMinutes,
      detail?.dueDate,
      detail?.dueDurationMinutes,
      detail?.dueRepeat,
      detail?.dueTimeMinutes,
      dueDate,
      routeDueDurationMinutes,
      routeDueRepeat,
      routeDueTimeMinutes,
    ],
  );

  const [draftName, setDraftName] = useState(name ?? "");
  const [draftNotes, setDraftNotes] = useState("");
  const [notesHtml, setNotesHtml] = useState("");
  const [notesLoadSeq, setNotesLoadSeq] = useState(0);
  const [notesSelection, setNotesSelection] = useState({ start: 0, end: 0 });
  const [notesFocused, setNotesFocused] = useState(false);
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [caretTypingBold, setCaretTypingBold] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [expandedFullscreen, setExpandedFullscreen] = useState(false);
  const [calendarColorPickerOpen, setCalendarColorPickerOpen] = useState(false);
  const calendarColorTouchedRef = useRef(false);
  const calendarColor = useMemo(() => {
    if (!openedFromCalendar) {
      return normalizeCalendarColor(null);
    }

    if (calendarTask?.calendarColor) {
      return normalizeCalendarColor(calendarTask.calendarColor);
    }

    if (detail?.calendarColor) {
      return normalizeCalendarColor(detail.calendarColor);
    }

    if (typeof calendarColorParam === "string" && calendarColorParam) {
      return normalizeCalendarColor(calendarColorParam);
    }

    return normalizeCalendarColor(null);
  }, [
    calendarColorEpoch,
    calendarColorParam,
    calendarTask,
    detail,
    openedFromCalendar,
  ]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [scheduleUndoSnapshot, setScheduleUndoSnapshot] =
    useState<TaskScheduleSelection | null>(null);
  const [sheetTopY, setSheetTopY] = useState<number | null>(null);

  const lastSavedNameRef = useRef(name ?? "");
  const lastSavedNotesRef = useRef("");
  const lastSavedHtmlRef = useRef("");
  const detailsHtmlRef = useRef("");
  const draftNameRef = useRef(draftName);
  const draftNotesRef = useRef(draftNotes);
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesInputRef = useRef<NotesInputHandle>(null);
  const notesSelectionRef = useRef({ start: 0, end: 0 });
  const lastNotesSelectionRef = useRef({ start: 0, end: 0 });
  const caretTypingBoldRef = useRef(false);
  const lastCaretIndexRef = useRef(0);
  const linkEditorOpenRef = useRef(false);
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingCountRef = useRef(0);
  const taskIdRef = useRef(id);
  const sheetContainerRef = useRef<View>(null);
  const scheduleUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const historyRef = useRef(createEmptyTaskDetailHistory());
  const editSessionRef = useRef<{
    active: boolean;
    before: TaskDetailSnapshot | null;
  }>({
    active: false,
    before: null,
  });
  const historyCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isApplyingHistoryRef = useRef(false);
  const notesSaveEnabledRef = useRef(false);
  const suppressNativeHtmlChangeRef = useRef(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  draftNameRef.current = draftName;
  draftNotesRef.current = draftNotes;
  caretTypingBoldRef.current = caretTypingBold;
  taskIdRef.current = resolvedTaskId;

  const openedFromSearch = fromSearch === "1";

  const markSaving = useCallback(() => {
    savingCountRef.current += 1;
    setSaveStatus("saving");
    if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
  }, []);

  const markSaveFinished = useCallback((ok: boolean) => {
    savingCountRef.current = Math.max(0, savingCountRef.current - 1);
    if (savingCountRef.current > 0) return;

    setSaveStatus(ok ? "saved" : "error");
    if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
    saveStatusTimerRef.current = setTimeout(() => {
      setSaveStatus("idle");
    }, 1600);
  }, []);

  const saveNameNow = useCallback(
    async (nextName: string) => {
      const taskId = taskIdRef.current;
      if (!taskId) return;

      const trimmed = nextName.trim();
      if (!trimmed || trimmed === lastSavedNameRef.current) return;

      markSaving();
      try {
        await updateTaskName(taskId, trimmed);
        lastSavedNameRef.current = trimmed;
        setDetail((current) =>
          current ? { ...current, name: trimmed } : current,
        );
        handleTaskCompleted();
        markSaveFinished(true);
      } catch {
        markSaveFinished(false);
      }
    },
    [handleTaskCompleted, markSaveFinished, markSaving],
  );

  const saveNotesNow = useCallback(
    async (nextNotes: string, htmlOverride?: string) => {
      const taskId = taskIdRef.current;
      if (!taskId) return;
      if (!notesSaveEnabledRef.current && !isApplyingHistoryRef.current) return;

      const html = resolveTaskDetailsForSave(
        htmlOverride ?? detailsHtmlRef.current,
        lastSavedHtmlRef.current,
      );
      if (
        nextNotes === lastSavedNotesRef.current &&
        html === lastSavedHtmlRef.current
      ) {
        return;
      }

      markSaving();
      try {
        await updateTaskDetails(taskId, html);
        lastSavedNotesRef.current = nextNotes;
        lastSavedHtmlRef.current = html;
        detailsHtmlRef.current = html;
        setNotesHtml(html);
        setDetail((current) =>
          current ? { ...current, details: html } : current,
        );
        markSaveFinished(true);
      } catch {
        markSaveFinished(false);
      }
    },
    [markSaveFinished, markSaving],
  );

  const flushPendingSaves = useCallback(async () => {
    if (nameTimerRef.current) {
      clearTimeout(nameTimerRef.current);
      nameTimerRef.current = null;
    }
    if (notesTimerRef.current) {
      clearTimeout(notesTimerRef.current);
      notesTimerRef.current = null;
    }
    await Promise.all([
      saveNameNow(draftNameRef.current),
      saveNotesNow(draftNotesRef.current, detailsHtmlRef.current),
    ]);
  }, [saveNameNow, saveNotesNow]);

  const scheduleNameSave = useCallback(
    (value: string) => {
      if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
      nameTimerRef.current = setTimeout(() => {
        nameTimerRef.current = null;
        void saveNameNow(value);
      }, NAME_SAVE_DEBOUNCE_MS);
    },
    [saveNameNow],
  );

  const scheduleNotesSave = useCallback(
    (value: string, htmlOverride?: string) => {
      if (!notesSaveEnabledRef.current && !isApplyingHistoryRef.current) return;
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
      notesTimerRef.current = setTimeout(() => {
        notesTimerRef.current = null;
        void saveNotesNow(value, htmlOverride);
      }, DETAILS_SAVE_DEBOUNCE_MS);
    },
    [saveNotesNow],
  );

  const getSnapshot = useCallback((): TaskDetailSnapshot => {
    return {
      name: draftNameRef.current,
      notesPlain: draftNotesRef.current,
      notesHtml: detailsHtmlRef.current,
    };
  }, []);

  const applySnapshot = useCallback(
    (snapshot: TaskDetailSnapshot) => {
      isApplyingHistoryRef.current = true;

      if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);

      draftNameRef.current = snapshot.name;
      setDraftName(snapshot.name);
      draftNotesRef.current = snapshot.notesPlain;
      setDraftNotes(snapshot.notesPlain);
      detailsHtmlRef.current = snapshot.notesHtml;
      setNotesHtml(snapshot.notesHtml);
      notesInputRef.current?.setContent(snapshot.notesHtml);

      scheduleNameSave(snapshot.name);
      scheduleNotesSave(snapshot.notesPlain, snapshot.notesHtml);

      isApplyingHistoryRef.current = false;
      setHistoryVersion((version) => version + 1);
    },
    [scheduleNameSave, scheduleNotesSave],
  );

  const commitEditToHistory = useCallback(() => {
    if (isApplyingHistoryRef.current) return;

    const session = editSessionRef.current;
    if (!session.active || !session.before) return;

    const current = getSnapshot();
    if (!snapshotsEqual(session.before, current)) {
      historyRef.current.past.push(session.before);
      if (historyRef.current.past.length > 100) {
        historyRef.current.past.shift();
      }
      historyRef.current.future = [];
    }

    session.active = false;
    session.before = null;
    setHistoryVersion((version) => version + 1);
  }, [getSnapshot]);

  const beginEditSession = useCallback(() => {
    if (isApplyingHistoryRef.current) return;

    if (!editSessionRef.current.active) {
      editSessionRef.current.before = getSnapshot();
      editSessionRef.current.active = true;
    }

    if (historyCommitTimerRef.current)
      clearTimeout(historyCommitTimerRef.current);
    historyCommitTimerRef.current = setTimeout(() => {
      historyCommitTimerRef.current = null;
      commitEditToHistory();
    }, HISTORY_COMMIT_DEBOUNCE_MS);
  }, [commitEditToHistory, getSnapshot]);

  const cancelPendingHistoryCommit = useCallback(() => {
    if (historyCommitTimerRef.current) {
      clearTimeout(historyCommitTimerRef.current);
      historyCommitTimerRef.current = null;
    }
  }, []);

  const undoEdit = useCallback(() => {
    cancelPendingHistoryCommit();

    const session = editSessionRef.current;
    if (session.active && session.before) {
      const current = getSnapshot();
      if (!snapshotsEqual(current, session.before)) {
        historyRef.current.future.push(current);
        applySnapshot(session.before);
      }
      session.active = false;
      session.before = null;
      setHistoryVersion((version) => version + 1);
      return;
    }

    const past = historyRef.current.past;
    if (past.length === 0) return;

    const current = getSnapshot();
    const previous = past.pop();
    if (!previous) return;

    historyRef.current.future.push(current);
    applySnapshot(previous);
  }, [applySnapshot, cancelPendingHistoryCommit, getSnapshot]);

  const redoEdit = useCallback(() => {
    cancelPendingHistoryCommit();
    editSessionRef.current = { active: false, before: null };

    const future = historyRef.current.future;
    if (future.length === 0) return;

    const current = getSnapshot();
    const next = future.pop();
    if (!next) return;

    historyRef.current.past.push(current);
    applySnapshot(next);
  }, [applySnapshot, cancelPendingHistoryCommit, getSnapshot]);

  const handleNotesFormat = useCallback(
    (
      action: TextFormatAction,
      options?: {
        linkUrl?: string;
        linkText?: string;
        color?: string;
        highlightColor?: string;
        fontSize?: number;
        lineHeight?: number;
        blockType?: TextBlockType;
        fontFamily?: string;
      },
    ) => {
      const selection = notesSelectionRef.current;
      const collapsed = selection.start === selection.end;

      beginEditSession();
      const input = notesInputRef.current;

      const restoreSelection = () => {
        input?.setSelection(selection.start, selection.end);
      };

      const finishNativeFormat = (
        selectionOverride?: { start: number; end: number },
        options?: { preserveMetrics?: boolean },
      ) => {
        const target = selectionOverride ?? selection;
        const refocus = () => {
          input?.setSelection(target.start, target.end);
          input?.focus();
        };
        refocus();
        requestAnimationFrame(refocus);
        setTimeout(refocus, 0);
        if (options?.preserveMetrics) {
          setTimeout(refocus, 50);
          setTimeout(refocus, 120);
        }
      };

      if (collapsed && action === "bold") {
        // Typing-bold mode is independent of the character before the caret.
        const nextBold = !caretTypingBoldRef.current;

        // Never call native toggleBold with a collapsed selection — setSelection
        // is async, so toggleBold can run against a stale native word selection
        // and bold existing text instead of setting typing style for new input.
        caretTypingBoldRef.current = nextBold;
        setCaretTypingBold(nextBold);
        lastCaretIndexRef.current = selection.start;
        restoreSelection();
        requestAnimationFrame(() => {
          input?.focus();
        });
        return;
      }

      if (!hasTextSelection(selection)) return;

      if (USE_NATIVE_RICH_NOTES && input?.isNativeRichText) {
        restoreSelection();

        const canUseNativeInlineToggle =
          NATIVE_INLINE_TOGGLE_ACTIONS.has(action) &&
          !htmlNeedsFormattingMirror(detailsHtmlRef.current);

        if (canUseNativeInlineToggle) {
          if (action === "bold") {
            input.toggleBold?.();
            finishNativeFormat();
            return;
          }
          if (action === "italic") {
            input.toggleItalic?.();
            finishNativeFormat();
            return;
          }
          if (action === "underline") {
            input.toggleUnderline?.();
            finishNativeFormat();
            return;
          }
          if (action === "strikethrough") {
            input.toggleStrikeThrough?.();
            finishNativeFormat();
            return;
          }
          if (action === "code") {
            input.toggleInlineCode?.();
            finishNativeFormat();
            return;
          }
        }
        if (action === "bullet") {
          input.toggleUnorderedList?.();
          finishNativeFormat();
          return;
        }
        if (action === "numbered") {
          input.toggleOrderedList?.();
          finishNativeFormat();
          return;
        }
        if (action === "checklist") {
          input.toggleCheckboxList?.(false);
          finishNativeFormat();
          return;
        }
        if (action === "blockType") {
          if (options?.blockType === "h1") {
            input.toggleH1?.();
            finishNativeFormat();
            return;
          }
          if (options?.blockType === "h2") {
            input.toggleH2?.();
            finishNativeFormat();
            return;
          }
          if (options?.blockType === "h3") {
            input.toggleH3?.();
            finishNativeFormat();
            return;
          }
        }
        if (action === "link") {
          const selectedText = draftNotesRef.current.slice(
            selection.start,
            selection.end,
          );
          const linkText = (options?.linkText ?? selectedText).trim();
          const canUseNativeLink =
            linkText === selectedText &&
            !htmlNeedsFormattingMirror(detailsHtmlRef.current);

          if (canUseNativeLink) {
            input.setLink?.(
              selection.start,
              selection.end,
              linkText,
              options?.linkUrl ?? "",
            );
            finishNativeFormat();
            return;
          }
        }

        const syncedPlain = detailsHtmlToPlainText(detailsHtmlRef.current);
        const result = applyTextFormat(
          detailsHtmlRef.current,
          syncedPlain,
          selection,
          action,
          options,
        );

        if (result.html === detailsHtmlRef.current) {
          finishNativeFormat();
          return;
        }

        const nextSelection = collapseSelectionAfterFormat(
          action,
          result.selection,
        );
        const plainTextUnchanged = result.plainText === syncedPlain;
        const preserveSelectionMetrics =
          action === "fontFamily" ||
          action === "fontSize" ||
          action === "lineHeight";

        suppressNativeHtmlChangeRef.current = true;
        if (
          !shouldSkipNativeContentUpdateOnFormat(action, plainTextUnchanged) &&
          (action === "link" ||
            action === "clearFormatting" ||
            (VISUAL_SPAN_FORMAT_ACTIONS.has(action) &&
              htmlNeedsFormattingMirror(result.html)))
        ) {
          input?.setContent(result.html);
        }

        detailsHtmlRef.current = result.html;
        setNotesHtml(result.html);
        draftNotesRef.current = result.plainText;
        setDraftNotes(result.plainText);
        notesSelectionRef.current = nextSelection;
        lastNotesSelectionRef.current = nextSelection;
        setNotesSelection(nextSelection);
        scheduleNotesSave(result.plainText, result.html);
        setTimeout(() => {
          suppressNativeHtmlChangeRef.current = false;
        }, 400);
        finishNativeFormat(nextSelection, {
          preserveMetrics: preserveSelectionMetrics,
        });
        return;
      }

      const syncedPlain = detailsHtmlToPlainText(detailsHtmlRef.current);
      const result = applyTextFormat(
        detailsHtmlRef.current,
        syncedPlain,
        selection,
        action,
        options,
      );

      if (result.html === detailsHtmlRef.current) {
        requestAnimationFrame(() => {
          restoreSelection();
          input?.focus();
        });
        return;
      }

      const nextSelection = collapseSelectionAfterFormat(
        action,
        result.selection,
      );
      const plainTextUnchanged = result.plainText === syncedPlain;
      const preserveSelectionMetrics =
        action === "fontFamily" ||
        action === "fontSize" ||
        action === "lineHeight";

      if (!shouldSkipNativeContentUpdateOnFormat(action, plainTextUnchanged)) {
        input?.setContent(result.html);
      }
      detailsHtmlRef.current = result.html;
      setNotesHtml(result.html);
      draftNotesRef.current = result.plainText;
      setDraftNotes(result.plainText);
      notesSelectionRef.current = nextSelection;
      lastNotesSelectionRef.current = nextSelection;
      setNotesSelection(nextSelection);
      scheduleNotesSave(result.plainText, result.html);

      const refocusSelection = () => {
        input?.setSelection(nextSelection.start, nextSelection.end);
        input?.focus();
      };
      requestAnimationFrame(refocusSelection);
      if (preserveSelectionMetrics) {
        setTimeout(refocusSelection, 50);
        setTimeout(refocusSelection, 120);
      }
    },
    [beginEditSession, scheduleNotesSave],
  );

  const keepNotesKeyboardFocus = useCallback(() => {
    notesInputRef.current?.focus();
  }, []);

  const handleLinkEditorOpenChange = useCallback((open: boolean) => {
    linkEditorOpenRef.current = open;
    setLinkEditorOpen(open);
  }, []);

  const dismissLinkEditor = useCallback(() => {
    if (!linkEditorOpenRef.current) return;
    linkEditorOpenRef.current = false;
    setLinkEditorOpen(false);
  }, []);

  const hasNotesTextSelection = notesSelection.end > notesSelection.start;
  const showFormatToolbar =
    ((notesFocused && hasNotesTextSelection) || linkEditorOpen) &&
    !datePickerOpen;

  const selectionBoldActive = useMemo(() => {
    const selection = notesSelection;
    if (selection.end > selection.start) {
      return getSelectionBoldActive(notesHtml, selection);
    }
    // Collapsed caret: reflect explicit typing-bold mode only (blue icon).
    return caretTypingBold;
  }, [notesHtml, notesSelection, caretTypingBold]);

  const selectionHighlightColor = useMemo(() => {
    const selection = getEffectiveSelection(
      notesSelection,
      lastNotesSelectionRef.current,
    );
    return getSelectionHighlightColor(notesHtml, selection);
  }, [notesHtml, notesSelection]);

  const selectionFontSize = useMemo(() => {
    const selection = getEffectiveSelection(
      notesSelection,
      lastNotesSelectionRef.current,
    );
    return getSelectionFontSize(notesHtml, selection);
  }, [notesHtml, notesSelection]);

  const selectionLineHeight = useMemo(() => {
    const selection = getEffectiveSelection(
      notesSelection,
      lastNotesSelectionRef.current,
    );
    return getSelectionLineHeight(notesHtml, selection);
  }, [notesHtml, notesSelection]);

  const selectionFontFamily = useMemo(() => {
    const selection = getEffectiveSelection(
      notesSelection,
      lastNotesSelectionRef.current,
    );
    return getSelectionFontFamily(notesHtml, selection);
  }, [notesHtml, notesSelection]);

  const selectionText = useMemo(() => {
    const selection = getEffectiveSelection(
      notesSelection,
      lastNotesSelectionRef.current,
    );
    if (selection.end <= selection.start) return null;
    return draftNotes.slice(selection.start, selection.end).trim() || null;
  }, [notesSelection, draftNotes]);

  const canAdjustFontSize = useMemo(() => {
    const selection = getEffectiveSelection(
      notesSelection,
      lastNotesSelectionRef.current,
    );
    return hasTextSelection(selection);
  }, [notesSelection]);

  const canAdjustLineHeight = canAdjustFontSize;

  const clearNotesSelection = useCallback(() => {
    const cleared = { start: 0, end: 0 };
    notesSelectionRef.current = cleared;
    lastNotesSelectionRef.current = cleared;
    setNotesSelection(cleared);
    notesInputRef.current?.setSelection(0, 0);
  }, []);

  const toolbarFooterInset =
    keyboardHeight > 0
      ? Spacing.two
      : insets.bottom > 0
        ? Math.max(
            insets.bottom - TOOLBAR_BOTTOM_SHIFT + Spacing.two,
            Spacing.two,
          )
        : Spacing.two;
  const toolbarBottomOffset =
    keyboardHeight > 0
      ? keyboardHeight + 8
      : TASK_DETAIL_TOOLBAR_BODY_HEIGHT + toolbarFooterInset;

  useTextFormatToolbarRegistration(
    showFormatToolbar,
    toolbarBottomOffset,
    {
      onFormat: handleNotesFormat,
      onDismiss: clearNotesSelection,
      onKeepKeyboardFocus: keepNotesKeyboardFocus,
      onLinkEditorOpenChange: handleLinkEditorOpenChange,
    },
    selectionHighlightColor,
    selectionFontSize,
    selectionLineHeight,
    selectionBoldActive,
    selectionFontFamily,
    selectionText,
    linkEditorOpen,
    canAdjustFontSize,
    canAdjustLineHeight,
  );

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const changeEvent =
      Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";

    const applyKeyboardHeight = (height: number) => {
      setKeyboardHeight(height);
    };

    const subscriptions = [
      Keyboard.addListener(showEvent, (event) => {
        applyKeyboardHeight(event.endCoordinates.height);
      }),
      Keyboard.addListener(hideEvent, () => {
        applyKeyboardHeight(0);
      }),
      Keyboard.addListener(changeEvent, (event) => {
        applyKeyboardHeight(event.endCoordinates.height);
      }),
    ];

    // iOS Simulator (hardware keyboard) sometimes skips "will" events.
    if (Platform.OS === "ios") {
      subscriptions.push(
        Keyboard.addListener("keyboardDidShow", (event) => {
          applyKeyboardHeight(event.endCoordinates.height);
        }),
        Keyboard.addListener("keyboardDidHide", () => {
          applyKeyboardHeight(0);
        }),
      );
    }

    return () => {
      for (const subscription of subscriptions) {
        subscription.remove();
      }
    };
  }, []);

  const goToRelatedTaskList = useCallback(() => {
    suppressNextSearchOpen();
    const relatedListId =
      (typeof listId === "string" && listId) || detail?.listId || null;
    if (relatedListId) {
      selectView({ type: "list", id: relatedListId }, { goToTasks: false });
    }
    router.navigate("/tasks");
    if (router.canDismiss()) {
      router.dismiss();
    } else if (router.canGoBack()) {
      router.back();
    }
  }, [detail?.listId, listId, selectView, suppressNextSearchOpen]);

  const close = useCallback(() => {
    closingRef.current = true;
    void flushPendingSaves().finally(() => {
      if (openedFromSearch) {
        goToRelatedTaskList();
        return;
      }
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    });
  }, [flushPendingSaves, goToRelatedTaskList, openedFromSearch]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      void flushPendingSaves();
      if (!openedFromSearch || closingRef.current) return;
      suppressNextSearchOpen();
      const relatedListId =
        (typeof listId === "string" && listId) || detail?.listId || null;
      if (relatedListId) {
        selectView({ type: "list", id: relatedListId }, { goToTasks: false });
      }
      setTimeout(() => {
        router.navigate("/tasks");
      }, 0);
    });

    return unsubscribe;
  }, [
    detail?.listId,
    flushPendingSaves,
    listId,
    navigation,
    openedFromSearch,
    selectView,
    suppressNextSearchOpen,
  ]);

  useEffect(() => {
    if (!id) return;

    notesSaveEnabledRef.current = false;
    calendarColorTouchedRef.current = false;
    setLoading(true);
    setDetail(null);
    setSubtasksSectionOpen(false);
    setSubtasksExpanded(true);
    setSubtasks([]);
    setSubtaskInputOpen(false);
    setSubtaskName("");
    setPriorityMenuOpen(false);
    setLabelPickerOpen(false);
    setCalendarColorPickerOpen(false);
    clearNotesSelection();
    closingRef.current = false;
    setSaveStatus("idle");
    historyRef.current = createEmptyTaskDetailHistory();
    editSessionRef.current = { active: false, before: null };
    cancelPendingHistoryCommit();
    setHistoryVersion((version) => version + 1);
    if (notesTimerRef.current) {
      clearTimeout(notesTimerRef.current);
      notesTimerRef.current = null;
    }

    void fetchTaskDetail(id)
      .then((loaded) => {
        const calendarMatch = calendarTasksRef.current.find(
          (task) => task.id === id,
        );
        setDetail({
          ...loaded,
          dueTimeMinutes:
            loaded.dueTimeMinutes ?? calendarMatch?.dueTimeMinutes ?? null,
          dueDurationMinutes:
            loaded.dueDurationMinutes ??
            calendarMatch?.dueDurationMinutes ??
            null,
          dueRepeat:
            normalizeTaskRepeat(loaded.dueRepeat) ??
            normalizeTaskRepeat(calendarMatch?.dueRepeat) ??
            null,
        });
        if (
          fromCalendar === "1" &&
          loaded.id &&
          !calendarColorTouchedRef.current
        ) {
          setCalendarTaskColor(
            loaded.id,
            normalizeCalendarColor(loaded.calendarColor),
          );
        }
        setDraftName(loaded.name);
        const html = resolveTaskDetailsHtml(loaded);
        const plain =
          taskDocToPreviewText(loaded) || detailsHtmlToPlainText(html);
        setDraftNotes(plain);
        lastSavedNameRef.current = loaded.name;
        lastSavedNotesRef.current = plain;
        lastSavedHtmlRef.current = html;
        detailsHtmlRef.current = html;
        setNotesHtml(html);
        setNotesLoadSeq((seq) => seq + 1);
      })
      .finally(() => setLoading(false));

    return () => {
      notesSaveEnabledRef.current = false;
      if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      cancelPendingHistoryCommit();
    };
  }, [
    cancelPendingHistoryCommit,
    clearNotesSelection,
    fromCalendar,
    id,
    setCalendarTaskColor,
  ]);

  useEffect(() => {
    if (loading || !id) {
      notesSaveEnabledRef.current = false;
      return;
    }

    notesSaveEnabledRef.current = false;
    const timer = setTimeout(() => {
      notesSaveEnabledRef.current = true;
    }, NOTES_HYDRATION_DELAY_MS);

    return () => {
      clearTimeout(timer);
      notesSaveEnabledRef.current = false;
    };
  }, [id, loading, notesLoadSeq]);

  const loadLabels = useCallback(async () => {
    try {
      const labels = await fetchLabels();
      setAllLabels(labels);
    } catch {
      setAllLabels([]);
    }
  }, []);

  useEffect(() => {
    if (labelPickerOpen) {
      void loadLabels();
    }
  }, [labelPickerOpen, loadLabels]);

  const mediaBlocks = useMemo(() => {
    // `detailsDoc` (the canonical doc) is the source of truth when the API
    // has computed one for this task — falls back to the legacy regex
    // extraction over raw HTML otherwise (older tasks, or if the doc ever
    // fails validation).
    if (detail?.detailsDoc) {
      try {
        return extractMediaBlocksFromDoc(resolveTaskDoc(detail));
      } catch {
        // fall through to legacy extraction below
      }
    }

    return parseTaskDetails(detail?.details ?? "").filter(
      (
        block,
      ): block is Extract<ParsedDetailBlock, { type: "image" | "link" }> =>
        block.type === "image" || block.type === "link",
    );
  }, [detail]);

  const dueDateLabel = formatTaskDueDate(
    detail != null ? detail.dueDate : (dueDate ?? null),
    detail?.dueTimeMinutes,
  );
  const assignedLabelIds = useMemo(
    () => new Set((detail?.labels ?? []).map((label) => label.id)),
    [detail?.labels],
  );

  const handleSetPriority = async (priority: number | null) => {
    if (!detail) return;
    setDetail({ ...detail, priority });
    setPriorityMenuOpen(false);
    try {
      await updateTaskPriority(detail.id, priority);
      handleTaskCompleted();
    } catch {
      Alert.alert("Couldn't update priority");
    }
  };

  const handleDateCheckboxPress = () => {
    if (!detail) return;
    if (detail.completed) {
      void handleMarkIncomplete();
      return;
    }
    void handleMarkComplete();
  };

  const handleMarkComplete = async () => {
    if (!detail) return;
    try {
      await flushPendingSaves();
      await toggleTaskCompleted(detail.id, true);
      handleTaskCompleted();
      close();
    } catch {
      // ignore
    }
  };

  const handleMarkIncomplete = async () => {
    if (!detail) return;
    try {
      await toggleTaskCompleted(detail.id, false);
      setDetail({ ...detail, completed: false });
      handleTaskCompleted();
    } catch {
      Alert.alert("Couldn't update task");
    }
  };

  const handleDelete = () => {
    if (!detail) return;
    Alert.alert("Delete task", `Delete "${detail.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void removeTask(detail.id).then(() => close());
        },
      },
    ]);
  };

  const handleScheduleChange = async (
    selection: TaskScheduleSelection,
    options?: { skipUndo?: boolean },
  ) => {
    if (!detail) return;

    const isClearingSchedule =
      selection.dueDate === null &&
      selection.dueTimeMinutes === null &&
      selection.dueDurationMinutes === null &&
      !selection.dueRepeat;
    const previousSchedule =
      !options?.skipUndo && isClearingSchedule && detail.dueDate != null
        ? {
            dueDate: detail.dueDate,
            dueTimeMinutes: detail.dueTimeMinutes,
            dueDurationMinutes: detail.dueDurationMinutes,
            dueRepeat: detail.dueRepeat ?? null,
          }
        : null;

    if (previousSchedule) {
      setDetail({
        ...detail,
        dueDate: null,
        dueTimeMinutes: null,
        dueDurationMinutes: null,
        dueRepeat: null,
      });
      requestAnimationFrame(() => {
        showScheduleUndo(previousSchedule);
      });
    }

    try {
      const result = await updateTaskSchedule(detail.id, selection);
      setDetail({
        ...detail,
        dueDate: result.dueDate,
        dueTimeMinutes: result.dueTimeMinutes,
        dueDurationMinutes: result.dueDurationMinutes,
        dueRepeat: selection.dueRepeat ?? null,
        dueTimeZone: result.dueTimeZone,
      });
      patchCalendarTask(detail.id, {
        dueDate: result.dueDate,
        dueTimeMinutes: result.dueTimeMinutes,
        dueDurationMinutes: result.dueDurationMinutes,
        dueRepeat: selection.dueRepeat ?? null,
      });
      await applyTaskReminder({
        taskId: detail.id,
        taskName: detail.name,
        dueDate: result.dueDate,
        dueTimeMinutes: result.dueTimeMinutes,
        reminderEnabled: selection.reminderEnabled,
        reminderOffsetMinutes: selection.reminderOffsetMinutes,
      });
      handleTaskCompleted();
    } catch {
      if (previousSchedule) {
        setDetail({
          ...detail,
          dueDate: previousSchedule.dueDate,
          dueTimeMinutes: previousSchedule.dueTimeMinutes,
          dueDurationMinutes: previousSchedule.dueDurationMinutes,
          dueRepeat: previousSchedule.dueRepeat ?? null,
        });
        dismissScheduleUndo();
      }
      Alert.alert("Couldn't update due date");
    }
  };

  const dismissScheduleUndo = useCallback(() => {
    if (scheduleUndoTimerRef.current) {
      clearTimeout(scheduleUndoTimerRef.current);
      scheduleUndoTimerRef.current = null;
    }
    setScheduleUndoSnapshot(null);
  }, []);

  const measureSheetTop = useCallback(() => {
    sheetContainerRef.current?.measureInWindow((_x, y) => {
      setSheetTopY(y);
    });
  }, []);

  const showScheduleUndo = useCallback(
    (snapshot: TaskScheduleSelection) => {
      if (scheduleUndoTimerRef.current) {
        clearTimeout(scheduleUndoTimerRef.current);
      }
      setScheduleUndoSnapshot(snapshot);
      requestAnimationFrame(() => {
        measureSheetTop();
      });
      scheduleUndoTimerRef.current = setTimeout(() => {
        setScheduleUndoSnapshot(null);
        scheduleUndoTimerRef.current = null;
      }, SCHEDULE_UNDO_DURATION_MS);
    },
    [measureSheetTop],
  );

  const handleScheduleUndo = useCallback(async () => {
    const snapshot = scheduleUndoSnapshot;
    const taskId = taskIdRef.current;
    if (!snapshot || !taskId) return;

    dismissScheduleUndo();

    try {
      const result = await updateTaskSchedule(taskId, snapshot);
      setDetail((current) =>
        current
          ? {
              ...current,
              dueDate: result.dueDate,
              dueTimeMinutes: result.dueTimeMinutes,
              dueDurationMinutes: result.dueDurationMinutes,
              dueRepeat: snapshot.dueRepeat ?? null,
              dueTimeZone: result.dueTimeZone,
            }
          : current,
      );
      await applyTaskReminder({
        taskId,
        taskName: draftNameRef.current || "Task",
        dueDate: result.dueDate,
        dueTimeMinutes: result.dueTimeMinutes,
        reminderEnabled: snapshot.reminderEnabled,
        reminderOffsetMinutes: snapshot.reminderOffsetMinutes,
      });
      handleTaskCompleted();
    } catch {
      Alert.alert("Couldn't update due date");
    }
  }, [dismissScheduleUndo, handleTaskCompleted, scheduleUndoSnapshot]);

  useEffect(() => {
    return () => {
      if (scheduleUndoTimerRef.current) {
        clearTimeout(scheduleUndoTimerRef.current);
      }
    };
  }, []);

  const handleSelectCalendarColor = useCallback(
    async (color: string) => {
      const taskId = taskIdRef.current;
      if (!taskId) return;

      const previousColor = calendarColor;
      const nextColor = normalizeCalendarColor(color);
      calendarColorTouchedRef.current = true;
      setCalendarColorPickerOpen(false);
      setDetail((current) =>
        current ? { ...current, calendarColor: nextColor } : current,
      );
      setCalendarTaskColor(taskId, nextColor);

      try {
        await updateTaskCalendarColor(taskId, nextColor);
      } catch {
        calendarColorTouchedRef.current = false;
        setDetail((current) =>
          current ? { ...current, calendarColor: previousColor } : current,
        );
        setCalendarTaskColor(taskId, previousColor);
        Alert.alert("Couldn't update calendar color");
      }
    },
    [calendarColor, setCalendarTaskColor],
  );

  const loadSubtasks = useCallback(
    async (options?: { openIfActive?: boolean }) => {
      if (!detail) return [];
      setSubtasksLoading(true);
      try {
        const data = await fetchTasks(
          { type: "list", id: detail.listId },
          { force: true },
        );
        const items = [...data.pinned, ...data.tasks].filter(
          (task) => task.parentId === detail.id && !task.completed,
        );
        setSubtasks(items);
        if (options?.openIfActive && items.some((task) => !task.completed)) {
          setSubtasksSectionOpen(true);
          setSubtasksExpanded(true);
          setSubtaskInputOpen(false);
        }
        return items;
      } catch {
        setSubtasks([]);
        return [];
      } finally {
        setSubtasksLoading(false);
      }
    },
    [detail],
  );

  useEffect(() => {
    if (!detail || loading) return;
    void loadSubtasks({ openIfActive: true });
  }, [detail?.id, detail?.listId, loading, loadSubtasks]);

  const openSubtasksSection = useCallback(() => {
    setSubtasksSectionOpen(true);
    setSubtasksExpanded(true);
    setSubtaskInputOpen(true);
    setSubtaskName("");
    void loadSubtasks();
  }, [loadSubtasks]);

  const openNewSubtaskInput = useCallback(() => {
    setSubtasksSectionOpen(true);
    setSubtasksExpanded(true);
    setSubtaskInputOpen(true);
    setSubtaskName("");
  }, []);

  useEffect(() => {
    if (!subtaskInputOpen || !subtasksSectionOpen || !subtasksExpanded) {
      return;
    }

    const timer = setTimeout(() => {
      subtaskInputRef.current?.focus();
    }, 80);
    return () => clearTimeout(timer);
  }, [subtaskInputOpen, subtasksExpanded, subtasksSectionOpen]);

  const handleAddSubtask = async () => {
    if (!detail || addingSubtaskRef.current) return;
    const trimmed = subtaskName.trim();
    if (!trimmed) return;

    addingSubtaskRef.current = true;
    try {
      const created = await createSubtask(detail.id, trimmed);
      setSubtaskName("");
      setSubtasks((current) =>
        current.some((item) => item.id === created.id)
          ? current
          : [...current, created],
      );
      handleTaskCompleted();
      await loadSubtasks();
      subtaskInputRef.current?.focus();
    } catch {
      Alert.alert("Couldn't add subtask");
    } finally {
      addingSubtaskRef.current = false;
    }
  };

  const handleToggleSubtaskComplete = async (
    subtask: TaskItem,
    completed: boolean,
  ) => {
    try {
      await toggleTaskCompleted(subtask.id, completed);
      setSubtasks((current) =>
        completed
          ? current.filter((item) => item.id !== subtask.id)
          : current.map((item) =>
              item.id === subtask.id ? { ...item, completed } : item,
            ),
      );
      handleTaskCompleted();
    } catch {
      Alert.alert("Couldn't update subtask");
    }
  };

  const handleToggleLabel = async (labelId: string, assigned: boolean) => {
    if (!detail) return;
    try {
      const labels = await toggleTaskLabel(detail.id, labelId, assigned);
      setDetail({ ...detail, labels });
      handleTaskCompleted();
    } catch {
      // ignore
    }
  };

  function openDetailMenu() {
    setPriorityMenuOpen(false);
    Alert.alert("Task options", undefined, [
      {
        text: "Add subtask",
        onPress: openSubtasksSection,
      },
      {
        text: expandedFullscreen ? "Exit full screen" : "Full screen",
        onPress: () => setExpandedFullscreen((current) => !current),
      },
      detail?.completed
        ? {
            text: "Mark incomplete",
            onPress: () => {
              void handleMarkIncomplete();
            },
          }
        : {
            text: "Mark complete",
            onPress: () => {
              void handleMarkComplete();
            },
          },
      {
        text: "Delete",
        style: "destructive",
        onPress: handleDelete,
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function handleVoiceNote() {
    Alert.alert(
      "Voice note",
      "Voice note recording is not available in the mobile app yet.",
    );
  }

  function handleAttachment() {
    Alert.alert(
      "Attachment",
      "File attachments are not available in the mobile app yet.",
    );
  }

  const resolvedListName = detail?.listName ?? listName ?? "Tasks";
  const resolvedListId =
    detail?.listId ?? (typeof listId === "string" && listId ? listId : null);

  useLayoutEffect(() => {
    navigation.setOptions({
      sheetAllowedDetents: expandedFullscreen
        ? [1]
        : openedFromCalendar
          ? [TASK_SHEET_MIN_HEIGHT_FRACTION, 1]
          : "fitToContents",
      sheetExpandsWhenScrolledToEdge: !expandedFullscreen,
      contentStyle: {
        backgroundColor: "#ffffff",
      },
    });
  }, [expandedFullscreen, navigation, openedFromCalendar]);

  const openListPicker = useCallback(async () => {
    if (!sidebarData?.lists.length) {
      await loadSidebar();
    }
    setListPickerOpen(true);
  }, [loadSidebar, sidebarData?.lists.length]);

  const handleMoveToList = useCallback(
    async (list: SidebarListItem) => {
      const taskId = taskIdRef.current;
      if (!taskId || list.id === resolvedListId) {
        setListPickerOpen(false);
        return;
      }

      try {
        const result = await moveTaskToList(taskId, list.id);
        setDetail((current) =>
          current
            ? {
                ...current,
                listId: result.listId,
                listName: result.listName,
              }
            : current,
        );
        handleTaskCompleted();
        setListPickerOpen(false);
      } catch {
        setSaveStatus("error");
      }
    },
    [handleTaskCompleted, resolvedListId],
  );

  const saveStatusLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Couldn't save"
          : null;

  const currentSnapshot = getSnapshot();
  const canUndo =
    historyRef.current.past.length > 0 ||
    (editSessionRef.current.active &&
      editSessionRef.current.before !== null &&
      !snapshotsEqual(currentSnapshot, editSessionRef.current.before));
  const canRedo = historyRef.current.future.length > 0;
  void historyVersion;

  // Anchor undo/redo 7px above the Mark complete pill (same horizontal stack).
  const historyActionsBottomOffset =
    (keyboardHeight > 0 ? keyboardHeight : 0) +
    MARK_COMPLETE_BOTTOM_OFFSET +
    MARK_COMPLETE_BUTTON_HEIGHT +
    HISTORY_ACTIONS_ABOVE_MARK_COMPLETE;

  useHistoryActionsRegistration(
    !loading && !datePickerOpen,
    historyActionsBottomOffset,
    canUndo,
    canRedo,
    undoEdit,
    redoEdit,
    keepNotesKeyboardFocus,
  );

  useEffect(() => {
    if (datePickerOpen) {
      setCalendarColorPickerOpen(false);
      dismissScheduleUndo();
    }
  }, [datePickerOpen, dismissScheduleUndo]);

  useEffect(() => {
    if (!scheduleUndoSnapshot) return;
    measureSheetTop();
  }, [
    expandedFullscreen,
    keyboardHeight,
    measureSheetTop,
    scheduleUndoSnapshot,
  ]);

  useEffect(() => {
    if (datePickerOpen || !scheduleUndoSnapshot) return;
    measureSheetTop();
    const timeoutId = setTimeout(measureSheetTop, 120);
    return () => clearTimeout(timeoutId);
  }, [datePickerOpen, measureSheetTop, scheduleUndoSnapshot]);

  const sheetMinHeight = windowHeight * TASK_SHEET_MIN_HEIGHT_FRACTION;
  const sheetMaxScrollHeight = windowHeight * TASK_SHEET_MAX_HEIGHT_FRACTION;
  const subtasksKeyboardLayoutActive =
    keyboardHeight > 0 && subtasksSectionOpen && subtasksExpanded;
  const toolbarPinnedToKeyboard = expandedFullscreen && keyboardHeight > 0;
  const toolbarSafeAreaStyle = toolbarPinnedToKeyboard
    ? { paddingBottom: 0 }
    : keyboardHeight > 0
      ? { paddingBottom: Spacing.two }
      : expandedFullscreen
        ? { paddingBottom: Math.max(insets.bottom, Spacing.two) }
        : insets.bottom > 0
          ? {
              marginBottom: -(insets.bottom + TOOLBAR_BOTTOM_SHIFT),
              paddingBottom: toolbarFooterInset,
            }
          : { paddingBottom: Spacing.two };
  const toolbarTotalHeight =
    TASK_DETAIL_TOOLBAR_BODY_HEIGHT +
    toolbarFooterInset +
    (saveStatusLabel ? 22 : 0);
  const showDetailToolbar =
    !subtasksKeyboardLayoutActive || toolbarPinnedToKeyboard;
  const layoutToolbarHeight =
    subtasksKeyboardLayoutActive && !toolbarPinnedToKeyboard
      ? 0
      : toolbarTotalHeight;
  const expandedContainerHeight = Math.max(
    sheetMinHeight,
    windowHeight - insets.top,
  );
  const expandedScrollHeight = Math.max(
    240,
    expandedContainerHeight - toolbarTotalHeight - TASK_DETAIL_HANDLE_HEIGHT,
  );
  const maxScrollHeight = Math.max(
    160,
    sheetMaxScrollHeight - layoutToolbarHeight - TASK_DETAIL_HANDLE_HEIGHT,
  );
  const subtasksKeyboardVerticalOffset =
    Platform.OS === "ios" ? (sheetTopY ?? insets.top) : 0;

  useEffect(() => {
    if (!subtasksKeyboardLayoutActive) return;

    measureSheetTop();
    const timer = setTimeout(
      () => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      },
      Platform.OS === "ios" ? 80 : 120,
    );
    return () => clearTimeout(timer);
  }, [
    subtasksKeyboardLayoutActive,
    keyboardHeight,
    subtaskInputOpen,
    measureSheetTop,
  ]);

  const expandedNotesHeight = Math.max(280, expandedScrollHeight - 170);
  const expandedTaskBodyHeight = expandedNotesHeight + 72;

  const scheduleUndoTop =
    sheetTopY != null
      ? sheetTopY - SCHEDULE_UNDO_BUTTON_HEIGHT - SCHEDULE_UNDO_ABOVE_GAP
      : windowHeight -
        sheetMaxScrollHeight -
        SCHEDULE_UNDO_BUTTON_HEIGHT -
        SCHEDULE_UNDO_ABOVE_GAP;

  const scheduleUndoOverlay = scheduleUndoSnapshot ? (
    Platform.OS === "web" ? (
      <View className="absolute inset-0 z-[100]" pointerEvents="box-none">
        <Pressable
          className="absolute h-9 flex-row items-center gap-1.5 rounded-full bg-gray-100 px-3.5 shadow-sm"
          style={{
            top: scheduleUndoTop,
            right: SCHEDULE_UNDO_RIGHT_INSET,
            elevation: 4,
          }}
          onPress={() => void handleScheduleUndo()}
          accessibilityRole="button"
          accessibilityLabel="Undo clear date and time"
        >
          <AppSymbol
            ios="arrow.uturn.backward"
            android="undo"
            size={14}
            tintColor="#374151"
          />
          <ThemedText className="text-sm font-semibold text-gray-700">
            Undo
          </ThemedText>
        </Pressable>
      </View>
    ) : (
      <FullWindowOverlay>
        <View className="absolute inset-0 z-[100]" pointerEvents="box-none">
          <Pressable
            className="absolute h-9 flex-row items-center gap-1.5 rounded-full bg-gray-100 px-3.5 shadow-sm"
            style={{
              top: scheduleUndoTop,
              right: SCHEDULE_UNDO_RIGHT_INSET,
              elevation: 4,
            }}
            onPress={() => void handleScheduleUndo()}
            accessibilityRole="button"
            accessibilityLabel="Undo clear date and time"
          >
            <AppSymbol
              ios="arrow.uturn.backward"
              android="undo"
              size={14}
              tintColor="#374151"
            />
            <ThemedText className="text-sm font-semibold text-gray-700">
              Undo
            </ThemedText>
          </Pressable>
        </View>
      </FullWindowOverlay>
    )
  ) : null;

  const subtasksSectionEdgeStyle = {
    marginLeft: -Spacing.three,
    marginRight: -(Spacing.three - 2),
  };

  const subtasksSectionOuterStyle = {
    ...subtasksSectionEdgeStyle,
    overflow: "visible" as const,
  };

  const subtasksSectionCardStyle = Platform.select({
    ios: {
      backgroundColor: "#f6f6f9",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2.5 },
      shadowOpacity: 0.09,
      shadowRadius: 7,
    },
    android: {
      backgroundColor: "#f6f6f9",
      elevation: 2,
    },
    default: {
      backgroundColor: "#f6f6f9",
      boxShadow: "0px 3px 11px rgba(0, 0, 0, 0.1)",
    },
  });

  const renderSubtasksMarkCompleteButton = (options?: {
    offsetLeft?: number;
  }) =>
    !loading && detail ? (
      <Pressable
        onPress={handleDateCheckboxPress}
        accessibilityRole="button"
        accessibilityLabel={
          detail.completed ? "Mark task incomplete" : "Mark task complete"
        }
        className="absolute z-20 h-9 w-9 items-center justify-center rounded-full border border-[#e3e3e3] bg-[#f7f7f7] active:opacity-85"
        style={{
          top: -44,
          right: 10 + (options?.offsetLeft ?? 0),
        }}
      >
        <AppSymbol
          ios="checkmark"
          android="check"
          size={16}
          tintColor="#6b7280"
        />
      </Pressable>
    ) : null;

  const renderSubtasksHeader = (options?: {
    plusOffsetLeft?: number;
    labelOffsetRight?: number;
    collapsed?: boolean;
  }) => (
    <View
      className={`flex-row items-center justify-between ${
        options?.collapsed ? "min-h-[27px] py-0" : "py-1"
      }`}
    >
      <Pressable
        className={`min-w-0 flex-1 flex-row items-center gap-1.5 ${
          options?.collapsed ? "min-h-[27px]" : "pb-1"
        }`}
        onPress={() => setSubtasksExpanded((expanded) => !expanded)}
        accessibilityRole="button"
        accessibilityState={{ expanded: subtasksExpanded }}
        accessibilityLabel="Sub-tasks"
        style={
          options?.labelOffsetRight
            ? { marginLeft: options.labelOffsetRight }
            : undefined
        }
      >
        <Text
          className="text-[13px] font-medium text-[#545657]"
          style={{ lineHeight: options?.collapsed ? 15 : 16 }}
          {...(options?.collapsed && Platform.OS === "android"
            ? { includeFontPadding: false }
            : null)}
        >
          sub-tasks
        </Text>
        <View
          className={`items-center justify-center ${
            subtasksExpanded ? "rotate-90" : "rotate-0"
          } ml-4`}
        >
          <AppSymbol
            ios="chevron.right"
            android="chevron-right"
            size={15}
            tintColor="#9ca3af"
          />
        </View>
      </Pressable>
      <Pressable
        className="h-6 w-6 -mr-[9px] items-center justify-center active:opacity-55"
        accessibilityRole="button"
        accessibilityLabel="Add subtask"
        hitSlop={8}
        onPress={openNewSubtaskInput}
        style={
          options?.plusOffsetLeft
            ? { marginRight: options.plusOffsetLeft }
            : undefined
        }
      >
        <LuPlusIcon size={25} color="#8c929e" strokeWidth={1.5} />
      </Pressable>
    </View>
  );

  const renderSubtasksList = () => (
    <View className="mt-0.5 gap-2">
      {subtasksLoading ? (
        <ActivityIndicator
          size="small"
          color="#4873c7"
          className="mb-1 self-start"
        />
      ) : null}
      {subtasks.map((subtask) => (
        <View
          key={subtask.id}
          className="min-h-[33px] flex-row items-center gap-2.5"
        >
          <TaskCheckbox
            checked={false}
            uncheckedBackgroundColor="#F6F6F9"
            accessibilityLabel={`Mark ${subtask.name} complete`}
            onPress={() => void handleToggleSubtaskComplete(subtask, true)}
          />
          <Pressable
            className="min-w-0 flex-1 justify-center active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel={`Open subtask ${subtask.name}`}
            onPress={() =>
              openTask({
                ...subtask,
                listName: subtask.listName ?? detail?.listName ?? "",
              })
            }
          >
            <ThemedText
              style={{
                fontSize: 14,
                lineHeight: 16,
                fontWeight: "400",
                color: "#505050",
              }}
              numberOfLines={2}
            >
              {subtask.name}
            </ThemedText>
          </Pressable>
        </View>
      ))}
      {subtaskInputOpen ? (
        <View className="min-h-[34px] flex-row items-center gap-2.5">
          <View className="h-[22px] w-[22px] rounded-xl border-[1.5px] border-[#dad4d5] bg-[#F6F6F9]" />
          <TextInput
            ref={subtaskInputRef}
            value={subtaskName}
            onChangeText={setSubtaskName}
            autoFocus
            className="flex-1 py-1 text-base leading-[22px] text-gray-900"
            returnKeyType="done"
            blurOnSubmit={false}
            onSubmitEditing={() => void handleAddSubtask()}
            onBlur={() => {
              const trimmed = subtaskName.trim();
              if (!trimmed) {
                setSubtaskInputOpen(false);
                return;
              }
              void handleAddSubtask();
            }}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <>
      <KeyboardAvoidingView
        className="relative bg-white"
        style={[
          { minHeight: sheetMinHeight },
          expandedFullscreen && { minHeight: expandedContainerHeight },
        ]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled={!toolbarPinnedToKeyboard}
        keyboardVerticalOffset={
          subtasksKeyboardLayoutActive && !toolbarPinnedToKeyboard
            ? subtasksKeyboardVerticalOffset
            : 0
        }
      >
        <View
          ref={sheetContainerRef}
          onLayout={measureSheetTop}
          className="flex-1"
          collapsable={false}
        >
          {calendarColorPickerOpen ? (
            <Pressable
              className="absolute inset-0 z-30"
              onPress={() => setCalendarColorPickerOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss color picker"
            />
          ) : null}
          <View className="items-center pb-1 pt-2">
            <View className="h-[5px] w-11 rounded-[3px] bg-gray-300" />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More options"
            hitSlop={8}
            onPress={openDetailMenu}
            className="absolute right-2.5 top-2.5 z-20 h-[36px] w-[36px] items-center justify-center rounded-full bg-gray-100"
          >
            <AppSymbol
              ios="ellipsis"
              android="more-horiz"
              size={16}
              weight="semibold"
              tintColor="#7a8494"
            />
          </Pressable>

          <ScrollView
            ref={scrollViewRef}
            style={
              expandedFullscreen
                ? { flex: 1 }
                : { flex: 1, maxHeight: maxScrollHeight }
            }
            contentContainerStyle={
              expandedFullscreen
                ? {
                    minHeight: expandedScrollHeight,
                    flexGrow: 1,
                    paddingLeft: Spacing.three,
                    paddingRight: Spacing.three - 2,
                    paddingBottom: toolbarPinnedToKeyboard
                      ? toolbarTotalHeight + Spacing.two
                      : subtasksKeyboardLayoutActive
                        ? Spacing.three
                        : Spacing.two,
                  }
                : {
                    paddingLeft: Spacing.three,
                    paddingRight: Spacing.three - 2,
                    paddingBottom: toolbarPinnedToKeyboard
                      ? toolbarTotalHeight + Spacing.two
                      : subtasksKeyboardLayoutActive
                        ? Spacing.three
                        : Spacing.two,
                  }
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            bounces
            scrollEnabled={!priorityMenuOpen}
            pointerEvents={priorityMenuOpen ? "none" : "auto"}
          >
            <View className="-mt-[2px] flex-row items-center gap-2 pb-1 pr-10 pt-1">
              <Pressable
                className="min-w-0 flex-1 flex-row items-center gap-1"
                onPress={() => void openListPicker()}
              >
                <ThemedText
                  className="shrink text-base font-semibold"
                  style={{ color: "#797987" }}
                >
                  {resolvedListName}
                </ThemedText>
                <AppSymbol
                  ios="chevron.down"
                  android="keyboard-arrow-down"
                  size={14}
                  tintColor="#797987"
                />
              </Pressable>
            </View>

            <View className="flex-row items-center gap-2 pb-2">
              <Pressable
                className="mr-2 -ml-1 shrink-0 flex-row items-center gap-1 py-1"
                onPress={() => setDatePickerOpen(true)}
              >
                <IoMdTimeIcon size={18} color="#a6a6a6" />
                <ThemedText
                  className={`${dueDateLabel ? "font-normal" : ""} ml-px`.trim()}
                  style={{
                    color: "#a6a6a6",
                    fontSize: dueDateLabel ? 15.5 : 14.5,
                  }}
                >
                  {dueDateLabel ?? "Date & Reminder"}
                </ThemedText>
              </Pressable>
              {!loading && (detail?.labels ?? []).length > 0 ? (
                <ScrollView
                  horizontal
                  className="ml-[3px] min-w-0 flex-1"
                  contentContainerStyle={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: Spacing.one,
                    paddingRight: Spacing.one,
                  }}
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {(detail?.labels ?? []).map((label) => (
                    <Pressable
                      key={label.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Label ${label.label}, edit labels`}
                      onPress={() => setLabelPickerOpen(true)}
                      className="shrink-0 rounded-full px-2.5 active:opacity-85"
                      style={({ pressed }) => ({
                        backgroundColor: getLabelDotColor(label),
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <ThemedText
                        className="font-semibold leading-[13px]"
                        style={{ color: "#ffffff", fontSize: 10 }}
                      >
                        {label.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </View>

            {loading ? (
              <ActivityIndicator className="mt-6" color="#3c87f7" />
            ) : (
              <>
                <View
                  className="w-full"
                  style={
                    expandedFullscreen
                      ? {
                          minHeight: expandedTaskBodyHeight,
                          flexGrow: 1,
                        }
                      : undefined
                  }
                >
                  <View className="relative -mt-[3px] mb-[7px] flex-row items-start gap-2 pt-px">
                    <TextInput
                      value={draftName}
                      onChangeText={(value) => {
                        beginEditSession();
                        setDraftName(value);
                        scheduleNameSave(value);
                      }}
                      onFocus={() => {
                        dismissLinkEditor();
                        setNotesFocused(false);
                      }}
                      onBlur={() => {
                        commitEditToHistory();
                        void saveNameNow(draftNameRef.current);
                      }}
                      placeholder="Task name"
                      placeholderTextColor="#9ca3af"
                      className="min-w-0 flex-1 p-0 text-[27px] font-bold leading-9"
                      style={{ color: "#454545" }}
                      multiline
                      blurOnSubmit
                      returnKeyType="done"
                    />
                    {!(subtasksSectionOpen && subtasksExpanded) ? (
                      <View className="ml-[6px] mt-[8px] shrink-0 items-end gap-1.5 self-start">
                        <Pressable
                          className="active:opacity-70"
                          accessibilityRole="button"
                          accessibilityLabel="Link subtasks"
                          onPress={() => void openSubtasksSection()}
                        >
                          <ThemedText
                            style={{
                              color: "#bbbbcc",
                              fontSize: SUBTASKS_LINK_FONT_SIZE,
                            }}
                          >
                            + subtask
                          </ThemedText>
                        </Pressable>
                      </View>
                    ) : null}
                    {openedFromCalendar ? (
                      <CalendarColorControl
                        color={calendarColor}
                        pickerOpen={calendarColorPickerOpen}
                        onTogglePicker={() => {
                          setCalendarColorPickerOpen((open) => {
                            if (!open) {
                              Keyboard.dismiss();
                            }
                            return !open;
                          });
                        }}
                        onSelectColor={(color) => {
                          void handleSelectCalendarColor(color);
                        }}
                        onClosePicker={() => setCalendarColorPickerOpen(false)}
                        onKeepKeyboardFocus={() => {
                          if (notesFocused) {
                            keepNotesKeyboardFocus();
                          }
                        }}
                      />
                    ) : null}
                  </View>

                  {!loading ? (
                    <FormattedNotesInput
                      inputRef={notesInputRef}
                      remountKey={`${id ?? "task-notes"}-${notesLoadSeq}`}
                      defaultHtml={notesHtml}
                      value={draftNotes}
                      displayHtml={notesHtml}
                      selection={notesSelection}
                      onChangeHtml={(html) => {
                        if (suppressNativeHtmlChangeRef.current) return;
                        if (!notesSaveEnabledRef.current) return;
                        // While caret typing-bold is active, HTML is merged in onChangeText
                        // so newly typed characters pick up <b> without touching existing text.
                        if (caretTypingBoldRef.current) return;

                        const sanitized = sanitizeTaskDetailsHtml(html);
                        const savedHtml = detailsHtmlRef.current;
                        const savedPlain = detailsHtmlToPlainText(savedHtml);
                        const nextPlain = detailsHtmlToPlainText(sanitized);
                        if (savedPlain === nextPlain) {
                          if (
                            htmlNeedsFormattingMirror(savedHtml) &&
                            !htmlNeedsFormattingMirror(sanitized)
                          ) {
                            return;
                          }
                          if (
                            htmlHasInlineFormatting(savedHtml) &&
                            !htmlHasInlineFormatting(sanitized)
                          ) {
                            return;
                          }
                        }
                        if (
                          !shouldPersistTaskDetails(sanitized, savedHtml) &&
                          sanitized !== savedHtml
                        ) {
                          return;
                        }

                        beginEditSession();
                        detailsHtmlRef.current = sanitized;
                        setNotesHtml(sanitized);
                        scheduleNotesSave(draftNotesRef.current, sanitized);
                      }}
                      onChangeText={(value) => {
                        if (!notesSaveEnabledRef.current) return;

                        beginEditSession();
                        const previousPlain = draftNotesRef.current;
                        draftNotesRef.current = value;
                        setDraftNotes(value);

                        const nextHtml = mergePlainTextEditIntoHtml(
                          detailsHtmlRef.current,
                          previousPlain,
                          value,
                          caretTypingBoldRef.current
                            ? { bold: true }
                            : undefined,
                        );
                        detailsHtmlRef.current = nextHtml;
                        setNotesHtml(nextHtml);
                        scheduleNotesSave(value, nextHtml);
                      }}
                      onSelectionChange={(event) => {
                        const selection = event.nativeEvent.selection;
                        notesSelectionRef.current = selection;
                        setNotesSelection(selection);
                        if (
                          selection.end <= selection.start &&
                          linkEditorOpenRef.current
                        ) {
                          dismissLinkEditor();
                        }
                        if (selection.end > selection.start) {
                          lastNotesSelectionRef.current = selection;
                        } else if (
                          selection.start !== lastCaretIndexRef.current
                        ) {
                          const docBold = getSelectionBoldActive(
                            detailsHtmlRef.current,
                            selection,
                          );
                          caretTypingBoldRef.current = docBold;
                          setCaretTypingBold(docBold);
                          lastCaretIndexRef.current = selection.start;
                        }
                      }}
                      onFocus={() => {
                        if (linkEditorOpenRef.current) {
                          dismissLinkEditor();
                        }
                        setExpandedFullscreen(true);
                        setNotesFocused(true);
                        lastCaretIndexRef.current =
                          notesSelectionRef.current.start;
                      }}
                      onBlur={() => {
                        if (linkEditorOpenRef.current) return;
                        setNotesFocused(false);
                        setCaretTypingBold(false);
                        caretTypingBoldRef.current = false;
                        commitEditToHistory();
                        void saveNotesNow(
                          draftNotesRef.current,
                          detailsHtmlRef.current,
                        );
                      }}
                      placeholder="Add notes"
                      placeholderTextColor="#9ca3af"
                      style={{
                        padding: 0,
                        fontSize: 17,
                        lineHeight: 26,
                        color: "#374151",
                      }}
                      notesMinHeight={
                        expandedFullscreen ? expandedNotesHeight : undefined
                      }
                      notesMaxHeight={
                        expandedFullscreen ? expandedNotesHeight : undefined
                      }
                      selectionColor="#2563eb"
                      cursorColor="#2563eb"
                    />
                  ) : null}
                </View>

                {subtasksSectionOpen && subtasksExpanded ? (
                  <View
                    className="relative mt-[18px] mb-2 px-1"
                    style={subtasksSectionOuterStyle}
                  >
                    {renderSubtasksMarkCompleteButton()}
                    <View
                      className="rounded-t-[19px] rounded-b-[19px] px-5 py-2 -mb-[16px] border border-[#e8e8ed]"
                      style={subtasksSectionCardStyle}
                    >
                      {renderSubtasksHeader()}
                      {renderSubtasksList()}
                    </View>
                  </View>
                ) : null}

                {mediaBlocks.map((block, index) => {
                  if (block.type === "image") {
                    return (
                      <Image
                        key={`image-${index}`}
                        source={{ uri: block.uri }}
                        style={{
                          width: "100%",
                          height: 240,
                          borderRadius: 18,
                          marginBottom: Spacing.three,
                          backgroundColor: "#f3f4f6",
                        }}
                        contentFit="cover"
                      />
                    );
                  }

                  return (
                    <Pressable
                      key={`link-${index}`}
                      className="mb-4 flex-row items-center gap-1.5"
                      onPress={() =>
                        void WebBrowser.openBrowserAsync(block.href)
                      }
                    >
                      <ThemedText className="shrink text-base leading-6 text-blue-600">
                        {block.text}
                      </ThemedText>
                      <AppSymbol
                        ios="link"
                        android="link"
                        size={14}
                        tintColor="#2563eb"
                      />
                    </Pressable>
                  );
                })}
              </>
            )}
          </ScrollView>

          {subtasksSectionOpen && !subtasksExpanded ? (
            <View
              className="relative shrink-0 mb-1 px-1"
              style={subtasksSectionOuterStyle}
            >
              {renderSubtasksMarkCompleteButton({ offsetLeft: 12 })}
              <View
                className="rounded-t-[19px] rounded-b-[19px] px-5 py-2"
                style={subtasksSectionCardStyle}
              >
                {renderSubtasksHeader({
                  plusOffsetLeft: 10,
                  labelOffsetRight: 14,
                  collapsed: true,
                })}
              </View>
            </View>
          ) : null}

          {!loading && detail && !subtasksSectionOpen ? (
            <Pressable
              onPress={handleDateCheckboxPress}
              accessibilityRole="button"
              accessibilityLabel={
                detail.completed ? "Mark task incomplete" : "Mark task complete"
              }
              className="absolute z-20 flex-row items-center gap-[5px] rounded-full border border-[#e3e3e3] bg-[#f7f7f7] px-3.5 py-[5px] active:opacity-85"
              style={{
                right: 10,
                bottom: MARK_COMPLETE_BOTTOM_OFFSET,
              }}
            >
              <AppSymbol
                ios="checkmark"
                android="check"
                size={12}
                tintColor="#6b7280"
              />
              <ThemedText
                style={{
                  color: "#6b7280",
                  fontSize: 11,
                  fontWeight: "500",
                }}
              >
                {detail.completed ? "Mark incomplete" : "Mark complete"}
              </ThemedText>
            </Pressable>
          ) : null}

          {showDetailToolbar ? (
            <View
              className="shrink-0 border-t border-gray-200 bg-white pt-2"
              style={[
                toolbarSafeAreaStyle,
                toolbarPinnedToKeyboard
                  ? {
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: keyboardHeight,
                      zIndex: 25,
                    }
                  : null,
              ]}
            >
              {saveStatusLabel ? (
                <ThemedText
                  className={`px-4 pb-1 text-xs text-gray-500 ${
                    saveStatus === "error" ? "text-red-600" : ""
                  }`}
                >
                  {saveStatusLabel}
                </ThemedText>
              ) : null}
              <View
                className="relative justify-end pl-4"
                style={{
                  minHeight: TASK_DETAIL_TOOLBAR_BODY_HEIGHT - Spacing.two,
                }}
              >
                <View className="min-w-0 flex-row items-start gap-8 pr-11">
                  <DetailToolbarLabeledItem
                    accessibilityLabel="Date"
                    label="Date"
                    onPress={() => setDatePickerOpen(true)}
                  >
                    <IoMdTimeIcon size={28} color={TOOLBAR_ICON_COLOR} />
                  </DetailToolbarLabeledItem>
                  <View className="relative z-[31] justify-center">
                    <DetailToolbarLabeledItem
                      accessibilityLabel="Priority"
                      label="Priority"
                      labelColor={
                        detail?.priority != null
                          ? getTaskPriorityColor(detail.priority)
                          : undefined
                      }
                      onPress={() => setPriorityMenuOpen((open) => !open)}
                    >
                      <PriorityFlagToolbarIcon
                        size={TOOLBAR_LABELED_ICON_SIZE}
                        priority={null}
                        defaultColor={TOOLBAR_ICON_COLOR}
                      />
                    </DetailToolbarLabeledItem>
                    {priorityMenuOpen ? (
                      <TaskPriorityFlagPopup
                        embedded
                        selected={detail?.priority ?? null}
                        onSelect={(priority) =>
                          void handleSetPriority(priority)
                        }
                        onClose={() => setPriorityMenuOpen(false)}
                        style={{
                          position: "absolute",
                          bottom: 40,
                          left: -24,
                          zIndex: 32,
                          elevation: 32,
                        }}
                      />
                    ) : null}
                  </View>
                  <DetailToolbarLabeledItem
                    accessibilityLabel="Labels"
                    label="label"
                    onPress={() => setLabelPickerOpen(true)}
                  >
                    <AppSymbol
                      ios="tag"
                      android="local-offer"
                      size={TOOLBAR_LABELED_ICON_SIZE}
                      tintColor={TOOLBAR_ICON_COLOR}
                    />
                  </DetailToolbarLabeledItem>
                  <DetailToolbarLabeledItem
                    accessibilityLabel="Files"
                    label="Files"
                    onPress={handleAttachment}
                  >
                    <RiAttachment2Icon
                      size={TOOLBAR_UTILITY_ICON_SIZE}
                      color={TOOLBAR_ICON_COLOR}
                    />
                  </DetailToolbarLabeledItem>
                </View>
                <View className="absolute top-0 right-[5px]">
                  <DetailToolbarLabeledItem
                    accessibilityLabel="Voice note"
                    label="Voice"
                    showLabel={false}
                    onPress={handleVoiceNote}
                  >
                    <AppSymbol
                      ios="mic"
                      android="mic"
                      size={TOOLBAR_UTILITY_ICON_SIZE}
                      tintColor={TOOLBAR_ICON_COLOR}
                    />
                  </DetailToolbarLabeledItem>
                </View>
              </View>
            </View>
          ) : null}
          {priorityMenuOpen ? (
            <Pressable
              className="absolute inset-0 z-30"
              onPress={() => setPriorityMenuOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss priority menu"
            />
          ) : null}
          <TaskDatePickerSheet
            visible={datePickerOpen}
            value={pickerSchedule.dueDate}
            dueTimeMinutes={pickerSchedule.dueTimeMinutes}
            dueDurationMinutes={pickerSchedule.dueDurationMinutes}
            dueRepeat={pickerSchedule.dueRepeat}
            onSelect={(selection) => void handleScheduleChange(selection)}
            onClose={() => setDatePickerOpen(false)}
          />

          <TaskListPicker
            visible={listPickerOpen}
            lists={sidebarData?.lists ?? []}
            currentListId={resolvedListId}
            onSelectList={(list) => void handleMoveToList(list)}
            onClose={() => setListPickerOpen(false)}
          />
        </View>
      </KeyboardAvoidingView>
      {scheduleUndoOverlay}
      {labelPickerOpen ? (
        <TaskLabelPicker
          labels={allLabels}
          assignedLabelIds={assignedLabelIds}
          onToggleLabel={(labelId, assigned) =>
            void handleToggleLabel(labelId, assigned)
          }
          onClose={() => setLabelPickerOpen(false)}
          fullScreen
          sheetHeightRatio={0.475}
        />
      ) : null}
    </>
  );
}

const TOOLBAR_ICON_COLOR = "#9f9f9f";
const TOOLBAR_LABELED_ICON_SIZE = 25.5;
const TOOLBAR_UTILITY_ICON_SIZE = 25.5;
const TOOLBAR_LABEL_FONT_SIZE = 8;
const TOOLBAR_LABEL_LINE_HEIGHT = 13;

function DetailToolbarLabeledItem({
  accessibilityLabel,
  label,
  labelColor,
  onPress,
  children,
  showLabel = true,
}: {
  accessibilityLabel: string;
  label: string;
  labelColor?: string;
  onPress: () => void;
  children: ReactNode;
  showLabel?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      onPress={onPress}
      className="min-w-[34px] items-center active:opacity-55"
    >
      <View className="h-[26px] w-[26px] items-center justify-center">
        {children}
      </View>
      {showLabel && label.length > 0 ? (
        <ThemedText
          className="mt-1 text-center"
          style={{
            color: labelColor ?? TOOLBAR_ICON_COLOR,
            fontSize: TOOLBAR_LABEL_FONT_SIZE,
            lineHeight: TOOLBAR_LABEL_LINE_HEIGHT,
          }}
        >
          {label}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}
