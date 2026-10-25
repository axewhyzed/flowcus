import AsyncStorage from '@react-native-async-storage/async-storage';

export type PersistedFocusStatus = 'running' | 'paused' | 'pendingLog';

export interface PersistedFocusSession {
  userId: number;
  sessionId: string;
  status: PersistedFocusStatus;
  title: string;
  categoryId: number;
  startedAt: number;
  targetEndAt: number | null;
  totalSeconds: number;
  remainingSeconds: number;
  elapsedMinutes?: number;
  endedAt?: number;
}

export function toFocusTaskPayload(session: PersistedFocusSession) {
  const elapsedMinutes = session.elapsedMinutes || 1;
  return {
    title: session.title.trim() || `Focus Session (${elapsedMinutes}m)`,
    description: `Completed ${elapsedMinutes}m focus sprint.`,
    taskCategoryId: session.categoryId,
    priority: 3,
    isCompleted: true,
    isDeleted: false,
    startTime: new Date(session.startedAt).toISOString(),
    endTime: new Date(session.endedAt ?? session.targetEndAt ?? session.startedAt + session.totalSeconds * 1000).toISOString(),
  };
}

const storageKey = (userId: number) => `flowcus.activeFocusSession.v1:${userId}`;

export function createFocusSessionId(random = Math.random): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, token => {
    const value = Math.floor(random() * 16);
    return (token === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });
}

export async function loadFocusSession(userId: number): Promise<PersistedFocusSession | null> {
  const key = storageKey(userId);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedFocusSession;
  } catch {
    await AsyncStorage.removeItem(key);
    return null;
  }
}

export async function saveFocusSession(session: PersistedFocusSession): Promise<void> {
  await AsyncStorage.setItem(storageKey(session.userId), JSON.stringify(session));
}

export async function clearFocusSession(userId: number): Promise<void> {
  await AsyncStorage.removeItem(storageKey(userId));
}
