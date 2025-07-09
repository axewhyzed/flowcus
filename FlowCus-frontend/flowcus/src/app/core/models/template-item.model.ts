// export interface TemplateItem {
//   id?: number;
//   templateId: number;
//   dayOfWeek: number;
//   startTime: string;      // ISO string or "HH:mm:ss"
//   endTime: string;        // ISO string or "HH:mm:ss"
//   taskTitle: string;
//   taskDescription?: string;
//   isDeleted?: boolean;
// }

export interface TemplateItem {
  id: number;
  templateListId: number;
  title: string;
  description: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  userId: number;
  createdAt: Date;
  isDeleted: boolean;
}

export enum DayOfWeek {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6
}

export interface CreateTemplateItemRequest {
  templateListId: number;
  title: string;
  description: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  userId: number;
}

export interface BatchCreateTemplateItemsRequest {
  templateItems: CreateTemplateItemRequest[];
}
