// export interface Task {
//     taskId?: number;
//     title: string;
//     description?: string;
//     priority: number;
//     createdOn?: string;
//     createdBy: number;
//     updatedOn?: string;
//     updatedBy?: number;
//     startTime?: string;
//     endTime?: string;
//     durationSeconds?: number;
//     isDeleted?: boolean;
//   }
  
export interface Task {
  id: number;
  title: string;
  description: string;
  isCompleted: boolean;
  priority: TaskPriority;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export enum TaskPriority {
  High = 1,
  Normal = 2,
  Low = 3
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  priority: TaskPriority;
  startTime?: Date;
  endTime?: Date;
  userId: string;
}

export interface UpdateTaskRequest extends CreateTaskRequest {
  id: number;
  isCompleted?: boolean;
}
