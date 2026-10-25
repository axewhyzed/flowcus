import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearFocusSession, createFocusSessionId, loadFocusSession, PersistedFocusSession, saveFocusSession, toFocusTaskPayload } from '../src/services/focusSessionStorage';

const record: PersistedFocusSession = {
  userId: 7,
  sessionId: '123e4567-e89b-42d3-a456-426614174000',
  status: 'running',
  title: 'Write report',
  categoryId: 2,
  startedAt: 1000,
  targetEndAt: 61000,
  totalSeconds: 60,
  remainingSeconds: 60,
};

describe('focus session persistence', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('persists active and pending-log states across screen remounts', async () => {
    await saveFocusSession(record);
    expect(await loadFocusSession(record.userId)).toEqual(record);
    const pending = { ...record, status: 'pendingLog' as const, targetEndAt: null, endedAt: 61000, elapsedMinutes: 1 };
    await saveFocusSession(pending);
    expect(await loadFocusSession(record.userId)).toEqual(pending);
    expect(await loadFocusSession(record.userId + 1)).toBeNull();
    await clearFocusSession(record.userId);
    expect(await loadFocusSession(record.userId)).toBeNull();
  });

  it('creates a UUID v4 suitable for the task API idempotency header', () => {
    const id = createFocusSessionId(() => 0.65);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('creates a stable task payload for retries of the same idempotency key', () => {
    const pending = { ...record, status: 'pendingLog' as const, targetEndAt: null, endedAt: 61000, elapsedMinutes: 1 };
    expect(toFocusTaskPayload(pending)).toEqual(toFocusTaskPayload(pending));
    expect(toFocusTaskPayload(pending)).toMatchObject({ isCompleted: true, taskCategoryId: 2, endTime: new Date(61000).toISOString() });
  });
});
