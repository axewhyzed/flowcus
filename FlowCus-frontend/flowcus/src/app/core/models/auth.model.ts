export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    name?: string;
    isAdmin: boolean;
  };
}