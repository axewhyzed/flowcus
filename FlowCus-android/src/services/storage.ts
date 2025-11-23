// src/services/storage.ts
import * as Keychain from 'react-native-keychain';

interface AuthData {
  accessToken: string;
  refreshToken: string;
}

export const saveAuth = async (data: AuthData) => {
  await Keychain.setGenericPassword('auth', JSON.stringify(data));
};

export const getAuth = async (): Promise<AuthData | null> => {
  try {
    const credentials = await Keychain.getGenericPassword();
    if (credentials) {
      return JSON.parse(credentials.password);
    }
    return null;
  } catch (error) {
    console.error('Keychain Access Error:', error);
    return null;
  }
};

export const clearAuth = async () => {
  await Keychain.resetGenericPassword();
};