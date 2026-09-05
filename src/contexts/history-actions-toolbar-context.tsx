import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { HistoryActionsHost } from "@/components/history-actions-host";

export type CalendarColorAction = {
  color: string;
  pickerOpen: boolean;
  onTogglePicker: () => void;
  onSelectColor: (color: string) => void;
  onClosePicker: () => void;
};

export type HistoryActionsRegistration = {
  bottom: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Re-focus the notes field on button touch so the keyboard stays visible. */
  onKeepKeyboardFocus?: () => void;
  calendarColor?: CalendarColorAction;
};

type HistoryActionsContextValue = {
  setRegistration: (registration: HistoryActionsRegistration | null) => void;
};

const HistoryActionsContext = createContext<HistoryActionsContextValue | null>(
  null,
);

export function HistoryActionsProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] =
    useState<HistoryActionsRegistration | null>(null);

  const contextValue = useMemo(
    () => ({
      setRegistration,
    }),
    [],
  );

  return (
    <HistoryActionsContext.Provider value={contextValue}>
      {children}
      <HistoryActionsHost registration={registration} />
    </HistoryActionsContext.Provider>
  );
}

/**
 * Registers a floating undo/redo pair anchored `bottom` px from the window's
 * bottom edge. Intended to be positioned just above the text-formatting
 * toolbar so the controls stay reachable while editing, independent of
 * scroll position.
 */
export function useHistoryActionsRegistration(
  visible: boolean,
  bottom: number,
  canUndo: boolean,
  canRedo: boolean,
  onUndo: () => void,
  onRedo: () => void,
  onKeepKeyboardFocus?: () => void,
  calendarColor?: CalendarColorAction,
) {
  const context = useContext(HistoryActionsContext);
  const handlersRef = useRef({ onUndo, onRedo, onKeepKeyboardFocus });
  const calendarColorRef = useRef(calendarColor);
  handlersRef.current = { onUndo, onRedo, onKeepKeyboardFocus };
  calendarColorRef.current = calendarColor;

  if (!context) {
    throw new Error(
      "useHistoryActionsRegistration must be used within HistoryActionsProvider",
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
      canUndo,
      canRedo,
      onUndo: () => handlersRef.current.onUndo(),
      onRedo: () => handlersRef.current.onRedo(),
      onKeepKeyboardFocus: () => handlersRef.current.onKeepKeyboardFocus?.(),
      calendarColor: calendarColorRef.current
        ? {
            color: calendarColorRef.current.color,
            pickerOpen: calendarColorRef.current.pickerOpen,
            onTogglePicker: () => calendarColorRef.current?.onTogglePicker(),
            onSelectColor: (color: string) =>
              calendarColorRef.current?.onSelectColor(color),
            onClosePicker: () => calendarColorRef.current?.onClosePicker(),
          }
        : undefined,
    });

    return () => {
      setRegistration(null);
    };
  }, [
    visible,
    bottom,
    canUndo,
    canRedo,
    calendarColor?.color,
    calendarColor?.pickerOpen,
    setRegistration,
  ]);
}
