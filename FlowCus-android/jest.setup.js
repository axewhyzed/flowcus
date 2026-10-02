import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock(
  '@env',
  () => ({
    API_URL: 'http://localhost:5000/api',
  }),
  { virtual: true }
);

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Mocks for gesture handler and reanimated
try {
  require('react-native-gesture-handler/jestSetup');
} catch (e) {}

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});
