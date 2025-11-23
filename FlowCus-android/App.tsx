// App.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import tw from 'twrnc';

// Import Store & Types
import { store, persistor, AppDispatch, RootState } from './src/redux/store';
import RootNavigator from './src/components/navigation/RootNavigator';
import { restoreSession } from './src/redux/slices/auth';

const AppContent = () => {
  const dispatch = useDispatch<AppDispatch>();
  // Check global loading state to prevent flickering
  const { isLoading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    debugger;
    dispatch(restoreSession());
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;