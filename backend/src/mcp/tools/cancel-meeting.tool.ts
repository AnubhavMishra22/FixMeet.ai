import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { sql } from '../../config/database.js';
import { cancelBooking } from '../../modules/bookings/bookings.service.js';
import { format, addDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import type { McpContext } from '../types.js';
import { mcpResult, mcpError, getUserTimezone } from '../types.js';

interface BookingSearchRow {
  id: string;
  start_time: Date;
  end_time: Date;
  invitee_name: string;
  invitee_email: string;
  status: string;
  event_type_title: string;
  duration_minutes: number;
}

/**
 * Registers the cancel_meeting tool on the MCP server.
 *
 * Cancels an existing booking by ID or by searching with attendee name
 * and/or date. Sends cancellation emails and deletes Google Calendar events.
 */
export function registerCancelMeetingTool(
  server: McpServer,
  context?: McpContext,
): void {
  server.tool(
    'cancel_meeting',
    'Cancel an existing meeting/booking. Can find the meeting by booking ID, or search by attendee name and/or date. Sends cancellation emails and removes calendar events.',
    {
      bookingId: z
        .string()
        .optional()
        .describe('Exact booking ID if known'),
      inviteeName: z
        .string()
        .optional()
        .describe('Name of the attendee to search for'),
      date: z
        .string()
        .optional()
        .describe('Date of the meeting in YYYY-MM-DD format to narrow search'),
      reason: z
        .string()
        .optional()
        .describe('Cancellation reason'),
    },
    async ({ bookingId, inviteeName, date, reason }) => {
      if (!context) {
        return mcpError('Authentication required. Please provide a valid API token.');
      }

      try {
        const userTimezone = await getUserTimezone(context.userId);

        // Direct cancel by booking ID
        if (bookingId) {
          const booking = await cancelBooking(bookingId, 'host', reason, context.userId);
          return mcpResult({
            cancelled: true,
            booking: {
              id: booking.id,
              title: booking.eventType.title,
              inviteeName: booking.inviteeName,
              inviteeEmail: booking.inviteeEmail,
            },
            message: 'Meeting cancelled successfully. Cancellation emails sent to both parties.',
          });
        }

        // Search for the meeting
        let query = `
          SELECT b.id, b.start_time, b.end_time, b.invitee_name, b.invitee_email, b.status,
                 et.title as event_type_title, et.duration_minutes
          FROM bookings b
          JOIN event_types et ON b.event_type_id = et.id
          WHERE b.host_id = $1 AND b.status = 'confirmed'
        `;
        const params: (string | Date)[] = [context.userId];

        if (date) {
          query += ` AND b.start_time >= $${params.length + 1} AND b.start_time < $${params.length + 2}`;
          const dayStartUTC = fromZonedTime(`${date}T00:00:00`, userTimezone);
          const nextDayStartUTC = addDays(dayStartUTC, 1);
          params.push(dayStartUTC.toISOString(), nextDayStartUTC.toISOString());
        }

        if (inviteeName) {
          query += ` AND LOWER(b.invitee_name) LIKE $${params.length + 1}`;
          const safeName = inviteeName.toLowerCase().replace(/[%_]/g, '\\$&');
          params.push(`%${safeName}%`);
        }

        query += ` ORDER BY b.start_time ASC LIMIT 5`;

        const rows = await sql.unsafe<BookingSearchRow[]>(query, params);

        if (rows.length === 0) {
          return mcpError('No matching confirmed meetings found. Check the details and try again.');
        }

        if (rows.length === 1) {
          const match = rows[0]!;
          const booking = await cancelBooking(match.id, 'host', reason, context.userId);
          const startZoned = toZonedTime(match.start_time, userTimezone);

          return mcpResult({
            cancelled: true,
            booking: {
              id: booking.id,
              title: booking.eventType.title,
              inviteeName: booking.inviteeName,
              inviteeEmail: booking.inviteeEmail,
              date: format(startZoned, 'yyyy-MM-dd'),
              time: format(startZoned, 'HH:mm'),
            },
            timezone: userTimezone,
            message: 'Meeting cancelled successfully. Cancellation emails sent to both parties.',
          });
        }

        // Multiple matches — return options for the client to choose from
        const matches = rows.map((row) => {
          const startZoned = toZonedTime(row.start_time, userTimezone);
          return {
            id: row.id,
            title: row.event_type_title,
            inviteeName: row.invitee_name,
            inviteeEmail: row.invitee_email,
            date: format(startZoned, 'yyyy-MM-dd'),
            dayOfWeek: format(startZoned, 'EEEE'),
            time: format(startZoned, 'HH:mm'),
            durationMinutes: row.duration_minutes,
          };
        });

        return mcpResult({
          cancelled: false,
          matchCount: matches.length,
          matches,
          message: `Found ${matches.length} matching meetings. Please specify which one to cancel by providing the bookingId.`,
        });
      } catch (error: unknown) {
        // Use specific error types from service layer
        if (error instanceof NotFoundError) {
          return mcpError('Meeting not found. It may have already been cancelled or does not exist.');
        }
        if (error instanceof BadRequestError && error.message.includes('already cancelled')) {
          return mcpError('This meeting has already been cancelled.');
        }

        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('MCP cancel_meeting error:', message);
        return mcpError(`Failed to cancel meeting: ${message}`);
      }
    },
  );
}
