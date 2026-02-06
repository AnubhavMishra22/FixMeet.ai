export interface CalendarConnection {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string | null;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date;
  calendarId: string | null;
  calendarName: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarConnectionRow {
  id: string;
  user_id: string;
  provider: string;
  provider_account_id: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: Date;
  calendar_id: string | null;
  calendar_name: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PublicCalendarConnection {
  id: string;
  provider: string;
  calendarId: string | null;
  calendarName: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface AuthenticatedGoogleClient {
  client: import('google-auth-library').OAuth2Client;
  calendarId: string;
}
