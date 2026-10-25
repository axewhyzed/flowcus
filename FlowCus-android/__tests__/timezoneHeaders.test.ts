import { getClientTimezoneHeaders } from '../src/services/timezoneHeaders';
import * as timezoneHeaderService from '../src/services/timezoneHeaders';

jest.mock('../src/services/storage', () => ({
  getAuth: jest.fn().mockResolvedValue(null),
  clearAuth: jest.fn(),
}));

import apiClient from '../src/services/apiClient';

describe('client timezone headers', () => {
  it('sends an IANA timezone ID for calendar-based backend operations', () => {
    const now = new Date('2026-10-24T12:00:00.000Z');
    const headers = getClientTimezoneHeaders(now, () => 'Asia/Kolkata');

    expect(headers['X-Timezone-Id']).toBe('Asia/Kolkata');
    expect(headers['X-Timezone-Id']).not.toMatch(/^-?\d+$/);
    expect(headers['X-Timezone-Offset']).toBe(now.getTimezoneOffset().toString());
  });

  it('omits the IANA ID when the runtime has no timezone but always sends the offset', () => {
    const now = new Date('2026-10-24T12:00:00.000Z');
    const headers = getClientTimezoneHeaders(now, () => '');

    expect(headers).not.toHaveProperty('X-Timezone-Id');
    expect(headers['X-Timezone-Offset']).toBe(now.getTimezoneOffset().toString());
  });

  it('falls back to the offset if timezone resolution throws', () => {
    const now = new Date('2026-10-24T12:00:00.000Z');
    const headers = getClientTimezoneHeaders(now, () => { throw new Error('timezone unavailable'); });

    expect(headers).not.toHaveProperty('X-Timezone-Id');
    expect(headers['X-Timezone-Offset']).toBe(now.getTimezoneOffset().toString());
  });

  it('attaches the IANA timezone ID to the API request interceptor', async () => {
    const interceptors = apiClient.interceptors.request as unknown as {
      handlers: Array<{ fulfilled?: (config: never) => Promise<{ headers: Record<string, string> }> }>;
    };
    const requestHandler = interceptors.handlers[0].fulfilled;
    if (!requestHandler) throw new Error('API request interceptor is not registered.');
    const request = await requestHandler({ url: '/tasks/rollover-yesterday', headers: {} } as never);

    const timezoneId = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezoneId) expect(request.headers['X-Timezone-Id']).toBe(timezoneId);
    else expect(request.headers).not.toHaveProperty('X-Timezone-Id');
    expect(request.headers['X-Timezone-Offset']).toBe(new Date().getTimezoneOffset().toString());
  });

  it('omits an unavailable timezone ID from the outgoing request and preserves the offset', async () => {
    const spy = jest.spyOn(timezoneHeaderService, 'getClientTimezoneHeaders').mockReturnValue({
      'X-Timezone-Offset': '240',
    });
    const interceptors = apiClient.interceptors.request as unknown as {
      handlers: Array<{ fulfilled?: (config: never) => Promise<{ headers: Record<string, string> }> }>;
    };
    const requestHandler = interceptors.handlers[0].fulfilled;
    if (!requestHandler) throw new Error('API request interceptor is not registered.');

    try {
      const request = await requestHandler({
        url: '/tasks/rollover-yesterday',
        headers: { 'X-Timezone-Id': 'UTC' },
      } as never);

      expect(request.headers).not.toHaveProperty('X-Timezone-Id');
      expect(request.headers['X-Timezone-Offset']).toBe('240');
    } finally {
      spy.mockRestore();
    }
  });
});
