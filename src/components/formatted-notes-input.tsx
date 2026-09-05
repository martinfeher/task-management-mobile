import { useCallback, useImperativeHandle, useMemo, useRef, useState, type RefObject } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputProps,
  type TextInputSelectionChangeEventData,
  type TextStyle,
} from "react-native";
import type { EnrichedTextInputInstance } from "react-native-enriched";

import {
  htmlHasInlineFormatting,
  htmlHasMetricSpanFormatting,
  htmlToTextRuns,
  runToMirrorTextStyle,
  splitMirrorRunsForSelection,
  type TextRun,
  type TextSelectionRange,
} from "@/lib/html-to-text-runs";
import { isEnrichedNotesInputAvailable } from "@/lib/enriched-notes-support";
import {
  enrichedHtmlToTaskDetailsHtml,
  taskDetailsHtmlToEnrichedHtml,
} from "@/lib/enriched-task-html";
import {
  canonicalHtmlFromMobileDisplay,
  mobileDisplayHtmlFromCanonical,
} from "@/lib/mobile-html-fonts";

export { isEnrichedNotesInputAvailable };

export type NotesInputHandle = {
  focus: () => void;
  blur: () => void;
  setContent: (html: string) => void;
  setSelection: (start: number, end: number) => void;
  isNativeRichText: boolean;
  toggleBold?: () => void;
  toggleItalic?: () => void;
  toggleUnderline?: () => void;
  toggleStrikeThrough?: () => void;
  toggleInlineCode?: () => void;
  toggleH1?: () => void;
  toggleH2?: () => void;
  toggleH3?: () => void;
  toggleUnorderedList?: () => void;
  toggleOrderedList?: () => void;
  toggleCheckboxList?: (checked: boolean) => void;
  setLink?: (start: number, end: number, text: string, url: string) => void;
};

