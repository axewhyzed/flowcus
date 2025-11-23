export interface TaskCategory {
  id: number;
  name: string;
  description?: string;
  colorHex?: string;
  iconName?: string;
  createdOn: string;
  isDeleted: boolean;
}