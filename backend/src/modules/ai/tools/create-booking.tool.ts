import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { sql } from '../../../config/database.js';
import { createBooking } from '../../bookings/bookings.service.js';
import { fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import type { EventTypeRow } from '../../event-types/event-types.types.js';

export function createCreateBookingTool(userId: string, userTimezone: string) {
  return new DynamicStructuredTool({
    name: 'create_booking',
    description:
      'Schedule a meeting by creating a booking. IMPORTANT: Only call this tool AFTER the user has confirmed the booking details (name, email, date, time). Never call this without explicit user confirmation.',
    schema: z.object({
      inviteeName: z
        .string()
        .describe('Full name of the person being invited to the meeting'),
      inviteeEmail: z
        .string()
        .describe('Email address of the invitee'),
      date: z
        .string()
        .describe('Date of the meeting in YYYY-MM-DD format'),
      time: z
        .string()
        .describe('Start time of the meeting in HH:MM 24-hour format'),
      duration: z
        .number()
        .optional()
        .describe('Duration in minutes. Defaults to 30 if not specified'),
      title: z
        .string()
        .optional()
        .describe('Optional meeting topic or title'),
    }),
    func: async ({ inviteeName, inviteeEmail, date, time, duration, title }) => {
      try {
        const meetingDuration = duration ?? 30;

        // Find a matching active event type for the requested duration
        const eventTypes = await sql<EventTypeRow[]>`
          SELECT * FROM event_types
          WHERE user_id = ${userId}
            AND is_active = true
            AND duration_minutes = ${meetingDuration}
          ORDER BY created_at ASC
          LIMIT 1
        `;

        // If no exact match, find closest or first active event type
        let eventType = eventTypes[0];
        if (!eventType) {
          const fallback = await sql<EventTypeRow[]>`
            SELECT * FROM event_types
            WHERE user_id = ${userId} AND is_active = true
            ORDER BY ABS(duration_minutes - ${meetingDuration}), created_at ASC
            LIMIT 1
          `;
          eventType = fallback[0];
        }

        if (!eventType) {
          return 'You have no active event types. Please create an event type first before scheduling meetings.';
        }

        // Build ISO datetime string from date + time in user's timezone
        const localDateTimeStr = `${date}T${time}:00`;
        const startTimeUtc = fromZonedTime(new Date(localDateTimeStr), userTimezone);

        // Validate the datetime is valid
        if (isNaN(startTimeUtc.getTime())) {
          return `Invalid date/time: "${date} ${time}". Please use YYYY-MM-DD for date and HH:MM for time.`;
        }

        // Call the existing booking service
        const booking = await createBooking(eventType.id, {
          inviteeName,
          inviteeEmail,
          inviteeTimezone: userTimezone,
          inviteeNotes: title ? `Meeting topic: ${title}` : undefined,
          startTime: startTimeUtc.toISOString(),
          responses: {},
        });

        // Format the confirmation
        const formattedDate = format(new Date(`${date}T${time}:00`), 'EEEE, MMMM d, yyyy');
        const meetingUrl = booking.meetingUrl ? `\nMeeting link: ${booking.meetingUrl}` : '';

        return [
          `Booking confirmed!`,
          `Event: **${eventType.title}**${title ? ` — ${title}` : ''}`,
          `With: ${inviteeName} (${inviteeEmail})`,
          `Date: ${formattedDate}`,
          `Time: ${time} (${userTimezone})`,
          `Duration: ${eventType.duration_minutes} minutes`,
          `Status: ${booking.status}`,
          meetingUrl,
          `\nConfirmation emails have been sent to both parties.`,
        ].filter(Boolean).join('\n');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        // Return user-friendly error messages
        if (message.includes('time slot is no longer available')) {
          return 'That time slot is no longer available. Please check availability and try a different time.';
        }
        if (message.includes('in the past')) {
          return 'Cannot book a time in the past. Please choose a future date and time.';
        }
        if (message.includes('minimum notice')) {
          return `This time is too soon. Bookings require advance notice. Please choose a later time.`;
        }

        console.error('create_booking tool error:', error);
        return `Sorry, I couldn't create the booking: ${message}`;
      }
    },
  });
}
