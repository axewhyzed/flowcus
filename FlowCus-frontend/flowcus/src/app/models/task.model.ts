export interface Task {
    taskId?: number;
    title: string;
    description?: string;
    priority: number;
    createdOn?: string;
    createdBy: number;
    updatedOn?: string;
    updatedBy?: number;
    startTime?: string;
    endTime?: string;
    durationSeconds?: number;
    isDeleted?: boolean;
  }  