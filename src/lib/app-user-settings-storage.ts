import { betterAuthExpoStorage } from "@/lib/better-auth-storage";

const STORAGE_KEY = "todolist_app_user_settings_v1";

export type AppUserSettings = {
  subtasksEnabled: boolean;
};

const DEFAULT_SETTINGS: AppUserSettings = {
  subtasksEnabled: false,
};

function parseSettings(raw: string | null): AppUserSettings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<AppUserSettings>;
    return {
      subtasksEnabled: parsed.subtasksEnabled === true,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function loadAppUserSettings(): Promise<AppUserSettings> {
  const raw = await betterAuthExpoStorage.getItemAsync(STORAGE_KEY);
  return parseSettings(raw);
}

export async function saveAppUserSettings(
  settings: AppUserSettings,
): Promise<void> {
  await betterAuthExpoStorage.setItemAsync(
    STORAGE_KEY,
    JSON.stringify(settings),
  );
}
