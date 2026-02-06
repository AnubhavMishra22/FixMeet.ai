import type { Request, Response } from 'express';
import {
  getGoogleConnectUrl,
  handleGoogleCallback,
  getUserCalendarConnections,
  disconnectCalendar,
} from './calendars.service.js';
import { isGoogleOAuthConfigured } from './google/google-auth.service.js';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../utils/errors.js';

/**
 * Get user's connected calendars
 */
export async function getCalendars(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const connections = await getUserCalendarConnections(req.user.userId);

  res.json({
    connections: connections.map((c) => ({
      id: c.id,
      provider: c.provider,
      calendarId: c.calendarId,
      calendarName: c.calendarName,
      isPrimary: c.isPrimary,
      isActive: c.isActive,
      createdAt: c.createdAt,
    })),
    googleConfigured: isGoogleOAuthConfigured(),
  });
}

/**
 * Get Google OAuth connect URL
 */
export async function getGoogleConnect(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const url = getGoogleConnectUrl(req.user.userId);
  res.json({ url });
}

/**
 * Handle Google OAuth callback
 */
export async function googleCallback(req: Request, res: Response) {
  const { code, state, error } = req.query;

  // Handle OAuth errors
  if (error) {
    console.error('Google OAuth error:', error);
    return res.redirect(`${env.FRONTEND_URL}/settings/calendars?error=oauth_denied`);
  }

  if (!code || typeof code !== 'string') {
    return res.redirect(`${env.FRONTEND_URL}/settings/calendars?error=missing_code`);
  }

  if (!state || typeof state !== 'string') {
    return res.redirect(`${env.FRONTEND_URL}/settings/calendars?error=missing_state`);
  }

  try {
    // state contains the userId (in production, use signed/encrypted token)
    const userId = state;
    await handleGoogleCallback(userId, code);

    // Redirect back to frontend with success
    res.redirect(`${env.FRONTEND_URL}/settings/calendars?success=google_connected`);
  } catch (err) {
    console.error('Google callback error:', err);
    res.redirect(`${env.FRONTEND_URL}/settings/calendars?error=connection_failed`);
  }
}

/**
 * Disconnect a calendar
 */
export async function deleteCalendar(req: Request<{ id: string }>, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const { id } = req.params;

  await disconnectCalendar(req.user.userId, id);

  res.json({ message: 'Calendar disconnected successfully' });
}
