export interface Task {
  taskId: number;
  taskCategoryId: number;
  taskSubtypeId?: number | null;
  title?: string | null;
  description?: string | null;
  priority?: number | null;
  createdOn?: string;
  createdBy: number;
  updatedOn?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationSeconds?: number | null;
  isDeleted?: boolean;
}
