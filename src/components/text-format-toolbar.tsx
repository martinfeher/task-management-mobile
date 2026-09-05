import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { AiOutlineLineHeightIcon } from "@/components/ai-outline-line-height-icon";
import { AppSymbol } from "@/components/app-symbol";
import { FluentClearFormattingIcon } from "@/components/fluent-clear-formatting-icon";
import { LiquidGlassSurface } from "@/components/liquid-glass-surface";
import { PiHighlighterLightIcon } from "@/components/pi-highlighter-light-icon";
import { ThemedText } from "@/components/themed-text";
import { pickToolbarPreviewFontFamily } from "@/lib/detail-fonts-mobile";
import {
  DEFAULT_LINE_HEIGHT,
  TEXT_LINE_HEIGHT_MAX,
  TEXT_LINE_HEIGHT_MIN,
  TEXT_LINE_HEIGHT_STEP,
  TEXT_BLOCK_OPTIONS,
  TEXT_COLOR_OPTIONS,
  TEXT_FONT_SIZE_MAX,
  TEXT_FONT_SIZE_MIN,
  TEXT_FONT_SIZE_OPTIONS,
  TEXT_HIGHLIGHT_OPTIONS,
  getTextFormatFontFamilyOptions,
  roundLineHeight,
  type TextBlockType,
  type TextFontSizeOption,
  type TextFormatAction,
} from "@/lib/text-format";

// Rendered height of the floating toolbar's pill (button height + the
// content row's vertical padding). Used by callers that need to anchor
// other floating UI (e.g. undo/redo) relative to the toolbar's top edge
// without needing to measure it at runtime.
export const TEXT_FORMAT_TOOLBAR_HEIGHT = 49;

const MAIN_TOOLBAR_ICON_SIZE = 23;
const MAIN_TOOLBAR_CHECKLIST_ICON_SIZE = MAIN_TOOLBAR_ICON_SIZE + 2;
const MAIN_TOOLBAR_LETTER_SIZE = 22;

type TextFormatToolbarProps = {
  visible: boolean;
  layout?: "floating" | "accessory";
  variant?: "solid" | "glass";
  bottom?: number;
  onFormat: (
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
  ) => void;
  onDismiss: () => void;
  onKeepKeyboardFocus?: () => void;
  onLinkEditorOpenChange?: (open: boolean) => void;
  selectionHighlightColor?: string | null;
  selectionFontSize?: number | null;
  selectionLineHeight?: number | null;
  selectionBoldActive?: boolean;
  selectionFontFamily?: string | null;
  selectionText?: string | null;
  linkEditorOpen?: boolean;
  canAdjustFontSize?: boolean;
  canAdjustLineHeight?: boolean;
};

function keepKeyboardFocusHandlers(onKeepKeyboardFocus?: () => void) {
  if (!onKeepKeyboardFocus) return {};
  return {
    onPressIn: (event: { preventDefault?: () => void }) => {
      event.preventDefault?.();
      onKeepKeyboardFocus();
    },
  };
}

function scheduleKeepKeyboardFocus(onKeepKeyboardFocus?: () => void) {
  if (!onKeepKeyboardFocus) return;
  onKeepKeyboardFocus();
  requestAnimationFrame(() => onKeepKeyboardFocus());
  setTimeout(() => onKeepKeyboardFocus(), 0);
}

type FormatButtonProps = {
  label: string;
  onPress: () => void;
  children: ReactNode;
  active?: boolean;
  backgroundColor?: string;
};

type SubmenuKind =
  | "color"
  | "highlight"
  | "fontSize"
  | "lineHeight"
  | "blockType"
  | "fontFamily"
  | "overflow"
  | null;

const FONT_FAMILY_OPTIONS = getTextFormatFontFamilyOptions();
const DEFAULT_FONT_FAMILY_ID = FONT_FAMILY_OPTIONS[0]?.id ?? "inter";
const DEFAULT_FONT_SIZE_DISPLAY = 17;
const DEFAULT_LINE_HEIGHT_DISPLAY = DEFAULT_LINE_HEIGHT;
const LINK_POPUP_HORIZONTAL_INSET = 16;
const LINK_POPUP_MAX_WIDTH = 340;
const LINK_POPUP_GAP = 10;

type LinkAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function computeLinkPopupLayout(
  anchor: LinkAnchor,
  windowWidth: number,
  popupWidth: number,
  popupHeight: number,
) {
  const centeredLeft = anchor.x + anchor.width / 2 - popupWidth / 2;
  const left = Math.max(
    LINK_POPUP_HORIZONTAL_INSET,
    Math.min(centeredLeft, windowWidth - popupWidth - LINK_POPUP_HORIZONTAL_INSET),
  );
  const top = Math.max(LINK_POPUP_HORIZONTAL_INSET, anchor.y - popupHeight - LINK_POPUP_GAP);
  return { left, top, width: popupWidth };
}

