import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface AppPreferences {
  theme: ThemePreference;
  notificationsEnabled: boolean;
  hapticsEnabled: boolean;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  theme: 'system',
  notificationsEnabled: true,
  hapticsEnabled: true,
};

const STORAGE_KEY = 'flowcus.preferences.v1';

export async function loadPreferences(): Promise<AppPreferences> {
  try {
    const serialized = await AsyncStorage.getItem(STORAGE_KEY);
    if (!serialized) return DEFAULT_PREFERENCES;
    const stored = JSON.parse(serialized) as Partial<AppPreferences>;
    return { ...DEFAULT_PREFERENCES, ...stored };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function persistPreferences(preferences: AppPreferences): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
