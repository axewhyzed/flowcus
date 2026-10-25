import { filterVisibleTasks } from '../src/screens/taskFilters';
import { Task } from '../src/redux/slices/tasks';

const tasks: Task[] = [
  { taskId: 1, title: 'Work task', taskCategoryId: 1, isDeleted: false, isCompleted: false },
  { taskId: 2, title: 'Home task', taskCategoryId: 2, isDeleted: false, isCompleted: true },
  { taskId: 3, title: 'Deleted task', taskCategoryId: 1, isDeleted: true, isCompleted: false },
];

describe('filterVisibleTasks', () => {
  it('shows tasks from every category by default', () => {
    expect(filterVisibleTasks(tasks, null, 'all').map(task => task.taskId)).toEqual([1, 2]);
  });

  it('applies category, status, and deleted filters together', () => {
    expect(filterVisibleTasks(tasks, 1, 'active').map(task => task.taskId)).toEqual([1]);
    expect(filterVisibleTasks(tasks, 2, 'completed').map(task => task.taskId)).toEqual([2]);
  });
});
