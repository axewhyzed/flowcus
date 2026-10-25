import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { createTask, fetchTasks } from '../redux/slices/tasks';
import { fetchDashboardStats } from '../redux/slices/dashboard';
import { loadFocusSession, saveFocusSession, clearFocusSession, PersistedFocusSession, toFocusTaskPayload } from '../services/focusSessionStorage';

/** Completes an expired timer and safely retries a saved focus log after restart. */
const FocusSessionRecovery = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const inProgress = useRef(false);

  const recover = useCallback(async () => {
    if (!isAuthenticated || !user?.id || inProgress.current) return;
    inProgress.current = true;
    try {
      const saved = await loadFocusSession(user.id);
      if (!saved || saved.userId !== user.id) return;

      let pending: PersistedFocusSession | null = saved.status === 'pendingLog' ? saved : null;
      if (saved.status === 'running' && saved.targetEndAt && saved.targetEndAt <= Date.now()) {
        pending = {
          ...saved,
          status: 'pendingLog',
          targetEndAt: null,
          remainingSeconds: 0,
          elapsedMinutes: Math.max(1, Math.round(saved.totalSeconds / 60)),
          endedAt: saved.targetEndAt,
        };
        await saveFocusSession(pending);
      }
      if (!pending) return;

      await dispatch(createTask({
        idempotencyKey: pending.sessionId,
        task: toFocusTaskPayload(pending),
      })).unwrap();
      await clearFocusSession(pending.userId);
      dispatch(fetchDashboardStats());
      dispatch(fetchTasks());
    } catch {
      // Keep the same persisted UUID and payload for a safe retry next time.
    } finally {
      inProgress.current = false;
    }
  }, [dispatch, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void recover();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void recover();
    });
    return () => subscription.remove();
  }, [isAuthenticated, recover]);

  return null;
};

export default FocusSessionRecovery;
