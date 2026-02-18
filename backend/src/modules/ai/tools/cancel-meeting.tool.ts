import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { sql } from '../../../config/database.js';
import { cancelBooking } from '../../bookings/bookings.service.js';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface BookingSearchRow {
  id: string;
  start_time: Date;
  invitee_name: string;
  invitee_email: string;
  status: string;
  event_type_title: string;
  duration_minutes: number;
}

export function createCancelMeetingTool(userId: string, userTimezone: string) {
  return new DynamicStructuredTool({
    name: 'cancel_meeting',
    description:
      'Cancel an existing meeting/booking. IMPORTANT: Only call this tool AFTER the user has confirmed they want to cancel. Can find a meeting by booking ID or by searching with attendee name and/or date.',
    schema: z.object({
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
    }),
    func: async ({ bookingId, inviteeName, date, reason }) => {
      try {
        // If we have a direct booking ID, cancel it
        if (bookingId) {
          const booking = await cancelBooking(bookingId, 'host', reason, userId);
          return `Meeting cancelled successfully!\n- **${booking.eventType.title}** with ${booking.inviteeName}\n- Cancellation emails have been sent to both parties.`;
        }

        // Otherwise, search for the meeting
        let query = `
          SELECT b.id, b.start_time, b.invitee_name, b.invitee_email, b.status,
                 et.title as event_type_title, et.duration_minutes
          FROM bookings b
          JOIN event_types et ON b.event_type_id = et.id
          WHERE b.host_id = $1 AND b.status = 'confirmed'
        `;
        const params: (string | Date)[] = [userId];

        if (date) {
          // Search by date range (full day in user's timezone)
          query += ` AND b.start_time >= $${params.length + 1} AND b.start_time < $${params.length + 2}`;
          const dayStart = new Date(`${date}T00:00:00`);
          const dayEnd = new Date(`${date}T23:59:59`);
          params.push(dayStart.toISOString(), dayEnd.toISOString());
        }

        if (inviteeName) {
          query += ` AND LOWER(b.invitee_name) LIKE $${params.length + 1}`;
          params.push(`%${inviteeName.toLowerCase()}%`);
        }

        query += ` ORDER BY b.start_time ASC LIMIT 5`;

        const rows = await sql.unsafe<BookingSearchRow[]>(query, params);

        if (rows.length === 0) {
          return 'No matching confirmed meetings found. Please check the details and try again.';
        }

        if (rows.length === 1) {
          // Exactly one match — cancel it
          const match = rows[0];
          const booking = await cancelBooking(match.id, 'host', reason, userId);
          const startZoned = toZonedTime(match.start_time, userTimezone);
          const dateStr = format(startZoned, 'EEE, MMM d');
          const timeStr = format(startZoned, 'h:mm a');

          return [
            `Meeting cancelled successfully!`,
            `- **${booking.eventType.title}** with ${booking.inviteeName}`,
            `- Was scheduled for ${dateStr} at ${timeStr}`,
            `- Cancellation emails have been sent to both parties.`,
          ].join('\n');
        }

        // Multiple matches — ask user to clarify
        const options = rows.map((row, i) => {
          const startZoned = toZonedTime(row.start_time, userTimezone);
          const dateStr = format(startZoned, 'EEE, MMM d');
          const timeStr = format(startZoned, 'h:mm a');
          return `${i + 1}. **${row.event_type_title}** with ${row.invitee_name} — ${dateStr} at ${timeStr} (ID: ${row.id})`;
        });

        return [
          `I found ${rows.length} matching meetings. Which one would you like to cancel?\n`,
          ...options,
          `\nPlease specify which meeting to cancel (e.g. "cancel the first one" or "cancel the meeting with [name]").`,
        ].join('\n');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        if (message.includes('not found') || message.includes('Not Found')) {
          return 'Meeting not found. It may have already been cancelled or does not exist.';
        }
        if (message.includes('already cancelled')) {
          return 'This meeting has already been cancelled.';
        }

        console.error('cancel_meeting tool error:', error);
        return `Sorry, I couldn't cancel the meeting: ${message}`;
      }
    },
  });
}
