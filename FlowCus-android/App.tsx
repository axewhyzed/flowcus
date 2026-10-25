// App.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import tw from 'twrnc';

// Import Store & Types
import { store, persistor, AppDispatch, RootState } from './src/redux/store';
import RootNavigator from './src/components/navigation/RootNavigator';
import { restoreSession } from './src/redux/slices/auth';
import { PreferencesProvider, usePreferences } from './src/components/PreferencesProvider';
import colors from './src/config/colors';
import FocusSessionRecovery from './src/components/FocusSessionRecovery';
import { reconcileBlockReminders } from './src/native/AlarmModule';

const AppContent = () => {
  const dispatch = useDispatch<AppDispatch>();
  // Check global loading state to prevent flickering
  const { isLoading } = useSelector((state: RootState) => state.auth);
  const systemColorScheme = useColorScheme();
  const { preferences, isLoaded: preferencesLoaded } = usePreferences();

  const isDark = preferences.theme === 'dark' || (preferences.theme === 'system' && systemColorScheme === 'dark');
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: colors.primary,
      background: isDark ? '#101418' : '#f5f7fa',
      card: isDark ? '#1a2229' : '#ffffff',
      text: isDark ? '#f4f7fa' : '#17212b',
      border: isDark ? '#34404a' : '#dce3e9',
      notification: colors.secondary,
    },
  };

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  useEffect(() => {
    if (!preferences.notificationsEnabled) {
      void reconcileBlockReminders([]).catch(error => console.warn('Could not cancel timetable reminders:', error));
    }
  }, [preferences.notificationsEnabled]);

  if (isLoading || !preferencesLoaded) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootNavigator />
      <FocusSessionRecovery />
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <PreferencesProvider>
            <AppContent />
          </PreferencesProvider>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
