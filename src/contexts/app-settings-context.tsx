import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  loadAppUserSettings,
  saveAppUserSettings,
  type AppUserSettings,
} from "@/lib/app-user-settings-storage";

type AppSettingsContextValue = {
  ready: boolean;
  subtasksEnabled: boolean;
  setSubtasksEnabled: (enabled: boolean) => void;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<AppUserSettings>({
    subtasksEnabled: false,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadAppUserSettings();
      if (!cancelled) {
        setSettings(loaded);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSubtasksEnabled = useCallback((enabled: boolean) => {
    setSettings((current) => {
      const next = { ...current, subtasksEnabled: enabled };
      void saveAppUserSettings(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      ready,
      subtasksEnabled: settings.subtasksEnabled,
      setSubtasksEnabled,
    }),
    [ready, setSubtasksEnabled, settings.subtasksEnabled],
  );

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsContextValue {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used within AppSettingsProvider");
  }
  return context;
}