type SharedNotesInputProps = {
  onChangeText: (text: string) => void;
  onSelectionChange?: (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => void;
  onBlur?: TextInputProps["onBlur"];
  onFocus?: () => void;
  placeholder?: string;
  placeholderTextColor?: string;
  style?: TextStyle;
  inputRef?: RefObject<NotesInputHandle | null>;
  selectionColor?: string;
  cursorColor?: string;
};

export type FormattedNotesInputProps = SharedNotesInputProps & {
  defaultHtml: string;
  remountKey: string;
  value: string;
  displayHtml: string;
  onChangeHtml: (html: string) => void;
  selection?: TextSelectionRange;
  notesMinHeight?: number;
  notesMaxHeight?: number;
};

const MIRROR_SELECTION_FILL = "rgba(37, 99, 235, 0.35)";

function usesMirrorSelectionOverlay(
  displayHtml: string,
  showMirror: boolean,
  selection?: TextSelectionRange,
) {
  return (
    showMirror &&
    htmlHasMetricSpanFormatting(displayHtml) &&
    Boolean(selection && selection.end > selection.start)
  );
}

function MirrorFormattedText({
  runs,
  selection,
  typography,
  placeholder,
  placeholderTextColor,
  useCustomSelection,
}: {
  runs: TextRun[];
  selection?: TextSelectionRange;
  typography: ReturnType<typeof mergeTypography>;
  placeholder?: string;
  placeholderTextColor: string;
  useCustomSelection: boolean;
}) {
  const segments = useMemo(
    () =>
      useCustomSelection
        ? splitMirrorRunsForSelection(runs, selection)
        : runs.map((run, index) => ({
            key: `${index}`,
            text: run.text,
            style: run.style,
            selected: false,
          })),
    [runs, selection, useCustomSelection],
  );

  return (
    <Text
      pointerEvents="none"
      style={[styles.mirrorText, typography]}
      allowFontScaling={false}>
      {segments.length === 0 && placeholder ? (
        <Text style={{ color: placeholderTextColor }}>{placeholder}</Text>
      ) : (
        segments.map((segment) => {
          const textStyle = runToMirrorTextStyle(segment.style, BASE_TEXT);
          if (!segment.selected) {
            return (
              <Text key={segment.key} style={textStyle}>
                {segment.text}
              </Text>
            );
          }

          return (
            <Text
              key={segment.key}
              style={[textStyle, { backgroundColor: MIRROR_SELECTION_FILL }]}>
              {segment.text}
            </Text>
          );
        })
      )}
    </Text>
  );
}

const BASE_TEXT = {
  fontSize: 17,
  lineHeight: 26,
  color: "#374151",
} as const;

const NOTES_MIN_HEIGHT = 140;
const NOTES_MAX_HEIGHT = 280;

const SHARED_INPUT_PROPS = {
  multiline: true as const,
  textAlignVertical: "top" as const,
  allowFontScaling: false,
  autoCorrect: true,
  spellCheck: true,
  scrollEnabled: true,
  showsVerticalScrollIndicator: true,
  ...(Platform.OS === "android"
    ? { includeFontPadding: false, textBreakStrategy: "simple" as const }
    : null),
};

function mergeTypography(style?: TextStyle) {
  return {
    ...BASE_TEXT,
    padding: 0,
    margin: 0,
    ...style,
  };
}

function resolveNotesHeights(
  notesMinHeight?: number,
  notesMaxHeight?: number,
) {
  return {
    minHeight: notesMinHeight ?? NOTES_MIN_HEIGHT,
    maxHeight: notesMaxHeight ?? NOTES_MAX_HEIGHT,
  };
}

function NativeRichNotesInput({
  defaultHtml,
  displayHtml,
  remountKey,
  onChangeHtml,
  onChangeText,
  onSelectionChange,
  onBlur,
  onFocus,
  placeholder,
  placeholderTextColor = "#9ca3af",
  style,
  inputRef,
  selection,
  selectionColor = "#2563eb",
  cursorColor = "#2563eb",
  notesMinHeight,
  notesMaxHeight,
}: FormattedNotesInputProps) {
  const { EnrichedTextInput } =
    require("react-native-enriched") as typeof import("react-native-enriched");

  const enrichedRef = useRef<EnrichedTextInputInstance>(null);
  const initialHtml = useMemo(() => {
    const enrichedHtml = taskDetailsHtmlToEnrichedHtml(defaultHtml);
    return mobileDisplayHtmlFromCanonical(enrichedHtml);
  }, [remountKey, defaultHtml]);
  const typography = mergeTypography(style);
  const notesHeights = resolveNotesHeights(notesMinHeight, notesMaxHeight);
  // Keep the mirror visible during word selection — hiding it exposed plain
  // native text and made color/highlight/bold look like they disappeared.
  const showFormattedMirror = htmlHasInlineFormatting(displayHtml);
  const mirrorRuns = useMemo(() => htmlToTextRuns(displayHtml), [displayHtml]);
  const useCustomSelection = usesMirrorSelectionOverlay(
    displayHtml,
    showFormattedMirror,
    selection,
  );
  const resolvedSelectionColor = useCustomSelection
    ? "transparent"
    : selectionColor;

  useImperativeHandle(inputRef, () => ({
    focus: () => enrichedRef.current?.focus(),
    blur: () => enrichedRef.current?.blur(),
    setContent: (html: string) => {
      const enrichedHtml = taskDetailsHtmlToEnrichedHtml(html);
      enrichedRef.current?.setValue(mobileDisplayHtmlFromCanonical(enrichedHtml));
    },
    setSelection: (start: number, end: number) => {
      enrichedRef.current?.setSelection(start, end);
    },
    isNativeRichText: true,
    toggleBold: () => enrichedRef.current?.toggleBold(),
    toggleItalic: () => enrichedRef.current?.toggleItalic(),
    toggleUnderline: () => enrichedRef.current?.toggleUnderline(),
    toggleStrikeThrough: () => enrichedRef.current?.toggleStrikeThrough(),
    toggleInlineCode: () => enrichedRef.current?.toggleInlineCode(),
    toggleH1: () => enrichedRef.current?.toggleH1(),
    toggleH2: () => enrichedRef.current?.toggleH2(),
    toggleH3: () => enrichedRef.current?.toggleH3(),
    toggleUnorderedList: () => enrichedRef.current?.toggleUnorderedList(),
    toggleOrderedList: () => enrichedRef.current?.toggleOrderedList(),
    toggleCheckboxList: (checked: boolean) =>
      enrichedRef.current?.toggleCheckboxList(checked),
    setLink: (start: number, end: number, text: string, url: string) =>
      enrichedRef.current?.setLink(start, end, text, url),
  }));

  return (
    <View style={[styles.mirrorContainer, notesHeights]}>
      {showFormattedMirror ? (
        <MirrorFormattedText
          runs={mirrorRuns}
          selection={selection}
          typography={typography}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          useCustomSelection={useCustomSelection}
        />
      ) : null}
      <EnrichedTextInput
        key={remountKey}
        ref={enrichedRef}
        defaultValue={initialHtml}
        onChangeHtml={(event: NativeSyntheticEvent<{ value: string }>) => {
          const mobileHtml = canonicalHtmlFromMobileDisplay(event.nativeEvent.value);
          onChangeHtml(enrichedHtmlToTaskDetailsHtml(mobileHtml));
        }}
        onChangeText={(event: NativeSyntheticEvent<{ value: string }>) => {
          onChangeText(event.nativeEvent.value);
        }}
        onChangeSelection={(event) => {
          const { start, end } = event.nativeEvent;
          onSelectionChange?.({
            nativeEvent: { selection: { start, end } },
          } as NativeSyntheticEvent<TextInputSelectionChangeEventData>);
        }}
        onBlur={onBlur}
        onFocus={() => onFocus?.()}
        placeholder={showFormattedMirror ? placeholder : undefined}
        placeholderTextColor={placeholderTextColor}
        style={{
          ...styles.input,
          ...typography,
          ...notesHeights,
          ...(showFormattedMirror ? styles.mirrorInput : null),
          marginBottom: 0,
        }}
        selectionColor={resolvedSelectionColor}
        cursorColor={cursorColor}
        androidExperimentalSynchronousEvents={Platform.OS === "android"}
        useHtmlNormalizer
        {...SHARED_INPUT_PROPS}
      />
    </View>
  );
}

function FormattedNotesPreview({
  displayHtml,
  placeholder,
  placeholderTextColor = "#9ca3af",
  style,
  onPress,
  notesMinHeight,
  notesMaxHeight,
}: {
  displayHtml: string;
  placeholder?: string;
  placeholderTextColor?: string;
  style?: TextStyle;
  onPress: () => void;
  notesMinHeight?: number;
  notesMaxHeight?: number;
}) {
  const runs = useMemo(() => htmlToTextRuns(displayHtml), [displayHtml]);
  const typography = mergeTypography(style);
  const notesHeights = resolveNotesHeights(notesMinHeight, notesMaxHeight);
  const isEmpty = runs.length === 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Edit notes"
      onPress={onPress}
      style={[styles.formattedPreview, notesHeights]}>
      {isEmpty ? (
        <Text
          style={[typography, styles.previewPlaceholder, { color: placeholderTextColor }]}
          allowFontScaling={false}>
          {placeholder}
        </Text>
      ) : (
        <Text style={[styles.previewText, typography]} allowFontScaling={false}>
          {runs.map((run, index) => (
            <Text
              key={`${index}-${run.text.slice(0, 8)}`}
              style={runToMirrorTextStyle(run.style, BASE_TEXT)}>
              {run.text}
            </Text>
          ))}
        </Text>
      )}
    </Pressable>
  );
}

