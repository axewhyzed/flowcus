export interface TaskCategory {
  id: number;
  name: string;
  description?: string | null;
  colorHex?: string | null;
  iconName?: string | null;
  createdOn?: string;
  isDeleted?: boolean;
}
