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

export type HistoryActionsRegistration = {
  bottom: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Re-focus the notes field on button touch so the keyboard stays visible. */
  onKeepKeyboardFocus?: () => void;
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
) {
  const context = useContext(HistoryActionsContext);
  const handlersRef = useRef({ onUndo, onRedo, onKeepKeyboardFocus });
  handlersRef.current = { onUndo, onRedo, onKeepKeyboardFocus };

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
    });

    return () => {
      setRegistration(null);
    };
  }, [visible, bottom, canUndo, canRedo, setRegistration]);
}
