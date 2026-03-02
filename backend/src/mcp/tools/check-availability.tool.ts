import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { sql } from '../../config/database.js';
import { calculateAvailableSlots } from '../../modules/event-types/availability.service.js';
import { getConfirmedBookingsForDate } from '../../modules/bookings/bookings.service.js';
import { parseISO } from 'date-fns';
import type { EventTypeRow } from '../../modules/event-types/event-types.types.js';
import type { McpContext } from '../types.js';
import { mcpResult, mcpError } from '../types.js';

/**
 * Registers the check_availability tool on the MCP server.
 *
 * Returns available time slots for a given date across all active event types.
 * Accounts for existing bookings, buffer times, and Google Calendar conflicts.
 */
export function registerCheckAvailabilityTool(
  server: McpServer,
  context?: McpContext,
): void {
  server.tool(
    'check_availability',
    'Check available time slots for a specific date across all active event types. Returns free slots accounting for existing bookings, buffer times, and Google Calendar conflicts.',
    {
      date: z.string().describe('The date to check availability for, in YYYY-MM-DD format'),
    },
    async ({ date }) => {
      if (!context) {
        return mcpError('Authentication required. Please provide a valid API token.');
      }

      try {
        // Validate date format
        const dateObj = parseISO(date);
        if (isNaN(dateObj.getTime())) {
          return mcpError(`Invalid date format "${date}". Please use YYYY-MM-DD format.`);
        }

        // Get user timezone
        const users = await sql<{ timezone: string }[]>`
          SELECT timezone FROM users WHERE id = ${context.userId}
        `;
        const userTimezone = users[0]?.timezone ?? 'UTC';

        // Get user's active event types
        const eventTypes = await sql<EventTypeRow[]>`
          SELECT * FROM event_types
          WHERE user_id = ${context.userId} AND is_active = true
          ORDER BY title ASC
        `;

        if (eventTypes.length === 0) {
          return mcpResult({
            date,
            timezone: userTimezone,
            eventTypes: [],
            message: 'No active event types found. Create an event type first.',
          });
        }

        // Get existing bookings for this date
        const existingBookings = await getConfirmedBookingsForDate(context.userId, dateObj);

        const eventTypeSlots = [];

        for (const eventType of eventTypes) {
          const slots = await calculateAvailableSlots({
            eventType,
            date,
            inviteeTimezone: userTimezone,
            hostTimezone: userTimezone,
            existingBookings,
            checkGoogleCalendar: true,
          });

          eventTypeSlots.push({
            id: eventType.id,
            title: eventType.title,
            durationMinutes: eventType.duration_minutes,
            slug: eventType.slug,
            availableSlots: slots,
            slotCount: slots.length,
          });
        }

        return mcpResult({
          date,
          timezone: userTimezone,
          existingBookingsCount: existingBookings.length,
          eventTypes: eventTypeSlots,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('MCP check_availability error:', message);
        return mcpError(`Failed to check availability: ${message}`);
      }
    },
  );
}
