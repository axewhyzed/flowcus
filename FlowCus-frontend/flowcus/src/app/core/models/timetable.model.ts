export interface Timetable {
  id: number;
  userId: number;
  name: string;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt?: string;
}
