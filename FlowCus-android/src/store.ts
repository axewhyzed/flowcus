// store.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import { createKeychainStorage } from 'redux-persist-keychain-storage';
import authReducer from './slices/auth';

// Initialize keychain storage without arguments
const keychainStorage = createKeychainStorage();

const persistConfig = {
  key: 'auth',
  storage: keychainStorage,
  keyPrefix: 'com.flowcus.persist.', // Your bundle‑ID style prefix
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: { auth: persistedAuthReducer },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist action types that contain non-serializable values
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const persistor = persistStore(store);