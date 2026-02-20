export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  timezone: string;
  briefs_enabled: boolean;
  brief_emails_enabled: boolean;
  brief_generation_hours: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

/** camelCase representation sent to the frontend */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  username: string;
  timezone: string;
  briefsEnabled: boolean;
  briefEmailsEnabled: boolean;
  briefGenerationHours: number;
  createdAt: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
}

export interface TokenResponse {
  accessToken: string;
}
