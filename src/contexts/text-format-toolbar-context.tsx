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
  TextFontSizeOption,
  TextFormatAction,
} from "@/lib/text-format";

export type TextFormatToolbarHandlers = {
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
  /** Re-focus the notes field on toolbar touch so the keyboard stays visible. */
  onKeepKeyboardFocus?: () => void;
};

export type TextFormatToolbarRegistration = TextFormatToolbarHandlers & {
  bottom: number;
  selectionHighlightColor?: string | null;
  selectionFontSize?: number | null;
  selectionBoldActive?: boolean;
  selectionFontFamily?: string | null;
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
  selectionBoldActive = false,
  selectionFontFamily: string | null = null,
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
      selectionBoldActive,
      selectionFontFamily,
      onFormat: (action, options) => handlersRef.current.onFormat(action, options),
      onDismiss: () => handlersRef.current.onDismiss(),
      onKeepKeyboardFocus: () => handlersRef.current.onKeepKeyboardFocus?.(),
    });

    return () => {
      setRegistration(null);
    };
  }, [
    visible,
    bottom,
    selectionHighlightColor,
    selectionFontSize,
    selectionBoldActive,
    selectionFontFamily,
    setRegistration,
  ]);
}
