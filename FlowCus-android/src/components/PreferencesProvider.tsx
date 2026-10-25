import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppPreferences, DEFAULT_PREFERENCES, loadPreferences, persistPreferences } from '../services/preferences';

interface PreferencesContextValue {
  preferences: AppPreferences;
  isLoaded: boolean;
  updatePreferences: (patch: Partial<AppPreferences>) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export const PreferencesProvider = ({ children }: React.PropsWithChildren) => {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const preferencesRef = useRef(preferences);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadPreferences().then((value) => {
      if (mounted) {
        preferencesRef.current = value;
        setPreferences(value);
        setIsLoaded(true);
      }
    });
    return () => { mounted = false; };
  }, []);

  const updatePreferences = useCallback(async (patch: Partial<AppPreferences>) => {
    const previous = preferencesRef.current;
    const next = { ...previous, ...patch };
    preferencesRef.current = next;
    setPreferences(next);
    try {
      await persistPreferences(next);
    } catch {
      preferencesRef.current = previous;
      setPreferences(previous);
      throw new Error('Could not save your preferences. Please try again.');
    }
  }, []);

  const value = useMemo(() => ({ preferences, isLoaded, updatePreferences }), [preferences, isLoaded, updatePreferences]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider');
  return value;
}
