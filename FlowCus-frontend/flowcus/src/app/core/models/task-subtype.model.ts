export interface TaskSubtype {
  id: number;
  userId: number;
  categoryId: number;
  name: string;
  colorHex?: string | null;
  iconName?: string | null;
  createdOn?: string;
  isDeleted?: boolean;
}
