export interface TimetableItem {
  id: number;
  timetableId: number;
  taskCategoryId: number;
  taskSubtypeId?: number | null;
  dayOfWeek: number;
  startTime: string; // stored as TIME in backend
  endTime: string;   // stored as TIME in backend
  isDeleted?: boolean;
}
