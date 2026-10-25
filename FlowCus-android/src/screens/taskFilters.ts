import { Task } from '../redux/slices/tasks';

export type TaskStatusFilter = 'all' | 'active' | 'completed';

export function filterVisibleTasks(tasks: Task[], categoryId: number | null, status: TaskStatusFilter): Task[] {
  return tasks.filter(task => {
    if (task.isDeleted) return false;
    if (categoryId !== null && task.taskCategoryId !== categoryId) return false;
    if (status === 'active') return !task.isCompleted;
    if (status === 'completed') return Boolean(task.isCompleted);
    return true;
  });
}
