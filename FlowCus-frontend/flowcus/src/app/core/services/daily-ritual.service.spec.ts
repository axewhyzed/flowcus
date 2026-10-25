import { AuthService } from './auth.service';
import { DailyRitualService } from './daily-ritual.service';

describe('DailyRitualService', () => {
  let authState: { user: { id: number } | null };
  let service: DailyRitualService;

  beforeEach(() => {
    localStorage.clear();
    authState = { user: { id: 12 } };
    service = new DailyRitualService(authState as unknown as AuthService);
  });

  it('uses the local calendar date for a ritual key', () => {
    expect(service.getTodayKey(new Date(2026, 9, 24, 0, 15))).toBe('2026-10-24');
  });

  it('scopes ritual completion to the signed-in user', () => {
    service.completeMorningKickoff();
    expect(service.isMorningKickoffCompletedToday()).toBeTrue();

    authState.user = { id: 13 };
    expect(service.isMorningKickoffCompletedToday()).toBeFalse();
  });
});
