import { Task } from '../models/task.model';
import { countCompletionsInLastSevenDays } from './weekly-review-metrics';

const task = (completedOn: string | null, isCompleted = true, isDeleted = false): Task => ({
  taskId: 1,
  taskCategoryId: 1,
  title: 'Task',
  createdBy: 1,
  createdOn: '2026-10-01T00:00:00Z',
  completedOn,
  isCompleted,
  isDeleted
});

describe('countCompletionsInLastSevenDays', () => {
  it('counts only non-deleted tasks completed in the local seven-day window', () => {
    const now = new Date('2026-10-24T12:00:00');
    const tasks = [
      task('2026-10-18T09:00:00'),
      task('2026-10-17T09:00:00'),
      task('2026-10-24T13:00:00'),
      task(null),
      task('2026-10-23T09:00:00', false),
      task('2026-10-23T09:00:00', true, true)
    ];

    expect(countCompletionsInLastSevenDays(tasks, now)).toBe(1);
  });
});
