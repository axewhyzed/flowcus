import { Task } from '../redux/slices/tasks';

export interface WeeklyFocusDay {
  key: string;
  label: string;
  minutes: number;
}

export interface TaskAnalytics {
  completedMinutes: number;
  averageSessionMinutes: number;
  completionRate: number;
  streakDays: number;
  weeklyFocus: WeeklyFocusDay[];
}

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function calculateTaskAnalytics(tasks: Task[], now = new Date()): TaskAnalytics {
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const startOfWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();
  const dayBuckets = new Map<string, WeeklyFocusDay>();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const key = localDayKey(date);
    dayBuckets.set(key, { key, label: date.toLocaleDateString(undefined, { weekday: 'short' }), minutes: 0 });
  }

  const completedDurations: number[] = [];
  const completionDates = new Set<string>();
  let completedInWindow = 0;
  let totalInWindow = 0;

  tasks.filter(task => !task.isDeleted).forEach(task => {
    const createdAt = task.createdOn ? new Date(task.createdOn).getTime() : NaN;
    const completionTime = task.completedOn ? new Date(task.completedOn).getTime() : NaN;
    if (Number.isFinite(createdAt) && createdAt >= startOfWindow && createdAt < endOfToday) {
      totalInWindow += 1;
      if (task.isCompleted) completedInWindow += 1;
    }

    if (!task.isCompleted || !Number.isFinite(completionTime)) return;
    completionDates.add(localDayKey(new Date(completionTime)));

    // Streaks count completed tasks, including unscheduled tasks. Only tasks
    // with a valid, bounded start/end interval contribute to focus-time charts.
    if (!task.startTime || !task.endTime) return;
    const startedAt = new Date(task.startTime).getTime();
    const endedAt = new Date(task.endTime).getTime();
    if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt <= startedAt) return;

    const duration = Math.round((endedAt - startedAt) / 60000);
    if (duration <= 0 || duration > 12 * 60) return;
    const dateKey = localDayKey(new Date(completionTime));
    if (completionTime >= startOfWindow && completionTime < endOfToday) completedDurations.push(duration);
    const bucket = dayBuckets.get(dateKey);
    if (bucket) bucket.minutes += duration;
  });

  let streakDays = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!completionDates.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (completionDates.has(localDayKey(cursor))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    completedMinutes: completedDurations.reduce((sum, minutes) => sum + minutes, 0),
    averageSessionMinutes: completedDurations.length
      ? Math.round(completedDurations.reduce((sum, minutes) => sum + minutes, 0) / completedDurations.length)
      : 0,
    completionRate: totalInWindow ? Math.round((completedInWindow / totalInWindow) * 100) : 0,
    streakDays,
    weeklyFocus: Array.from(dayBuckets.values()),
  };
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