function PlainNotesInput({
  value,
  onChangeText,
  onSelectionChange,
  onBlur,
  onFocus,
  placeholder,
  placeholderTextColor = "#9ca3af",
  style,
  inputRef,
  plainRef,
  autoFocus,
  selectionColor = "#2563eb",
  cursorColor = "#2563eb",
  notesMinHeight,
  notesMaxHeight,
}: Omit<
  FormattedNotesInputProps,
  "defaultHtml" | "remountKey" | "displayHtml" | "onChangeHtml"
> & {
  plainRef?: RefObject<TextInput | null>;
  autoFocus?: boolean;
}) {
  const textInputRef = useRef<TextInput>(null);
  const resolvedRef = plainRef ?? textInputRef;
  const typography = mergeTypography(style);
  const notesHeights = resolveNotesHeights(notesMinHeight, notesMaxHeight);

  useImperativeHandle(inputRef, () => ({
    focus: () => resolvedRef.current?.focus(),
    blur: () => resolvedRef.current?.blur(),
    setContent: () => undefined,
    setSelection: (start: number, end: number) => {
      resolvedRef.current?.setSelection(start, end);
    },
    isNativeRichText: false,
  }));

  return (
    <TextInput
      ref={resolvedRef}
      value={value}
      autoFocus={autoFocus}
      onChangeText={onChangeText}
      onSelectionChange={onSelectionChange}
      onFocus={() => onFocus?.()}
      onBlur={onBlur}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      style={[styles.plainInput, typography, notesHeights]}
      selectionColor={selectionColor}
      cursorColor={cursorColor}
      {...SHARED_INPUT_PROPS}
    />
  );
}

