export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface TokenResponse {
  accessToken: string;
}
