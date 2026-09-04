import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AppSymbol } from "@/components/app-symbol";
import { FluentClearFormattingIcon } from "@/components/fluent-clear-formatting-icon";
import { LiquidGlassSurface } from "@/components/liquid-glass-surface";
import { PiHighlighterLightIcon } from "@/components/pi-highlighter-light-icon";
import { ThemedText } from "@/components/themed-text";
import { pickToolbarPreviewFontFamily } from "@/lib/detail-fonts-mobile";
import {
  TEXT_BLOCK_OPTIONS,
  TEXT_COLOR_OPTIONS,
  TEXT_FONT_SIZE_OPTIONS,
  TEXT_HIGHLIGHT_OPTIONS,
  getTextFormatFontFamilyOptions,
  type TextBlockType,
  type TextFontSizeOption,
  type TextFormatAction,
} from "@/lib/text-format";

// Rendered height of the floating toolbar's pill (button height + the
// content row's vertical padding). Used by callers that need to anchor
// other floating UI (e.g. undo/redo) relative to the toolbar's top edge
// without needing to measure it at runtime.
export const TEXT_FORMAT_TOOLBAR_HEIGHT = 49;

type TextFormatToolbarProps = {
  visible: boolean;
  layout?: "floating" | "accessory";
  variant?: "solid" | "glass";
  bottom?: number;
  onFormat: (
    action: TextFormatAction,
    options?: {
      linkUrl?: string;
      color?: string;
      highlightColor?: string;
      fontSize?: TextFontSizeOption;
      blockType?: TextBlockType;
      fontFamily?: string;
    },
  ) => void;
  onDismiss: () => void;
  onKeepKeyboardFocus?: () => void;
  selectionHighlightColor?: string | null;
  selectionFontSize?: number | null;
  selectionBoldActive?: boolean;
  selectionFontFamily?: string | null;
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
  | "blockType"
  | "fontFamily"
  | "overflow"
  | null;

const FONT_FAMILY_OPTIONS = getTextFormatFontFamilyOptions();
const DEFAULT_FONT_FAMILY_ID = FONT_FAMILY_OPTIONS[0]?.id ?? "inter";
const DEFAULT_FONT_SIZE_DISPLAY = 17;

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

function FormatSubmenu({
  kind,
  variant,
  onSelectColor,
  onSelectHighlight,
  onSelectFontSize,
  onSelectBlockType,
  onSelectFontFamily,
  onOverflowAction,
  onClose,
  onKeepKeyboardFocus,
  selectedFontFamily = null,
  fontFamilyScrollRef,
}: {
  kind: SubmenuKind;
  variant: "solid" | "glass";
  onSelectColor: (color: string) => void;
  onSelectHighlight: (color: string) => void;
  onSelectFontSize: (size: TextFontSizeOption) => void;
  onSelectBlockType: (blockType: TextBlockType) => void;
  onSelectFontFamily: (fontFamily: string) => void;
  onOverflowAction: (action: Extract<TextFormatAction, "italic" | "strikethrough" | "code">) => void;
  onClose: () => void;
  onKeepKeyboardFocus?: () => void;
  selectedFontFamily?: string | null;
  fontFamilyScrollRef?: React.RefObject<ScrollView | null>;
}) {
  if (!kind) return null;

  const keepFocus = keepKeyboardFocusHandlers(onKeepKeyboardFocus);

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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.fontSizeRow}
          keyboardShouldPersistTaps="always">
          {TEXT_FONT_SIZE_OPTIONS.map((size) => (
            <Pressable
              key={size}
              style={styles.fontSizeChip}
              accessibilityRole="button"
              accessibilityLabel={`Font size ${size}`}
              onPress={() => onSelectFontSize(size)}
              {...keepFocus}>
              <ThemedText style={[styles.fontSizeChipText, { fontSize: Math.min(size, 18) }]}>
                {size}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
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
          style={[styles.boldLetter, selectionBoldActive && styles.formatLetterActive]}
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
        label="Highlight"
        active={activeSubmenu === "highlight"}
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        onPress={() =>
          onOpenSubmenu(activeSubmenu === "highlight" ? null : "highlight")
        }>
        <PiHighlighterLightIcon size={21} color="#374151" />
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
        label="Checklist item"
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        onPress={() => onFormat("checklist")}>
        <AppSymbol
          ios="checkmark.circle"
          android="check-circle-outline"
          size={21}
          tintColor="#374151"
        />
      </FormatButton>

      <FormatButton
        variant={variant}
        label="Add link"
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        onPress={onOpenLinkEditor}>
        <AppSymbol ios="link" android="link" size={21} tintColor="#374151" />
      </FormatButton>

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
          size={21}
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
          size={21}
          tintColor="#374151"
        />
      </FormatButton>

      <FormatButton
        variant={variant}
        label="Clear formatting"
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        onPress={() => onFormat("clearFormatting")}>
        <FluentClearFormattingIcon size={21} color="#374151" />
      </FormatButton>

      <FormatButton
        variant={variant}
        label="Underline"
        onKeepKeyboardFocus={onKeepKeyboardFocus}
        onPress={() => onFormat("underline")}>
        <FormatLetter letter="U" style={styles.underlineLetter} />
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
  selectionHighlightColor = null,
  selectionFontSize = null,
  selectionBoldActive = false,
  selectionFontFamily = null,
}: TextFormatToolbarProps) {
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuKind>(null);
  const scrollRef = useRef<ScrollView>(null);
  const fontFamilyScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) {
      setActiveSubmenu(null);
    }
  }, [visible]);

  useEffect(() => {
    if (activeSubmenu !== "fontFamily") return;
    requestAnimationFrame(() => {
      fontFamilyScrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [activeSubmenu]);

  const closeLinkEditor = () => {
    setLinkEditorOpen(false);
    setLinkUrl("");
  };

  const handleLinkApply = () => {
    onFormat("link", { linkUrl });
    closeLinkEditor();
  };

  const handleOpenSubmenu = (kind: SubmenuKind) => {
    setActiveSubmenu(kind);
    if (kind === "fontSize" || kind === "fontFamily" || kind === "overflow") {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    }
  };

  const linkEditorBody = (
    <>
      <ThemedText style={styles.linkTitle}>Add link</ThemedText>
      <TextInput
        value={linkUrl}
        onChangeText={setLinkUrl}
        placeholder="Paste or type a link"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={[
          styles.linkInput,
          variant === "glass" && styles.linkInputGlass,
        ]}
        autoFocus
      />
      <View style={styles.linkActions}>
        <Pressable style={styles.linkCancel} onPress={closeLinkEditor}>
          <ThemedText style={styles.linkCancelText}>Cancel</ThemedText>
        </Pressable>
        <Pressable style={styles.linkApply} onPress={handleLinkApply}>
          <ThemedText style={styles.linkApplyText}>Apply</ThemedText>
        </Pressable>
      </View>
    </>
  );

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
              onOpenLinkEditor={() => setLinkEditorOpen(true)}
              onOpenSubmenu={handleOpenSubmenu}
              activeSubmenu={activeSubmenu}
              scrollRef={scrollRef}
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
              onOpenLinkEditor={() => setLinkEditorOpen(true)}
              onOpenSubmenu={handleOpenSubmenu}
              activeSubmenu={activeSubmenu}
              scrollRef={scrollRef}
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

      <Modal
        visible={linkEditorOpen}
        transparent
        animationType="fade"
        onRequestClose={closeLinkEditor}>
        <Pressable style={styles.linkBackdrop} onPress={closeLinkEditor}>
          <Pressable onPress={() => undefined}>
            {variant === "glass" ? (
              <LiquidGlassSurface style={styles.linkCardGlass} borderRadius={16}>
                <View style={styles.linkCardGlassContent}>{linkEditorBody}</View>
              </LiquidGlassSurface>
            ) : (
              <View style={styles.linkCard}>{linkEditorBody}</View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  colorTrigger: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 18,
  },
  colorTriggerLetter: {
    fontSize: 19,
    fontWeight: "700",
    color: "#374151",
    lineHeight: 21,
  },
  colorTriggerBar: {
    width: 16,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  fontSizeTrigger: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  blockTypeTrigger: {
    fontSize: 18,
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
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    maxWidth: 72,
  },
  overflowTrigger: {
    fontSize: 20,
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
  fontSizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 2,
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
  fontSizeChipText: {
    color: "#374151",
    fontWeight: "600",
  },
  linkBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  linkCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  linkCardGlass: {
    padding: 16,
  },
  linkCardGlassContent: {
    gap: 12,
  },
  linkTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },
  linkInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
  },
  linkInputGlass: {
    backgroundColor: "rgba(255,255,255,0.45)",
    borderColor: "rgba(255,255,255,0.55)",
  },
  linkActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  linkCancel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  linkCancelText: {
    fontSize: 15,
    color: "#6b7280",
  },
  linkApply: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  linkApplyText: {
    fontSize: 15,
    color: "#ffffff",
    fontWeight: "600",
  },
});
