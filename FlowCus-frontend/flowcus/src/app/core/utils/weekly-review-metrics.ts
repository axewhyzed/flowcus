import { Task } from '../models/task.model';

export function countCompletionsInLastSevenDays(tasks: Task[], now = new Date()): number {
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  return tasks.filter(task => {
    if (task.isDeleted || !task.isCompleted || !task.completedOn) return false;
    const completedAt = new Date(task.completedOn);
    return !Number.isNaN(completedAt.getTime()) && completedAt >= weekStart && completedAt <= now;
  }).length;
}
