export interface TemplateItem {
  id?: number;
  templateId: number;
  dayOfWeek: number;
  startTime: string;      // ISO string or "HH:mm:ss"
  endTime: string;        // ISO string or "HH:mm:ss"
  taskTitle: string;
  taskDescription?: string;
  isDeleted?: boolean;
}