function FormattedMirrorNotesInput({
  value,
  displayHtml,
  onChangeText,
  onSelectionChange,
  onBlur,
  onFocus,
  placeholder,
  placeholderTextColor = "#9ca3af",
  style,
  plainRef,
  autoFocus,
  selection,
  selectionColor = "#2563eb",
  cursorColor = "#2563eb",
  notesMinHeight,
  notesMaxHeight,
}: Omit<
  FormattedNotesInputProps,
  "defaultHtml" | "remountKey" | "onChangeHtml" | "inputRef"
> & {
  plainRef: RefObject<TextInput | null>;
  autoFocus?: boolean;
}) {
  const typography = mergeTypography(style);
  const notesHeights = resolveNotesHeights(notesMinHeight, notesMaxHeight);
  const runs = useMemo(() => {
    const parsed = htmlToTextRuns(displayHtml);
    if (parsed.length > 0) return parsed;
    if (value) return [{ text: value, style: {} }];
    return [];
  }, [displayHtml, value]);
  const useCustomSelection = usesMirrorSelectionOverlay(
    displayHtml,
    true,
    selection,
  );
  const resolvedSelectionColor = useCustomSelection
    ? "transparent"
    : selectionColor;

  return (
    <View style={[styles.mirrorContainer, notesHeights]}>
      <MirrorFormattedText
        runs={runs}
        selection={selection}
        typography={typography}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        useCustomSelection={useCustomSelection}
      />
      <TextInput
        ref={plainRef}
        value={value}
        autoFocus={autoFocus}
        onChangeText={onChangeText}
        onSelectionChange={onSelectionChange}
        onFocus={() => onFocus?.()}
        onBlur={onBlur}
        placeholder={undefined}
        placeholderTextColor={placeholderTextColor}
        style={[
          styles.plainInput,
          typography,
          notesHeights,
          styles.mirrorPlainInput,
          styles.mirrorInput,
        ]}
        selectionColor={resolvedSelectionColor}
        cursorColor={cursorColor}
        {...SHARED_INPUT_PROPS}
      />
    </View>
  );
}

function FallbackNotesInput(props: FormattedNotesInputProps) {
  const { displayHtml, inputRef, onBlur, ...rest } = props;
  const hasFormatting = htmlHasInlineFormatting(displayHtml);
  const [isEditing, setIsEditing] = useState(false);
  const plainRef = useRef<TextInput>(null);

  const beginEditing = useCallback(() => {
    setIsEditing(true);
    requestAnimationFrame(() => plainRef.current?.focus());
  }, []);

  useImperativeHandle(
    inputRef,
    () => ({
      focus: () => {
        if (hasFormatting && !isEditing) {
          beginEditing();
          return;
        }
        requestAnimationFrame(() => plainRef.current?.focus());
      },
      blur: () => plainRef.current?.blur(),
      setContent: () => undefined,
      setSelection: (start: number, end: number) => {
        plainRef.current?.setSelection(start, end);
      },
      isNativeRichText: false,
    }),
    [beginEditing, hasFormatting, isEditing],
  );

  if (!hasFormatting) {
    return (
      <PlainNotesInput
        {...rest}
        plainRef={plainRef}
        onBlur={onBlur}
      />
    );
  }

  if (!isEditing) {
    return (
      <FormattedNotesPreview
        displayHtml={displayHtml}
        placeholder={rest.placeholder}
        placeholderTextColor={rest.placeholderTextColor}
        style={rest.style}
        notesMinHeight={rest.notesMinHeight}
        notesMaxHeight={rest.notesMaxHeight}
        onPress={beginEditing}
      />
    );
  }

  return (
    <FormattedMirrorNotesInput
      {...rest}
      displayHtml={displayHtml}
      plainRef={plainRef}
      autoFocus={isEditing}
      onFocus={() => {
        setIsEditing(true);
        rest.onFocus?.();
      }}
      onBlur={(event) => {
        setIsEditing(false);
        onBlur?.(event);
      }}
    />
  );
}

export function FormattedNotesInput(props: FormattedNotesInputProps) {
  if (isEnrichedNotesInputAvailable()) {
    return <NativeRichNotesInput {...props} />;
  }

  return <FallbackNotesInput {...props} />;
}

const styles = StyleSheet.create({
  input: {
    minHeight: NOTES_MIN_HEIGHT,
    maxHeight: NOTES_MAX_HEIGHT,
    padding: 0,
    margin: 0,
    marginBottom: 12,
    fontSize: BASE_TEXT.fontSize,
    lineHeight: BASE_TEXT.lineHeight,
    color: BASE_TEXT.color,
  },
  plainInput: {
    minHeight: NOTES_MIN_HEIGHT,
    maxHeight: NOTES_MAX_HEIGHT,
    marginBottom: 12,
  },
  formattedPreview: {
    minHeight: NOTES_MIN_HEIGHT,
    maxHeight: NOTES_MAX_HEIGHT,
    marginBottom: 12,
    padding: 0,
  },
  previewText: {
    padding: 0,
    margin: 0,
  },
  previewPlaceholder: {
    padding: 0,
    margin: 0,
  },
  mirrorContainer: {
    position: "relative",
    marginBottom: 12,
  },
  mirrorText: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 0,
    margin: 0,
  },
  mirrorPlainInput: {
    marginBottom: 0,
  },
  mirrorInput: {
    color: "transparent",
  },
});
