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
  taskId: number;
  title: string;
  description: string;
  isCompleted: boolean;
  priority: TaskPriority;
  startTime?: Date;
  endTime?: Date;
  durationSeconds?: number;
  userId: number;
  createdOn: Date;
  createdBy?: number;
  updatedOn?: Date;
  updatedBy? : number,
  isDeleted?: boolean;
}

export enum TaskPriority {
  High = 1,
  Normal = 2,
  Low = 3
}