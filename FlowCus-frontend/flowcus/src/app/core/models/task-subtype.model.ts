export interface TaskSubtype {
  id: number;
  categoryId: number;
  userId: number;
  name: string;
  colorHex?: string;
  iconName?: string;
  createdOn: string;
  isDeleted: boolean;
}