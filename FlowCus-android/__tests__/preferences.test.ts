import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PREFERENCES, loadPreferences, persistPreferences } from '../src/services/preferences';

describe('app preferences', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('uses safe defaults and persists appearance and feature controls', async () => {
    expect(await loadPreferences()).toEqual(DEFAULT_PREFERENCES);
    const saved = { ...DEFAULT_PREFERENCES, theme: 'dark' as const, notificationsEnabled: false, hapticsEnabled: false };
    await persistPreferences(saved);
    expect(await loadPreferences()).toEqual(saved);
  });
});
