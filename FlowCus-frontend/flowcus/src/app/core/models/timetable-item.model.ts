export interface TimetableItem {
  id: number;
  timetableId: number;
  taskCategoryId: number;
  taskSubtypeId?: number | null;
  dayOfWeek: number;
  startTime: string; // Format: "HH:mm:ss"
  endTime: string;   // Format: "HH:mm:ss"
  specificDate?: string;
  isDeleted: boolean;

  // Optional display properties (populated via joins)
  taskName?: string;
  colorHex?: string;
}