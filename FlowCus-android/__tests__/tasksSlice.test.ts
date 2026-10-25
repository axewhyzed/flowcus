jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

import apiClient from '../src/services/apiClient';
import tasksReducer, { createTask, fetchTasks } from '../src/redux/slices/tasks';

describe('createTask', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends a stable idempotency key and preserves completed focus logs locally', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { id: 42, message: 'Created' } });
    const task = {
      title: 'Focus Session', taskCategoryId: 1, isCompleted: true,
      isDeleted: false, startTime: '2026-10-24T10:00:00.000Z', endTime: '2026-10-24T10:25:00.000Z',
    };
    const actions: unknown[] = [];
    const dispatch = (action: unknown) => {
      actions.push(action);
      return action as never;
    };
    const result = await createTask({ task, idempotencyKey: '123e4567-e89b-42d3-a456-426614174000' })(
      dispatch,
      () => ({} as never),
      undefined,
    );

    expect(apiClient.post).toHaveBeenCalledWith('/tasks', task, {
      headers: { 'Idempotency-Key': '123e4567-e89b-42d3-a456-426614174000' },
    });
    expect(result.payload).toMatchObject({ taskId: 42, isCompleted: true });
    expect(tasksReducer(undefined, result as never).list[0].isCompleted).toBe(true);
    expect(actions.length).toBe(2);
  });
});

describe('task loading state', () => {
  it('clears the loading state and exposes fetch errors for retry UI', () => {
    const loading = tasksReducer(undefined, fetchTasks.pending('request-1'));
    expect(loading.isLoading).toBe(true);

    const failed = tasksReducer(loading, fetchTasks.rejected(new Error('offline'), 'request-1'));
    expect(failed.isLoading).toBe(false);
    expect(failed.error).toBe('offline');
  });
});
