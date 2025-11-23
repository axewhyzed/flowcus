export interface User {
  id: number;
  username: string;
  name?: string;
  isAdmin: boolean;
  createdOn: string;
  updatedOn?: string;
  failedAttempts: number;
  lockoutUntil?: string;
}