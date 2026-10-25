import { calculateTaskAnalytics, formatDuration } from '../src/screens/analyticsModel';
import { Task } from '../src/redux/slices/tasks';

describe('task analytics', () => {
  const now = new Date(2026, 9, 24, 12, 0, 0);
  const tasks: Task[] = [
    {
      taskId: 1, title: 'Today', taskCategoryId: 1, isDeleted: false, isCompleted: true,
      createdOn: new Date(2026, 9, 24, 8).toISOString(),
      startTime: new Date(2026, 9, 24, 9).toISOString(), endTime: new Date(2026, 9, 24, 9, 30).toISOString(),
      completedOn: new Date(2026, 9, 24, 9, 30).toISOString(),
    },
    {
      taskId: 2, title: 'Yesterday', taskCategoryId: 1, isDeleted: false, isCompleted: true,
      createdOn: new Date(2026, 9, 23, 8).toISOString(),
      startTime: new Date(2026, 9, 23, 10).toISOString(), endTime: new Date(2026, 9, 23, 11).toISOString(),
      completedOn: new Date(2026, 9, 23, 11).toISOString(),
    },
    {
      taskId: 3, title: 'Old', taskCategoryId: 1, isDeleted: false, isCompleted: true,
      createdOn: new Date(2026, 9, 1, 8).toISOString(),
      startTime: new Date(2026, 9, 1, 10).toISOString(), endTime: new Date(2026, 9, 1, 11).toISOString(),
      completedOn: new Date(2026, 9, 1, 11).toISOString(),
    },
    { taskId: 4, title: 'Open', taskCategoryId: 1, isDeleted: false, isCompleted: false, createdOn: new Date(2026, 9, 24, 7).toISOString() },
  ];

  it('uses actual completion times for current-week duration metrics', () => {
    const result = calculateTaskAnalytics(tasks, now);
    expect(result.completedMinutes).toBe(90);
    expect(result.averageSessionMinutes).toBe(45);
    expect(result.completionRate).toBe(67);
    expect(result.weeklyFocus).toHaveLength(7);
    expect(result.weeklyFocus[6].minutes).toBe(30);
    expect(result.streakDays).toBe(2);
  });

  it('counts completed unscheduled tasks toward streaks but not focus duration', () => {
    const unscheduled: Task[] = [
      {
        taskId: 10, title: 'Today, no schedule', taskCategoryId: 1, isDeleted: false, isCompleted: true,
        completedOn: new Date(2026, 9, 24, 11).toISOString(),
      },
      {
        taskId: 11, title: 'Yesterday, no schedule', taskCategoryId: 1, isDeleted: false, isCompleted: true,
        completedOn: new Date(2026, 9, 23, 11).toISOString(),
      },
      {
        taskId: 12, title: 'No completion timestamp', taskCategoryId: 1, isDeleted: false, isCompleted: true,
        endTime: new Date(2026, 9, 24, 10).toISOString(),
      },
      {
        taskId: 13, title: 'Deleted', taskCategoryId: 1, isDeleted: true, isCompleted: true,
        completedOn: new Date(2026, 9, 24, 11).toISOString(),
      },
    ];
    const result = calculateTaskAnalytics(unscheduled, now);

    expect(result.streakDays).toBe(2);
    expect(result.completedMinutes).toBe(0);
    expect(result.weeklyFocus.every(day => day.minutes === 0)).toBe(true);
  });

  it('does not fall back to end time when the completion timestamp is missing', () => {
    const missingCompletion: Task[] = [{
      taskId: 20, title: 'Legacy task', taskCategoryId: 1, isDeleted: false, isCompleted: true,
      startTime: new Date(2026, 9, 24, 9).toISOString(), endTime: new Date(2026, 9, 24, 10).toISOString(),
    }];
    const result = calculateTaskAnalytics(missingCompletion, now);

    expect(result.streakDays).toBe(0);
    expect(result.completedMinutes).toBe(0);
  });

  it('formats duration without hardcoded example metrics', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(75)).toBe('1h 15m');
  });
});
