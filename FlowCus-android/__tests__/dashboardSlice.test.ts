jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

import dashboardReducer, { fetchCurrentFocus, fetchDashboardStats } from '../src/redux/slices/dashboard';

describe('dashboard request states', () => {
  it('ends the stats refresh and exposes a retryable error after failure', () => {
    const pending = dashboardReducer(undefined, fetchDashboardStats.pending('stats-request'));
    expect(pending.isLoading).toBe(true);
    const failed = dashboardReducer(pending, fetchDashboardStats.rejected(new Error('offline'), 'stats-request'));
    expect(failed.isLoading).toBe(false);
    expect(failed.statsError).toBe('offline');
  });

  it('distinguishes a failed current-focus request from an empty schedule', () => {
    const pending = dashboardReducer(undefined, fetchCurrentFocus.pending('focus-request'));
    expect(pending.isCurrentFocusLoading).toBe(true);
    const failed = dashboardReducer(pending, fetchCurrentFocus.rejected(new Error('offline'), 'focus-request'));
    expect(failed.isCurrentFocusLoading).toBe(false);
    expect(failed.currentFocus).toBeNull();
    expect(failed.currentFocusError).toBe('offline');
  });
});
