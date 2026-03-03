import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { sql } from '../../config/database.js';
import type { McpContext } from '../types.js';

interface UserRow {
  id: string;
  name: string;
  email: string;
  username: string;
  timezone: string;
  briefs_enabled: boolean;
  followups_enabled: boolean;
  followup_tone: string;
}

interface EventTypeRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  location_type: string;
  color: string;
  is_active: boolean;
}

interface CalendarRow {
  id: string;
  provider: string;
  provider_account_id: string;
  calendar_id: string;
  calendar_name: string | null;
  is_primary: boolean;
  is_active: boolean;
}

/**
 * Registers all MCP resources on the given server instance.
 * Resources provide read-only access to user data.
 */
export function registerAllResources(server: McpServer, context?: McpContext): void {
  // ── User Profile ────────────────────────────────────────────────────
  server.resource(
    'user_profile',
    'fixmeet://user/profile',
    { description: 'Current user profile including name, email, timezone, and preferences' },
    async () => {
      if (!context) {
        return {
          contents: [{
            uri: 'fixmeet://user/profile',
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'Authentication required' }),
          }],
        };
      }

      const rows = await sql<UserRow[]>`
        SELECT id, name, email, username, timezone,
               briefs_enabled, followups_enabled, followup_tone
        FROM users WHERE id = ${context.userId}
      `;
      const user = rows[0];

      return {
        contents: [{
          uri: 'fixmeet://user/profile',
          mimeType: 'application/json',
          text: JSON.stringify(user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            timezone: user.timezone,
            preferences: {
              briefsEnabled: user.briefs_enabled,
              followupsEnabled: user.followups_enabled,
              followupTone: user.followup_tone,
            },
          } : { error: 'User not found' }),
        }],
      };
    },
  );

  // ── Event Types ─────────────────────────────────────────────────────
  server.resource(
    'event_types',
    'fixmeet://user/event-types',
    { description: "List of the user's event types with scheduling details" },
    async () => {
      if (!context) {
        return {
          contents: [{
            uri: 'fixmeet://user/event-types',
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'Authentication required' }),
          }],
        };
      }

      const rows = await sql<EventTypeRow[]>`
        SELECT id, slug, title, description, duration_minutes,
               location_type, color, is_active
        FROM event_types
        WHERE user_id = ${context.userId}
        ORDER BY title ASC
      `;

      return {
        contents: [{
          uri: 'fixmeet://user/event-types',
          mimeType: 'application/json',
          text: JSON.stringify({
            totalCount: rows.length,
            activeCount: rows.filter((r) => r.is_active).length,
            eventTypes: rows.map((r) => ({
              id: r.id,
              slug: r.slug,
              title: r.title,
              description: r.description,
              durationMinutes: r.duration_minutes,
              locationType: r.location_type,
              color: r.color,
              isActive: r.is_active,
            })),
          }),
        }],
      };
    },
  );

  // ── Calendar Status ─────────────────────────────────────────────────
  server.resource(
    'calendar_status',
    'fixmeet://user/calendar-status',
    { description: 'Connected calendar integrations and their status' },
    async () => {
      if (!context) {
        return {
          contents: [{
            uri: 'fixmeet://user/calendar-status',
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'Authentication required' }),
          }],
        };
      }

      const rows = await sql<CalendarRow[]>`
        SELECT id, provider, provider_account_id, calendar_id,
               calendar_name, is_primary, is_active
        FROM calendar_connections
        WHERE user_id = ${context.userId}
      `;

      return {
        contents: [{
          uri: 'fixmeet://user/calendar-status',
          mimeType: 'application/json',
          text: JSON.stringify({
            connected: rows.length > 0,
            connectionCount: rows.length,
            calendars: rows.map((r) => ({
              id: r.id,
              provider: r.provider,
              accountId: r.provider_account_id,
              calendarId: r.calendar_id,
              calendarName: r.calendar_name,
              isPrimary: r.is_primary,
              isActive: r.is_active,
            })),
          }),
        }],
      };
    },
  );
}
