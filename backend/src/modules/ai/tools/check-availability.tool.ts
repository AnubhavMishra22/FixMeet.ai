import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { sql } from '../../../config/database.js';
import { calculateAvailableSlots } from '../../event-types/availability.service.js';
import { getConfirmedBookingsForDate } from '../../bookings/bookings.service.js';
import { parseISO, format } from 'date-fns';
import type { EventTypeRow } from '../../event-types/event-types.types.js';

export function createCheckAvailabilityTool(userId: string, userTimezone: string) {
  return new DynamicStructuredTool({
    name: 'check_availability',
    description:
      'Check the user\'s available time slots for a specific date. Returns free time slots across all active event types. Use this when the user asks about their availability or free time.',
    schema: z.object({
      date: z
        .string()
        .describe('The date to check availability for, in YYYY-MM-DD format'),
    }),
    func: async ({ date }) => {
      try {
        // Validate date format
        const dateObj = parseISO(date);
        if (isNaN(dateObj.getTime())) {
          return `Invalid date format "${date}". Please use YYYY-MM-DD format.`;
        }

        // Get user's active event types
        const eventTypes = await sql<EventTypeRow[]>`
          SELECT * FROM event_types
          WHERE user_id = ${userId} AND is_active = true
          ORDER BY title ASC
        `;

        if (eventTypes.length === 0) {
          return 'You have no active event types. Create an event type first to check availability.';
        }

        // Get existing bookings for this date
        const existingBookings = await getConfirmedBookingsForDate(userId, dateObj);

        const formattedDate = format(dateObj, 'EEEE, MMMM d, yyyy');
        const results: string[] = [`Availability for ${formattedDate}:\n`];

        for (const eventType of eventTypes) {
          const slots = await calculateAvailableSlots({
            eventType,
            date,
            inviteeTimezone: userTimezone,
            hostTimezone: userTimezone,
            existingBookings,
            checkGoogleCalendar: true,
          });

          if (slots.length === 0) {
            results.push(`**${eventType.title}** (${eventType.duration_minutes}min): No available slots`);
          } else {
            const slotList = slots
              .map((s) => `${s.start}–${s.end}`)
              .join(', ');
            results.push(
              `**${eventType.title}** (${eventType.duration_minutes}min): ${slots.length} slots available\n  ${slotList}`
            );
          }
        }

        if (existingBookings.length > 0) {
          results.push(`\n${existingBookings.length} existing booking(s) on this date.`);
        }

        return results.join('\n');
      } catch (error) {
        console.error('check_availability tool error:', error);
        return 'Sorry, I encountered an error checking availability. Please try again.';
      }
    },
  });
}
