jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));
jest.mock('../src/services/storage', () => ({
  getAuth: jest.fn(),
  saveAuth: jest.fn(),
  clearAuth: jest.fn(),
}));

import apiClient from '../src/services/apiClient';
import { clearAuth, getAuth } from '../src/services/storage';
import authReducer, { logout, restoreSession, sessionExpired } from '../src/redux/slices/auth';

const getAuthMock = getAuth as jest.Mock;
const clearAuthMock = clearAuth as jest.Mock;
const getMock = apiClient.get as jest.Mock;
const postMock = apiClient.post as jest.Mock;

describe('auth session restoration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps Keychain credentials after a transport failure', async () => {
    getAuthMock.mockResolvedValue({ accessToken: 'still-valid' });
    getMock.mockRejectedValue({ message: 'Network Error' });
    const result = await restoreSession()(() => undefined, () => ({} as never), undefined);
    expect(result.meta.requestStatus).toBe('rejected');
    expect(clearAuthMock).not.toHaveBeenCalled();
  });

  it('clears credentials after the server rejects the session', async () => {
    getAuthMock.mockResolvedValue({ accessToken: 'expired' });
    getMock.mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
    const result = await restoreSession()(() => undefined, () => ({} as never), undefined);
    expect(result.meta.requestStatus).toBe('rejected');
    expect(clearAuthMock).toHaveBeenCalledTimes(1);
  });

  it('clears Redux auth state when a protected request expires', () => {
    expect(authReducer(undefined, sessionExpired())).toMatchObject({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });
});

describe('logout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks the API to revoke the session and clears Keychain credentials', async () => {
    postMock.mockResolvedValue({ data: { message: 'Logged out' } });
    const result = await logout()(() => undefined, () => ({} as never), undefined);

    expect(result.meta.requestStatus).toBe('fulfilled');
    expect(postMock).toHaveBeenCalledWith('/auth/logout');
    expect(clearAuthMock).toHaveBeenCalledTimes(1);
  });

  it('still completes local logout when the API is unreachable', async () => {
    postMock.mockRejectedValue(new Error('offline'));
    const result = await logout()(() => undefined, () => ({} as never), undefined);

    expect(result.meta.requestStatus).toBe('fulfilled');
    expect(clearAuthMock).toHaveBeenCalledTimes(1);
  });
});
