export interface Task {
  taskId: number;
  taskCategoryId: number;
  taskSubtypeId?: number | null;
  title?: string;
  description?: string | null;
  priority?: number | null;
  createdBy: number;
  createdOn: string;
  updatedOn?: string;
  completedOn?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationSeconds?: number;
  isCompleted?: boolean;
  isDeleted: boolean;
}

export type TaskPatch = Partial<Pick<
  Task,
  'title' | 'description' | 'priority' | 'taskCategoryId' | 'taskSubtypeId' | 'startTime' | 'endTime' | 'isCompleted'
>>;

export interface TaskCreateResponse {
  id: number;
  message: string;
}
