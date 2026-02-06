import { sql } from '../../config/database.js';
import { BadRequestError } from '../../utils/errors.js';
import {
  getGoogleAuthUrl,
  getTokensFromCode,
  createAuthenticatedClient,
  refreshAccessToken,
  isGoogleOAuthConfigured,
} from './google/google-auth.service.js';
import { listCalendars } from './google/google-calendar.service.js';
import type {
  CalendarConnection,
  CalendarConnectionRow,
  AuthenticatedGoogleClient,
} from './calendars.types.js';

function rowToConnection(row: CalendarConnectionRow): CalendarConnection {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiresAt: new Date(row.token_expires_at),
    calendarId: row.calendar_id,
    calendarName: row.calendar_name,
    isPrimary: row.is_primary,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Get OAuth URL for connecting Google Calendar
 */
export function getGoogleConnectUrl(userId: string): string {
  if (!isGoogleOAuthConfigured()) {
    throw new BadRequestError('Google OAuth is not configured');
  }

  // Use userId as state parameter for security
  // In production, use a signed/encrypted token
  return getGoogleAuthUrl(userId);
}

/**
 * Handle OAuth callback - save tokens
 */
export async function handleGoogleCallback(
  userId: string,
  code: string
): Promise<CalendarConnection> {
  // Exchange code for tokens
  const { accessToken, refreshToken, expiresAt } = await getTokensFromCode(code);

  // Get user's calendars to find primary
  const auth = createAuthenticatedClient(accessToken, refreshToken, expiresAt);
  const calendars = await listCalendars(auth);
  const primaryCalendar = calendars.find((c) => c.primary) || calendars[0];

  if (!primaryCalendar) {
    throw new Error('No calendars found in Google account');
  }

  // Check if connection already exists
  const existing = await sql<{ id: string }[]>`
    SELECT id FROM calendar_connections
    WHERE user_id = ${userId} AND provider = 'google'
  `;

  if (existing.length > 0) {
    // Update existing connection
    const updated = await sql<CalendarConnectionRow[]>`
      UPDATE calendar_connections
      SET
        access_token = ${accessToken},
        refresh_token = COALESCE(${refreshToken}, refresh_token),
        token_expires_at = ${expiresAt.toISOString()},
        calendar_id = ${primaryCalendar.id},
        calendar_name = ${primaryCalendar.name},
        is_active = true,
        updated_at = NOW()
      WHERE id = ${existing[0]!.id}
      RETURNING *
    `;
    return rowToConnection(updated[0]!);
  }

  // Create new connection
  const connection = await sql<CalendarConnectionRow[]>`
    INSERT INTO calendar_connections (
      user_id, provider, access_token, refresh_token, token_expires_at,
      calendar_id, calendar_name, is_primary, is_active
    ) VALUES (
      ${userId}, 'google', ${accessToken}, ${refreshToken}, ${expiresAt.toISOString()},
      ${primaryCalendar.id}, ${primaryCalendar.name}, true, true
    )
    RETURNING *
  `;

  return rowToConnection(connection[0]!);
}

/**
 * Get user's calendar connections
 */
export async function getUserCalendarConnections(
  userId: string
): Promise<CalendarConnection[]> {
  const connections = await sql<CalendarConnectionRow[]>`
    SELECT * FROM calendar_connections
    WHERE user_id = ${userId}
    ORDER BY is_primary DESC, created_at ASC
  `;
  return connections.map(rowToConnection);
}

/**
 * Get active Google connection for a user
 */
export async function getActiveGoogleConnection(
  userId: string
): Promise<CalendarConnection | null> {
  const connections = await sql<CalendarConnectionRow[]>`
    SELECT * FROM calendar_connections
    WHERE user_id = ${userId}
    AND provider = 'google'
    AND is_active = true
    LIMIT 1
  `;
  const connection = connections[0];
  return connection ? rowToConnection(connection) : null;
}

/**
 * Get authenticated OAuth client for a user
 * Automatically refreshes token if expired
 */
export async function getAuthenticatedGoogleClient(
  userId: string
): Promise<AuthenticatedGoogleClient | null> {
  const connection = await getActiveGoogleConnection(userId);

  if (!connection || !connection.calendarId) {
    return null;
  }

  // Check if token is expired or about to expire (5 min buffer)
  const now = new Date();
  const expiresAt = new Date(connection.tokenExpiresAt);
  const isExpired = expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

  if (isExpired && connection.refreshToken) {
    try {
      // Refresh the token
      const { accessToken, expiresAt: newExpiresAt } = await refreshAccessToken(
        connection.refreshToken
      );

      // Update in database
      await sql`
        UPDATE calendar_connections
        SET access_token = ${accessToken}, token_expires_at = ${newExpiresAt.toISOString()}, updated_at = NOW()
        WHERE id = ${connection.id}
      `;

      return {
        client: createAuthenticatedClient(
          accessToken,
          connection.refreshToken,
          newExpiresAt
        ),
        calendarId: connection.calendarId,
      };
    } catch (err) {
      console.error('Failed to refresh Google token:', err);
      // Mark connection as inactive if refresh fails
      await sql`
        UPDATE calendar_connections
        SET is_active = false, updated_at = NOW()
        WHERE id = ${connection.id}
      `;
      return null;
    }
  }

  return {
    client: createAuthenticatedClient(
      connection.accessToken,
      connection.refreshToken,
      connection.tokenExpiresAt
    ),
    calendarId: connection.calendarId,
  };
}

/**
 * Disconnect calendar
 */
export async function disconnectCalendar(
  userId: string,
  connectionId: string
): Promise<void> {
  await sql`
    DELETE FROM calendar_connections
    WHERE id = ${connectionId} AND user_id = ${userId}
  `;
}
