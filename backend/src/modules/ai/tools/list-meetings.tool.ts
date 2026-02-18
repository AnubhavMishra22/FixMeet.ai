import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { sql } from '../../../config/database.js';
import {
  format,
  startOfDay,
  endOfDay,
  addDays,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface MeetingRow {
  id: string;
  start_time: Date;
  end_time: Date;
  status: string;
  invitee_name: string;
  invitee_email: string;
  meeting_url: string | null;
  event_type_title: string;
  duration_minutes: number;
}

export function createListMeetingsTool(userId: string, userTimezone: string) {
  return new DynamicStructuredTool({
    name: 'list_meetings',
    description:
      "Get the user's upcoming or past meetings/bookings. Use this when the user asks about their schedule, upcoming meetings, or what's on their calendar.",
    schema: z.object({
      timeframe: z
        .enum(['today', 'tomorrow', 'this_week', 'next_week'])
        .default('this_week')
        .describe('Time range to list meetings for'),
      includePast: z
        .boolean()
        .default(false)
        .describe('Whether to include past/completed meetings. Default false (upcoming only)'),
    }),
    func: async ({ timeframe, includePast }) => {
      try {
        const now = new Date();
        const zonedNow = toZonedTime(now, userTimezone);
        let rangeStart: Date;
        let rangeEnd: Date;

        switch (timeframe) {
          case 'today':
            rangeStart = startOfDay(zonedNow);
            rangeEnd = endOfDay(zonedNow);
            break;
          case 'tomorrow':
            rangeStart = startOfDay(addDays(zonedNow, 1));
            rangeEnd = endOfDay(addDays(zonedNow, 1));
            break;
          case 'this_week':
            rangeStart = startOfWeek(zonedNow, { weekStartsOn: 1 }); // Monday
            rangeEnd = endOfWeek(zonedNow, { weekStartsOn: 1 }); // Sunday
            break;
          case 'next_week':
            rangeStart = startOfWeek(addDays(zonedNow, 7), { weekStartsOn: 1 });
            rangeEnd = endOfWeek(addDays(zonedNow, 7), { weekStartsOn: 1 });
            break;
        }

        // Build query conditions
        const statusFilter = includePast
          ? `b.status IN ('confirmed', 'completed', 'cancelled', 'no_show')`
          : `b.status = 'confirmed'`;

        const rows = await sql.unsafe<MeetingRow[]>(
          `
          SELECT
            b.id,
            b.start_time,
            b.end_time,
            b.status,
            b.invitee_name,
            b.invitee_email,
            b.meeting_url,
            et.title as event_type_title,
            et.duration_minutes
          FROM bookings b
          JOIN event_types et ON b.event_type_id = et.id
          WHERE b.host_id = $1
            AND b.start_time >= $2
            AND b.start_time <= $3
            AND ${statusFilter}
          ORDER BY b.start_time ASC
          `,
          [userId, rangeStart.toISOString(), rangeEnd.toISOString()]
        );

        const timeframeLabels: Record<string, string> = {
          today: 'Today',
          tomorrow: 'Tomorrow',
          this_week: 'This Week',
          next_week: 'Next Week',
        };

        if (rows.length === 0) {
          const label = (timeframeLabels[timeframe] ?? timeframe).toLowerCase();
          return `No meetings found for ${label}.`;
        }

        const lines: string[] = [
          `**${timeframeLabels[timeframe]}'s Meetings** (${rows.length} total):\n`,
        ];

        for (const row of rows) {
          const startZoned = toZonedTime(row.start_time, userTimezone);
          const dateStr = format(startZoned, 'EEE, MMM d');
          const timeStr = format(startZoned, 'h:mm a');
          const statusBadge = row.status !== 'confirmed' ? ` [${row.status}]` : '';
          const meetLink = row.meeting_url ? ` | Meet link available` : '';

          lines.push(
            `- **${dateStr} at ${timeStr}** — ${row.event_type_title} (${row.duration_minutes}min)${statusBadge}` +
            `\n  With: ${row.invitee_name} (${row.invitee_email})${meetLink}`
          );
        }

        lines.push(`\nAll times shown in ${userTimezone}.`);

        return lines.join('\n');
      } catch (error) {
        console.error('list_meetings tool error:', error);
        return 'Sorry, I encountered an error fetching your meetings. Please try again.';
      }
    },
  });
}
