export interface Task {
  taskId: number;
  taskCategoryId: number;
  taskSubtypeId?: number | null;
  title?: string;
  description?: string;
  priority?: number;
  createdBy: number;
  createdOn: string;
  updatedOn?: string;
  startTime?: string;
  endTime?: string;
  durationSeconds?: number;
  isDeleted: boolean;
}