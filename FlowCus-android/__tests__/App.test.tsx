/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/components/navigation/RootNavigator', () => () => null);
jest.mock('redux-persist', () => ({
  persistReducer: (_config: unknown, reducer: unknown) => reducer,
  persistStore: jest.fn(() => ({
    getState: () => ({ bootstrapped: true }),
    subscribe: () => () => undefined,
    pause: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('../src/services/storage', () => ({
  getAuth: jest.fn().mockResolvedValue(null),
  clearAuth: jest.fn().mockResolvedValue(undefined),
  saveAuth: jest.fn().mockResolvedValue(undefined),
}));

import App from '../App';
import { persistor } from '../src/redux/store';

test('renders correctly', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    await Promise.resolve();
  });
  await ReactTestRenderer.act(async () => {
    renderer?.unmount();
  });
});

afterAll(async () => {
  persistor.pause();
  await persistor.flush();
});
