import { google } from 'googleapis';
import { env } from '../../../config/env.js';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly', // Read calendar events
  'https://www.googleapis.com/auth/calendar.events', // Create/edit events
];

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Check if Google OAuth is configured
 */
export function isGoogleOAuthConfigured(): boolean {
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

/**
 * Generate URL for user to authorize Google Calendar access
 */
export function getGoogleAuthUrl(state: string): string {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    prompt: 'consent', // Force consent to get refresh token every time
    scope: SCOPES,
    state, // Pass user ID or session token for security
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
}> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error('No access token received');
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    expiresAt: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
  };
}

/**
 * Create authenticated OAuth client from stored tokens
 */
export function createAuthenticatedClient(
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date
) {
  const oauth2Client = createOAuth2Client();

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: expiresAt.getTime(),
  });

  return oauth2Client;
}

/**
 * Refresh access token if expired
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error('Failed to refresh token');
  }

  return {
    accessToken: credentials.access_token,
    expiresAt: new Date(credentials.expiry_date || Date.now() + 3600 * 1000),
  };
}
