export interface User {
  id: number;
  username: string;
  name?: string | null;
  createdOn?: string;
  isAdmin: boolean;
}