function LinkEditorPopup({
  linkText,
  linkUrl,
  onChangeLinkText,
  onChangeLinkUrl,
  onApply,
  onKeepKeyboardFocus,
  autoFocusUrl = false,
  onLayout,
}: {
  linkText: string;
  linkUrl: string;
  onChangeLinkText: (value: string) => void;
  onChangeLinkUrl: (value: string) => void;
  onApply: () => void;
  onKeepKeyboardFocus?: () => void;
  autoFocusUrl?: boolean;
  onLayout?: (height: number) => void;
}) {
  const urlInputRef = useRef<TextInput>(null);
  const canApply = linkText.trim().length > 0 && linkUrl.trim().length > 0;
  const applyKeepFocus = keepKeyboardFocusHandlers(onKeepKeyboardFocus);

  useEffect(() => {
    if (!autoFocusUrl) return;
    scheduleKeepKeyboardFocus(onKeepKeyboardFocus);
    const id = setTimeout(() => {
      urlInputRef.current?.focus();
    }, 80);
    return () => clearTimeout(id);
  }, [autoFocusUrl, onKeepKeyboardFocus]);

  return (
    <View
      style={styles.linkPopupCard}
      onLayout={(event) => onLayout?.(event.nativeEvent.layout.height)}>
      <TextInput
        value={linkText}
        onChangeText={onChangeLinkText}
        placeholder="Add text"
        placeholderTextColor="#9ca3af"
        autoCorrect={false}
        style={styles.linkFieldInput}
        returnKeyType="next"
        onSubmitEditing={() => urlInputRef.current?.focus()}
      />

      <TextInput
        ref={urlInputRef}
        value={linkUrl}
        onChangeText={onChangeLinkUrl}
        placeholder="Paste or type a link"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={styles.linkFieldInput}
        returnKeyType="done"
        onSubmitEditing={canApply ? onApply : undefined}
      />

      <View style={styles.linkPopupFooter}>
        <ThemedText style={styles.linkHintText}>
          {Platform.OS === "web" ? "Cmd/Ctrl+click to open" : "Tap link to open"}
        </ThemedText>
        <Pressable
          style={[
            styles.linkApplyButton,
            !canApply && styles.linkApplyButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Apply link"
          disabled={!canApply}
          onPress={onApply}
          {...applyKeepFocus}>
          <ThemedText style={styles.linkApplyText}>Apply</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function FormatButton({
  label,
  onPress,
  children,
  active,
  backgroundColor,
  variant,
  onKeepKeyboardFocus,
}: FormatButtonProps & {
  variant: "solid" | "glass";
  onKeepKeyboardFocus?: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.formatButton,
        backgroundColor ? { backgroundColor } : null,
        active &&
          !backgroundColor &&
          (variant === "glass"
            ? styles.formatButtonActiveGlass
            : styles.formatButtonActive),
      ]}
      onPress={onPress}
      onPressIn={(event) => {
        event.preventDefault?.();
        onKeepKeyboardFocus?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}>
      {children}
    </Pressable>
  );
}

function FormatLetter({
  letter,
  style,
}: {
  letter: string;
  style?: object;
}) {
  return (
    <ThemedText style={[styles.formatLetter, style]}>{letter}</ThemedText>
  );
}

function ColorTrigger({ color }: { color: string }) {
  return (
    <View style={styles.colorTrigger}>
      <ThemedText style={styles.colorTriggerLetter}>A</ThemedText>
      <View style={[styles.colorTriggerBar, { backgroundColor: color }]} />
    </View>
  );
}

function HeadingLevelIcon({ level }: { level: 1 | 2 | 3 }) {
  const subscript = level === 1 ? "₁" : level === 2 ? "₂" : "₃";

  return (
    <ThemedText style={styles.headingTrigger}>
      H
      <ThemedText style={styles.headingTriggerSub}>{subscript}</ThemedText>
    </ThemedText>
  );
}

function BlockTypeMenuIcon({ type }: { type: TextBlockType }) {
  if (type === "text") {
    return (
      <AppSymbol ios="text.alignleft" android="notes" size={18} tintColor="#374151" />
    );
  }

  return (
    <HeadingLevelIcon level={type === "h1" ? 1 : type === "h2" ? 2 : 3} />
  );
}

function SuperscriptMenuIcon() {
  return <ThemedText style={styles.scriptMenuIcon}>x²</ThemedText>;
}

function SubscriptMenuIcon() {
  return <ThemedText style={styles.scriptMenuIcon}>x₂</ThemedText>;
}

function FormatSubmenu({
  kind,
  variant,
  onSelectColor,
  onSelectHighlight,
  onSelectFontSize,
  onAdjustFontSize,
  onAdjustLineHeight,
  onSelectBlockType,
  onSelectFontFamily,
  onOverflowAction,
  onNavigateSubmenu,
  onClose,
  onKeepKeyboardFocus,
  selectedFontFamily = null,
  selectedFontSize = null,
  selectedLineHeight = null,
  canAdjustFontSize = false,
  canAdjustLineHeight = false,
  fontFamilyScrollRef,
}: {
  kind: SubmenuKind;
  variant: "solid" | "glass";
  onSelectColor: (color: string) => void;
  onSelectHighlight: (color: string) => void;
  onSelectFontSize: (size: TextFontSizeOption) => void;
  onAdjustFontSize: (delta: -1 | 1) => void;
  onAdjustLineHeight: (delta: -1 | 1) => void;
  onSelectBlockType: (blockType: TextBlockType) => void;
  onSelectFontFamily: (fontFamily: string) => void;
  onOverflowAction: (
    action: Extract<
      TextFormatAction,
      "italic" | "strikethrough" | "code" | "superscript" | "subscript"
    >,
  ) => void;
  onNavigateSubmenu: (kind: SubmenuKind) => void;
  onClose: () => void;
  onKeepKeyboardFocus?: () => void;
  selectedFontFamily?: string | null;
  selectedFontSize?: number | null;
  selectedLineHeight?: number | null;
  canAdjustFontSize?: boolean;
  canAdjustLineHeight?: boolean;
  fontFamilyScrollRef?: React.RefObject<ScrollView | null>;
}) {
  if (!kind) return null;

  const keepFocus = keepKeyboardFocusHandlers(onKeepKeyboardFocus);
  const currentFontSize = selectedFontSize ?? DEFAULT_FONT_SIZE_DISPLAY;
  const canDecreaseFontSize =
    canAdjustFontSize && currentFontSize > TEXT_FONT_SIZE_MIN;
  const canIncreaseFontSize =
    canAdjustFontSize && currentFontSize < TEXT_FONT_SIZE_MAX;
  const currentLineHeight = selectedLineHeight ?? DEFAULT_LINE_HEIGHT_DISPLAY;
  const canDecreaseLineHeight =
    canAdjustLineHeight &&
    roundLineHeight(currentLineHeight - TEXT_LINE_HEIGHT_STEP) >= TEXT_LINE_HEIGHT_MIN;
  const canIncreaseLineHeight =
    canAdjustLineHeight &&
    roundLineHeight(currentLineHeight + TEXT_LINE_HEIGHT_STEP) <= TEXT_LINE_HEIGHT_MAX;

  if (kind === "fontFamily") {
    const fontFamilyScroll = (
      <>
        <ScrollView
          ref={fontFamilyScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toolbarContent}
          keyboardShouldPersistTaps="always">
          {FONT_FAMILY_OPTIONS.map((option) => {
            const previewFontFamily = pickToolbarPreviewFontFamily(option.id);
            const active = selectedFontFamily === option.value;
            return (
              <Pressable
                key={option.id}
                style={[
                  styles.fontFamilyChip,
                  active && styles.fontFamilyChipActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: active }}
                onPress={() => onSelectFontFamily(option.value)}
                {...keepFocus}>
                <ThemedText
                  style={[
                    styles.fontFamilyChipText,
                    previewFontFamily ? { fontFamily: previewFontFamily } : null,
                    active && styles.fontFamilyChipTextActive,
                  ]}
                  numberOfLines={1}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.scrollHint} pointerEvents="none">
          <AppSymbol
            ios="chevron.right"
            android="chevron-right"
            size={12}
            tintColor={variant === "glass" ? "#6b7280" : "#9ca3af"}
          />
        </View>
      </>
    );

    if (variant === "glass") {
      return (
        <LiquidGlassSurface
          style={[styles.toolbarGlass, styles.toolbarFullWidth]}
          isInteractive={false}>
          {fontFamilyScroll}
        </LiquidGlassSurface>
      );
    }

    return (
      <View style={[styles.toolbar, styles.toolbarFullWidth]}>{fontFamilyScroll}</View>
    );
  }

  const submenuTitle =
    kind === "color"
      ? "Text color"
      : kind === "highlight"
        ? "Highlight"
        : kind === "fontSize"
          ? "Font size"
          : kind === "lineHeight"
            ? "Line height"
            : kind === "blockType"
            ? "Text style"
            : "More options";

  const content = (
    <>
      <View style={styles.submenuHeader}>
        <ThemedText style={styles.submenuTitle}>{submenuTitle}</ThemedText>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          {...keepFocus}
          accessibilityRole="button"
          accessibilityLabel="Close menu">
          <AppSymbol ios="xmark" android="close" size={14} tintColor="#6b7280" />
        </Pressable>
      </View>

      {kind === "color" ? (
        <View style={styles.colorGrid}>
          {TEXT_COLOR_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.colorSwatch,
                option.value === "#ffffff"
                  ? styles.colorSwatchWhite
                  : { backgroundColor: option.value },
              ]}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              onPress={() => onSelectColor(option.value)}
              {...keepFocus}
            />
          ))}
        </View>
      ) : kind === "highlight" ? (
        <View style={styles.highlightGrid}>
          {TEXT_HIGHLIGHT_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.highlightSwatch,
                option.value === "#ffffff"
                  ? styles.highlightSwatchNone
                  : { backgroundColor: option.value },
              ]}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              onPress={() => onSelectHighlight(option.value)}
              {...keepFocus}
            />
          ))}
        </View>
      ) : kind === "fontSize" ? (
        <View style={styles.fontSizePanel}>
          <View style={styles.fontSizeStepper}>
            <Pressable
              style={[
                styles.fontSizeStepButton,
                !canDecreaseFontSize && styles.fontSizeStepButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Decrease font size by 1"
              disabled={!canDecreaseFontSize}
              onPress={() => onAdjustFontSize(-1)}
              {...keepFocus}>
              <AppSymbol
                ios="chevron.left"
                android="chevron-left"
                size={16}
                tintColor="#374151"
              />
            </Pressable>
            <ThemedText style={styles.fontSizeValue}>{currentFontSize}</ThemedText>
            <Pressable
              style={[
                styles.fontSizeStepButton,
                !canIncreaseFontSize && styles.fontSizeStepButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Increase font size by 1"
              disabled={!canIncreaseFontSize}
              onPress={() => onAdjustFontSize(1)}
              {...keepFocus}>
              <AppSymbol
                ios="chevron.right"
                android="chevron-right"
                size={16}
                tintColor="#374151"
              />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.fontSizeScroll}
            contentContainerStyle={styles.fontSizeRow}
            keyboardShouldPersistTaps="always">
            {TEXT_FONT_SIZE_OPTIONS.map((size) => (
              <Pressable
                key={size}
                style={[
                  styles.fontSizeChip,
                  selectedFontSize === size && styles.fontSizeChipActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Font size ${size}`}
                onPress={() => onSelectFontSize(size)}
                {...keepFocus}>
                <ThemedText
                  style={[styles.fontSizeChipText, { fontSize: Math.min(size, 18) }]}>
                  {size}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : kind === "lineHeight" ? (
        <View style={styles.fontSizePanel}>
          <View style={styles.fontSizeStepper}>
            <Pressable
              style={[
                styles.fontSizeStepButton,
                !canDecreaseLineHeight && styles.fontSizeStepButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Decrease line height by 0.1"
              disabled={!canDecreaseLineHeight}
              onPress={() => onAdjustLineHeight(-1)}
              {...keepFocus}>
              <AppSymbol
                ios="chevron.left"
                android="chevron-left"
                size={16}
                tintColor="#374151"
              />
            </Pressable>
            <ThemedText style={styles.fontSizeValue}>
              {currentLineHeight.toFixed(1)}
            </ThemedText>
            <Pressable
              style={[
                styles.fontSizeStepButton,
                !canIncreaseLineHeight && styles.fontSizeStepButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Increase line height by 0.1"
              disabled={!canIncreaseLineHeight}
              onPress={() => onAdjustLineHeight(1)}
              {...keepFocus}>
              <AppSymbol
                ios="chevron.right"
                android="chevron-right"
                size={16}
                tintColor="#374151"
              />
            </Pressable>
          </View>
        </View>
      ) : kind === "blockType" ? (
        <View style={styles.blockTypeList}>
          {TEXT_BLOCK_OPTIONS.map((option) => (
            <Pressable
              key={option.type}
              style={styles.blockTypeRow}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              onPress={() => onSelectBlockType(option.type)}
              {...keepFocus}>
              <BlockTypeMenuIcon type={option.type} />
              <ThemedText style={styles.blockTypeLabel}>{option.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.overflowList}>
          <Pressable
            style={styles.overflowRow}
            accessibilityRole="button"
            accessibilityLabel="Italic"
            onPress={() => onOverflowAction("italic")}
            {...keepFocus}>
            <FormatLetter letter="I" style={styles.italicLetter} />
            <ThemedText style={styles.overflowLabel}>Italic</ThemedText>
          </Pressable>
          <Pressable
            style={styles.overflowRow}
            accessibilityRole="button"
            accessibilityLabel="Strikethrough"
            onPress={() => onOverflowAction("strikethrough")}
            {...keepFocus}>
            <FormatLetter letter="S" style={styles.strikeLetter} />
            <ThemedText style={styles.overflowLabel}>Strikethrough</ThemedText>
          </Pressable>
          <Pressable
            style={styles.overflowRow}
            accessibilityRole="button"
            accessibilityLabel="Code"
            onPress={() => onOverflowAction("code")}
            {...keepFocus}>
            <ThemedText style={styles.codeLetters}>&lt; &gt;</ThemedText>
            <ThemedText style={styles.overflowLabel}>Code</ThemedText>
          </Pressable>
          <Pressable
            style={styles.overflowRow}
            accessibilityRole="button"
            accessibilityLabel="Superscript"
            onPress={() => onOverflowAction("superscript")}
            {...keepFocus}>
            <SuperscriptMenuIcon />
            <ThemedText style={styles.overflowLabel}>Superscript</ThemedText>
          </Pressable>
          <Pressable
            style={styles.overflowRow}
            accessibilityRole="button"
            accessibilityLabel="Subscript"
            onPress={() => onOverflowAction("subscript")}
            {...keepFocus}>
            <SubscriptMenuIcon />
            <ThemedText style={styles.overflowLabel}>Subscript</ThemedText>
          </Pressable>
          <Pressable
            style={styles.overflowRow}
            accessibilityRole="button"
            accessibilityLabel="Line height"
            onPress={() => onNavigateSubmenu("lineHeight")}
            {...keepFocus}>
            <AiOutlineLineHeightIcon size={18} color="#374151" />
            <ThemedText style={styles.overflowLabel}>Line height</ThemedText>
          </Pressable>
        </View>
      )}
    </>
  );

  if (variant === "glass") {
    return (
      <View style={[styles.submenu, styles.submenuOnGlass]}>
        {content}
      </View>
    );
  }

  return <View style={styles.submenu}>{content}</View>;
}

function FormatToolbarButtons({
  onFormat,
  onOpenLinkEditor,
  onOpenSubmenu,
  activeSubmenu,
  scrollRef,
  linkButtonRef,
  linkEditorOpen,
  variant,
  onKeepKeyboardFocus,
  selectionFontSize,
  selectionBoldActive = false,
}: {
  onFormat: TextFormatToolbarProps["onFormat"];
  onOpenLinkEditor: () => void;
  onOpenSubmenu: (kind: SubmenuKind) => void;
  activeSubmenu: SubmenuKind;
  scrollRef: React.RefObject<ScrollView | null>;
  linkButtonRef: RefObject<View | null>;
  linkEditorOpen: boolean;
  variant: "solid" | "glass";
  onKeepKeyboardFocus?: () => void;
  selectionFontSize?: number | null;
  selectionBoldActive?: boolean;
}) {
  const fontFamilyLabel =
    FONT_FAMILY_OPTIONS.find((option) => option.id === DEFAULT_FONT_FAMILY_ID)?.label ??
    "Inter";

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.toolbarContent}
      keyboardShouldPersistTaps="always">
      <FormatButton
        variant={variant}
        label="Bold"
        active={selectionBoldActive}
        onPress={() => onFormat("bold")}
        onKeepKeyboardFocus={onKeepKeyboardFocus}>
        <FormatLetter
          letter="B"
          style={[
            styles.boldLetter,
            styles.mainToolbarLetter,
            selectionBoldActive && styles.formatLetterActive,
          ]}
        />
      </FormatButton>

      <FormatButton
        variant={variant}
        label="Text style"
        active={activeSubmenu === "blockType"}
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        onPress={() =>
          onOpenSubmenu(activeSubmenu === "blockType" ? null : "blockType")
        }>
        <ThemedText style={styles.blockTypeTrigger}>Aa</ThemedText>
      </FormatButton>

      <FormatButton
        variant={variant}
        label="Text color"
        active={activeSubmenu === "color"}
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        onPress={() => onOpenSubmenu(activeSubmenu === "color" ? null : "color")}>
        <ColorTrigger color="#374151" />
      </FormatButton>

      <FormatButton
        variant={variant}
        label="Highlight"
        active={activeSubmenu === "highlight"}
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        onPress={() =>
          onOpenSubmenu(activeSubmenu === "highlight" ? null : "highlight")
        }>
        <PiHighlighterLightIcon size={MAIN_TOOLBAR_ICON_SIZE} color="#374151" />
      </FormatButton>

      <FormatButton
        variant={variant}
        label="Checklist item"
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        onPress={() => onFormat("checklist")}>
        <AppSymbol
          ios="checkmark.circle"
          android="check-circle-outline"
          size={MAIN_TOOLBAR_CHECKLIST_ICON_SIZE}
          tintColor="#374151"
        />
      </FormatButton>

      <View ref={linkButtonRef} collapsable={false}>
        <FormatButton
          variant={variant}
          label="Add link"
          active={linkEditorOpen}
          onKeepKeyboardFocus={onKeepKeyboardFocus}
          onPress={onOpenLinkEditor}>
          <AppSymbol
            ios="link"
            android="link"
            size={MAIN_TOOLBAR_ICON_SIZE}
            tintColor="#374151"
          />
        </FormatButton>
      </View>

      <FormatButton
        variant={variant}
        label="Font family"
        active={activeSubmenu === "fontFamily"}
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        onPress={() =>
          onOpenSubmenu(activeSubmenu === "fontFamily" ? null : "fontFamily")
        }>
        <ThemedText style={styles.fontFamilyTrigger} numberOfLines={1}>
          {fontFamilyLabel}
        </ThemedText>
      </FormatButton>

      <FormatButton
        variant={variant}
        label="Font size"
        active={activeSubmenu === "fontSize"}
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        onPress={() =>
          onOpenSubmenu(activeSubmenu === "fontSize" ? null : "fontSize")
        }>
        <ThemedText style={styles.fontSizeTrigger}>
          {selectionFontSize ?? DEFAULT_FONT_SIZE_DISPLAY}
        </ThemedText>
      </FormatButton>

      <FormatButton
        variant={variant}
        label="Bullet list"
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        onPress={() => onFormat("bullet")}>
        <AppSymbol
          ios="list.bullet"
          android="format-list-bulleted"
          size={MAIN_TOOLBAR_ICON_SIZE}
          tintColor="#374151"
        />
      </FormatButton>

      <FormatButton
        variant={variant}
        label="Numbered list"
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        onPress={() => onFormat("numbered")}>
        <AppSymbol
          ios="list.number"
          android="format-list-numbered"
          size={MAIN_TOOLBAR_ICON_SIZE}
          tintColor="#374151"
        />
      </FormatButton>

      <FormatButton
        variant={variant}
        label="Clear formatting"
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        onPress={() => onFormat("clearFormatting")}>
        <FluentClearFormattingIcon size={MAIN_TOOLBAR_ICON_SIZE} color="#374151" />
      </FormatButton>

      <FormatButton
        variant={variant}
        label="Underline"
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        onPress={() => onFormat("underline")}>
        <FormatLetter
          letter="U"
          style={[styles.underlineLetter, styles.mainToolbarLetter]}
        />
      </FormatButton>

      <FormatButton
        variant={variant}
        label="More formatting options"
        active={activeSubmenu === "overflow"}
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        onPress={() =>
          onOpenSubmenu(activeSubmenu === "overflow" ? null : "overflow")
        }>
        <ThemedText style={styles.overflowTrigger}>···</ThemedText>
      </FormatButton>
    </ScrollView>
  );
}

export function TextFormatToolbar({
  visible,
  layout = "floating",
  variant = "glass",
  bottom = 0,
  onFormat,
  onDismiss,
  onKeepKeyboardFocus,
  onLinkEditorOpenChange,
  selectionHighlightColor = null,
  selectionFontSize = null,
  selectionLineHeight = null,
  selectionBoldActive = false,
  selectionFontFamily = null,
  selectionText = null,
  linkEditorOpen: linkEditorOpenProp = false,
  canAdjustFontSize = false,
  canAdjustLineHeight = false,
}: TextFormatToolbarProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkAnchor, setLinkAnchor] = useState<LinkAnchor | null>(null);
  const [linkPopupHeight, setLinkPopupHeight] = useState(180);
  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuKind>(null);
  const scrollRef = useRef<ScrollView>(null);
  const fontFamilyScrollRef = useRef<ScrollView>(null);
  const linkButtonRef = useRef<View>(null);

  const linkPopupWidth = Math.min(
    windowWidth - LINK_POPUP_HORIZONTAL_INSET * 2,
    LINK_POPUP_MAX_WIDTH,
  );

  const setLinkEditorVisible = (open: boolean) => {
    setLinkEditorOpen(open);
    onLinkEditorOpenChange?.(open);
  };

  useEffect(() => {
    if (!linkEditorOpenProp && linkEditorOpen) {
      setLinkEditorOpen(false);
      setLinkText("");
      setLinkUrl("");
      setLinkAnchor(null);
    }
  }, [linkEditorOpenProp, linkEditorOpen]);

  useEffect(() => {
    if (!visible) {
      setActiveSubmenu(null);
      if (linkEditorOpen) {
        setLinkEditorOpen(false);
        onLinkEditorOpenChange?.(false);
      }
      setLinkText("");
      setLinkUrl("");
      setLinkAnchor(null);
    }
  }, [visible, linkEditorOpen, onLinkEditorOpenChange]);

  useEffect(() => {
    if (!canAdjustFontSize) {
      setActiveSubmenu(null);
    }
  }, [canAdjustFontSize]);

  useEffect(() => {
    if (activeSubmenu !== "fontFamily") return;
    requestAnimationFrame(() => {
      fontFamilyScrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [activeSubmenu]);

  const closeLinkEditor = () => {
    setLinkEditorVisible(false);
    setLinkText("");
    setLinkUrl("");
    setLinkAnchor(null);
    scheduleKeepKeyboardFocus(onKeepKeyboardFocus);
  };

  const handleLinkApply = () => {
    const trimmedText = linkText.trim();
    const trimmedUrl = linkUrl.trim();
    if (!trimmedText || !trimmedUrl) return;

    onFormat("link", { linkText: trimmedText, linkUrl: trimmedUrl });
    closeLinkEditor();
  };

  const handleOpenLinkEditor = () => {
    if (linkEditorOpen) {
      closeLinkEditor();
      return;
    }

    setActiveSubmenu(null);
    setLinkText(selectionText ?? "");
    setLinkUrl("");
    setLinkEditorVisible(true);
    scheduleKeepKeyboardFocus(onKeepKeyboardFocus);
    requestAnimationFrame(() => {
      linkButtonRef.current?.measureInWindow((x, y, width, height) => {
        setLinkAnchor({ x, y, width, height });
      });
    });
  };

  const handleOpenSubmenu = (kind: SubmenuKind) => {
    closeLinkEditor();
    setActiveSubmenu(kind);
    scheduleKeepKeyboardFocus(onKeepKeyboardFocus);
    if (kind === "fontSize" || kind === "fontFamily" || kind === "overflow" || kind === "lineHeight") {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    }
  };

  const linkPopupLayout =
    linkEditorOpen && linkAnchor
      ? computeLinkPopupLayout(linkAnchor, windowWidth, linkPopupWidth, linkPopupHeight)
      : null;

  const linkPopup = linkPopupLayout ? (
    <View
      style={[
        styles.linkPopupFloating,
        {
          top: linkPopupLayout.top,
          left: linkPopupLayout.left,
          width: linkPopupLayout.width,
        },
      ]}
      pointerEvents="box-none">
      <LinkEditorPopup
        linkText={linkText}
        linkUrl={linkUrl}
        onChangeLinkText={setLinkText}
        onChangeLinkUrl={setLinkUrl}
        onApply={handleLinkApply}
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        autoFocusUrl
        onLayout={setLinkPopupHeight}
      />
    </View>
  ) : null;

  const handleAdjustFontSize = (delta: -1 | 1) => {
    const base = selectionFontSize ?? DEFAULT_FONT_SIZE_DISPLAY;
    const next = Math.min(
      TEXT_FONT_SIZE_MAX,
      Math.max(TEXT_FONT_SIZE_MIN, base + delta),
    );
    if (next === base) return;
    onFormat("fontSize", { fontSize: next });
    scheduleKeepKeyboardFocus(onKeepKeyboardFocus);
  };

  const handleAdjustLineHeight = (delta: -1 | 1) => {
    const base = selectionLineHeight ?? DEFAULT_LINE_HEIGHT_DISPLAY;
    const next = roundLineHeight(
      Math.min(
        TEXT_LINE_HEIGHT_MAX,
        Math.max(TEXT_LINE_HEIGHT_MIN, base + delta * TEXT_LINE_HEIGHT_STEP),
      ),
    );
    if (next === base) return;
    onFormat("lineHeight", { lineHeight: next });
    scheduleKeepKeyboardFocus(onKeepKeyboardFocus);
  };

  const toolbar = (
    <View style={styles.toolbarStack}>
      <View style={styles.toolbarAnchor}>
        {activeSubmenu ? (
          <View
            style={[
              styles.submenuAbove,
              activeSubmenu === "fontFamily" && styles.submenuAboveStretch,
            ]}
            pointerEvents="box-none">
            <FormatSubmenu
              kind={activeSubmenu}
              variant={variant}
              selectedFontFamily={selectionFontFamily}
              selectedFontSize={selectionFontSize}
              selectedLineHeight={selectionLineHeight}
              canAdjustFontSize={canAdjustFontSize}
              canAdjustLineHeight={canAdjustLineHeight}
              fontFamilyScrollRef={fontFamilyScrollRef}
              onSelectColor={(color) => {
                onFormat("color", { color });
                setActiveSubmenu(null);
              }}
              onSelectHighlight={(highlightColor) => {
                onFormat("highlight", { highlightColor });
                setActiveSubmenu(null);
              }}
              onSelectFontSize={(fontSize) => {
                onFormat("fontSize", { fontSize });
                setActiveSubmenu(null);
              }}
              onAdjustFontSize={handleAdjustFontSize}
              onAdjustLineHeight={handleAdjustLineHeight}
              onSelectBlockType={(blockType) => {
                onFormat("blockType", { blockType });
                setActiveSubmenu(null);
              }}
              onSelectFontFamily={(fontFamily) => {
                onFormat("fontFamily", { fontFamily });
                setActiveSubmenu(null);
                scheduleKeepKeyboardFocus(onKeepKeyboardFocus);
              }}
              onOverflowAction={(action) => {
                onFormat(action);
                setActiveSubmenu(null);
              }}
              onNavigateSubmenu={(nextKind) => {
                setActiveSubmenu(nextKind);
                scheduleKeepKeyboardFocus(onKeepKeyboardFocus);
              }}
              onClose={() => setActiveSubmenu(null)}
              onKeepKeyboardFocus={onKeepKeyboardFocus}
            />
          </View>
        ) : null}
        {variant === "glass" ? (
          <LiquidGlassSurface
            style={[styles.toolbarGlass, styles.toolbarFullWidth]}
            isInteractive={false}>
            <FormatToolbarButtons
              variant={variant}
              onFormat={onFormat}
              onOpenLinkEditor={handleOpenLinkEditor}
              onOpenSubmenu={handleOpenSubmenu}
              activeSubmenu={activeSubmenu}
              scrollRef={scrollRef}
              linkButtonRef={linkButtonRef}
              linkEditorOpen={linkEditorOpen}
              onKeepKeyboardFocus={onKeepKeyboardFocus}
              selectionFontSize={selectionFontSize}
              selectionBoldActive={selectionBoldActive}
            />
            <View style={styles.scrollHint} pointerEvents="none">
              <AppSymbol
                ios="chevron.right"
                android="chevron-right"
                size={12}
                tintColor="#6b7280"
              />
            </View>
          </LiquidGlassSurface>
        ) : (
          <View style={[styles.toolbar, styles.toolbarFullWidth]}>
            <FormatToolbarButtons
              variant={variant}
              onFormat={onFormat}
              onOpenLinkEditor={handleOpenLinkEditor}
              onOpenSubmenu={handleOpenSubmenu}
              activeSubmenu={activeSubmenu}
              scrollRef={scrollRef}
              linkButtonRef={linkButtonRef}
              linkEditorOpen={linkEditorOpen}
              onKeepKeyboardFocus={onKeepKeyboardFocus}
              selectionFontSize={selectionFontSize}
              selectionBoldActive={selectionBoldActive}
            />
            <View style={styles.scrollHint} pointerEvents="none">
              <AppSymbol
                ios="chevron.right"
                android="chevron-right"
                size={12}
                tintColor="#9ca3af"
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <>
      {visible && linkPopup}
      {layout === "accessory" ? (
        visible ? (
          <View
            style={[
              styles.accessoryBar,
              variant === "glass" && styles.accessoryBarGlass,
            ]}>
            {toolbar}
          </View>
        ) : (
          <View style={styles.accessoryHidden} />
        )
      ) : visible ? (
        <View
          style={[styles.floatingContainer, { bottom }]}
          pointerEvents="box-none">
          {toolbar}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
    elevation: 50,
  },
  accessoryBar: {
    backgroundColor: "#f9fafb",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
    paddingVertical: 8,
    alignItems: "center",
  },
  accessoryBarGlass: {
    backgroundColor: "transparent",
    borderTopColor: "rgba(255,255,255,0.35)",
  },
  accessoryHidden: {
    height: 0,
    overflow: "hidden",
  },
  toolbarStack: {
    maxWidth: "94%",
    position: "relative",
    alignItems: "center",
  },
  toolbarAnchor: {
    position: "relative",
    alignSelf: "center",
  },
  submenuAbove: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    marginBottom: 8,
    alignItems: "center",
    zIndex: 2,
  },
  submenuAboveStretch: {
    alignItems: "stretch",
  },
  toolbarGlass: {
    position: "relative",
    alignSelf: "center",
  },
  toolbarFullWidth: {
    alignSelf: "stretch",
    width: "100%",
  },
  toolbar: {
    backgroundColor: "#ffffff",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    overflow: "hidden",
  },
  toolbarContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
    paddingRight: 24,
  },
  scrollHint: {
    position: "absolute",
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    opacity: 0.8,
  },
  formatButton: {
    minWidth: 37,
    height: 37,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  formatButtonActiveGlass: {
    backgroundColor: "rgba(255,255,255,0.38)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.72)",
  },
  formatButtonActive: {
    backgroundColor: "#f3f4f6",
  },
  formatLetter: {
    fontSize: 20,
    color: "#374151",
  },
  boldLetter: {
    fontWeight: "700",
  },
  mainToolbarLetter: {
    fontSize: MAIN_TOOLBAR_LETTER_SIZE,
  },
  formatLetterActive: {
    color: "#2563eb",
  },
  italicLetter: {
    fontStyle: "italic",
  },
  underlineLetter: {
    textDecorationLine: "underline",
  },
  strikeLetter: {
    textDecorationLine: "line-through",
  },
  codeLetters: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  scriptMenuIcon: {
    minWidth: 24,
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  colorTrigger: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 18,
  },
  colorTriggerLetter: {
    fontSize: 21,
    fontWeight: "700",
    color: "#374151",
    lineHeight: 23,
  },
  colorTriggerBar: {
    width: 16,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  fontSizeTrigger: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  blockTypeTrigger: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
  },
  headingTrigger: {
    fontSize: 17,
    fontWeight: "600",
    color: "#374151",
    lineHeight: 18,
  },
  headingTriggerSub: {
    fontSize: 10,
    fontWeight: "600",
    color: "#374151",
    lineHeight: 12,
  },
  fontFamilyTrigger: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    maxWidth: 72,
  },
  overflowTrigger: {
    fontSize: 22,
    fontWeight: "600",
    color: "#63636b",
    letterSpacing: 1,
  },
  blockTypeList: {
    gap: 2,
    minWidth: 168,
  },
  blockTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  blockTypeLabel: {
    fontSize: 15,
    color: "#374151",
  },
  fontFamilyChip: {
    height: 37,
    borderRadius: 19,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fontFamilyChipActive: {
    backgroundColor: "#dbeafe",
  },
  fontFamilyChipText: {
    fontSize: 15,
    color: "#374151",
  },
  fontFamilyChipTextActive: {
    color: "#2563eb",
    fontWeight: "600",
  },
  overflowList: {
    minWidth: 168,
    gap: 2,
  },
  overflowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  overflowLabel: {
    fontSize: 15,
    color: "#374151",
  },
  submenu: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submenuOnGlass: {
    backgroundColor: "rgba(255,255,255,0.96)",
  },
  submenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  submenuTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: 216,
    paddingBottom: 2,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  colorSwatchWhite: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#d1d5db",
  },
  highlightGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: 152,
    paddingBottom: 2,
  },
  highlightSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  highlightSwatchNone: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#d1d5db",
  },
  fontSizePanel: {
    gap: 4,
    paddingBottom: 2,
  },
  fontSizeStepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  fontSizeValue: {
    minWidth: 40,
    textAlign: "center",
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "600",
    color: "#374151",
  },
  fontSizeStepButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.45)",
  },
  fontSizeStepButtonDisabled: {
    opacity: 0.35,
  },
  fontSizeScroll: {
    flexGrow: 0,
    height: 32,
  },
  fontSizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fontSizeChip: {
    minWidth: 36,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.45)",
  },
  fontSizeChipActive: {
    backgroundColor: "rgba(37,99,235,0.12)",
    borderColor: "rgba(37,99,235,0.35)",
  },
  fontSizeChipText: {
    color: "#374151",
    fontWeight: "600",
  },
  linkPopupFloating: {
    position: "absolute",
    zIndex: 60,
    elevation: 60,
  },
  linkPopupCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    padding: 12,
    gap: 10,
    width: "100%",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  linkFieldInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  linkPopupFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  linkHintText: {
    flex: 1,
    fontSize: 13,
    color: "#6b7280",
  },
  linkApplyButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  linkApplyButtonDisabled: {
    opacity: 0.45,
  },
  linkApplyText: {
    fontSize: 15,
    color: "#ffffff",
    fontWeight: "600",
  },
});
