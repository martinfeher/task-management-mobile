import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { TextFormatToolbarHost } from "@/components/text-format-toolbar-host";
import type {
  TextBlockType,
  TextFormatAction,
} from "@/lib/text-format";

export type TextFormatToolbarHandlers = {
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
  /** Re-focus the notes field on toolbar touch so the keyboard stays visible. */
  onKeepKeyboardFocus?: () => void;
  /** Called when the link editor popup opens or closes. */
  onLinkEditorOpenChange?: (open: boolean) => void;
};

export type TextFormatToolbarRegistration = TextFormatToolbarHandlers & {
  bottom: number;
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

type TextFormatToolbarContextValue = {
  setRegistration: (registration: TextFormatToolbarRegistration | null) => void;
};

const TextFormatToolbarContext = createContext<TextFormatToolbarContextValue | null>(
  null,
);

export function TextFormatToolbarProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] =
    useState<TextFormatToolbarRegistration | null>(null);

  const contextValue = useMemo(
    () => ({
      setRegistration,
    }),
    [],
  );

  return (
    <TextFormatToolbarContext.Provider value={contextValue}>
      {children}
      <TextFormatToolbarHost registration={registration} />
    </TextFormatToolbarContext.Provider>
  );
}

export function useTextFormatToolbarRegistration(
  visible: boolean,
  bottom: number,
  handlers: TextFormatToolbarHandlers,
  selectionHighlightColor: string | null = null,
  selectionFontSize: number | null = null,
  selectionLineHeight: number | null = null,
  selectionBoldActive = false,
  selectionFontFamily: string | null = null,
  selectionText: string | null = null,
  linkEditorOpen = false,
  canAdjustFontSize = false,
  canAdjustLineHeight = false,
) {
  const context = useContext(TextFormatToolbarContext);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  if (!context) {
    throw new Error(
      "useTextFormatToolbarRegistration must be used within TextFormatToolbarProvider",
    );
  }

  const { setRegistration } = context;

  useEffect(() => {
    if (!visible) {
      setRegistration(null);
      return;
    }

    setRegistration({
      bottom,
      selectionHighlightColor,
      selectionFontSize,
      selectionLineHeight,
      selectionBoldActive,
      selectionFontFamily,
      selectionText,
      linkEditorOpen,
      canAdjustFontSize,
      canAdjustLineHeight,
      onFormat: (action, options) => handlersRef.current.onFormat(action, options),
      onDismiss: () => handlersRef.current.onDismiss(),
      onKeepKeyboardFocus: () => handlersRef.current.onKeepKeyboardFocus?.(),
      onLinkEditorOpenChange: (open) =>
        handlersRef.current.onLinkEditorOpenChange?.(open),
    });

    return () => {
      setRegistration(null);
    };
  }, [
    visible,
    bottom,
    selectionHighlightColor,
    selectionFontSize,
    selectionLineHeight,
    selectionBoldActive,
    selectionFontFamily,
    selectionText,
    linkEditorOpen,
    canAdjustFontSize,
    canAdjustLineHeight,
    setRegistration,
  ]);
}
