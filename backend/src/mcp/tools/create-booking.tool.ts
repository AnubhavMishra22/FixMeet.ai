import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { sql } from '../../config/database.js';
import { createBooking } from '../../modules/bookings/bookings.service.js';
import { fromZonedTime } from 'date-fns-tz';
import { BadRequestError, ConflictError } from '../../utils/errors.js';
import type { EventTypeRow } from '../../modules/event-types/event-types.types.js';
import type { McpContext } from '../types.js';
import { mcpResult, mcpError, getUserTimezone } from '../types.js';

/**
 * Registers the create_booking tool on the MCP server.
 *
 * Creates a new booking by finding a matching event type and calling the
 * booking service. Handles timezone conversion, conflict detection, calendar
 * event creation, and email notifications automatically.
 */
export function registerCreateBookingTool(
  server: McpServer,
  context?: McpContext,
): void {
  server.tool(
    'create_booking',
    'Schedule a meeting by creating a booking. Finds a matching event type for the requested duration, validates the time slot, creates a Google Calendar event (if connected), and sends confirmation emails to both parties.',
    {
      inviteeName: z.string().describe('Full name of the person being invited'),
      inviteeEmail: z.string().email().describe('Email address of the invitee'),
      date: z.string().describe('Date of the meeting in YYYY-MM-DD format'),
      time: z.string().describe('Start time of the meeting in HH:MM 24-hour format'),
      duration: z
        .number()
        .optional()
        .describe('Duration in minutes. Defaults to 30 if not specified'),
      notes: z
        .string()
        .optional()
        .describe('Optional meeting notes or topic'),
    },
    async ({ inviteeName, inviteeEmail, date, time, duration, notes }) => {
      if (!context) {
        return mcpError('Authentication required. Please provide a valid API token.');
      }

      try {
        const meetingDuration = duration ?? 30;
        const userTimezone = await getUserTimezone(context.userId);

        // Find a matching active event type for the requested duration
        const eventTypes = await sql<EventTypeRow[]>`
          SELECT * FROM event_types
          WHERE user_id = ${context.userId}
            AND is_active = true
            AND duration_minutes = ${meetingDuration}
          ORDER BY created_at ASC
          LIMIT 1
        `;

        // If no exact match, find closest active event type
        let eventType = eventTypes[0];
        if (!eventType) {
          const fallback = await sql<EventTypeRow[]>`
            SELECT * FROM event_types
            WHERE user_id = ${context.userId} AND is_active = true
            ORDER BY ABS(duration_minutes - ${meetingDuration}), created_at ASC
            LIMIT 1
          `;
          eventType = fallback[0];
        }

        if (!eventType) {
          return mcpError('No active event types found. Create an event type first before scheduling meetings.');
        }

        // Build UTC datetime from date + time in user's timezone
        const localDateTimeStr = `${date}T${time}:00`;
        const startTimeUtc = fromZonedTime(localDateTimeStr, userTimezone);

        if (isNaN(startTimeUtc.getTime())) {
          return mcpError(`Invalid date/time: "${date} ${time}". Use YYYY-MM-DD for date and HH:MM for time.`);
        }

        // Call the existing booking service
        const booking = await createBooking(eventType.id, {
          inviteeName,
          inviteeEmail,
          inviteeTimezone: userTimezone,
          inviteeNotes: notes ?? undefined,
          startTime: startTimeUtc.toISOString(),
          responses: {},
        });

        return mcpResult({
          id: booking.id,
          status: booking.status,
          eventType: {
            id: eventType.id,
            title: eventType.title,
            slug: eventType.slug,
            durationMinutes: eventType.duration_minutes,
          },
          invitee: {
            name: inviteeName,
            email: inviteeEmail,
          },
          date,
          time,
          timezone: userTimezone,
          durationMinutes: eventType.duration_minutes,
          meetingUrl: booking.meetingUrl,
          message: 'Booking created successfully. Confirmation emails sent to both parties.',
        });
      } catch (error: unknown) {
        // Use specific error types from service layer
        if (error instanceof ConflictError) {
          return mcpError('That time slot is no longer available. Check availability and try a different time.');
        }
        if (error instanceof BadRequestError) {
          if (error.message.includes('in the past')) {
            return mcpError('Cannot book a time in the past. Please choose a future date and time.');
          }
          if (error.message.includes('minimum notice')) {
            return mcpError('This time is too soon. Bookings require advance notice. Please choose a later time.');
          }
        }

        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('MCP create_booking error:', message);
        return mcpError(`Failed to create booking: ${message}`);
      }
    },
  );
}
