export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  csrfToken?: string;
  user: {
    id: number;
    username: string;
    name?: string;
    isAdmin: boolean;
  };
}
