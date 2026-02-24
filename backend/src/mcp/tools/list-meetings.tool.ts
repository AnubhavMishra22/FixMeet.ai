import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { sql } from '../../config/database.js';
import {
  format,
  startOfDay,
  endOfDay,
  addDays,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { McpContext } from '../types.js';
import { mcpResult, mcpError, getUserTimezone } from '../types.js';

interface MeetingRow {
  id: string;
  start_time: Date;
  end_time: Date;
  status: string;
  invitee_name: string;
  invitee_email: string;
  meeting_url: string | null;
  location_type: string;
  event_type_title: string;
  duration_minutes: number;
}

/**
 * Registers the list_meetings tool on the MCP server.
 *
 * Lists upcoming or past meetings for a given timeframe, with details
 * including attendee info, meeting links, and status.
 */
export function registerListMeetingsTool(
  server: McpServer,
  context?: McpContext,
): void {
  server.tool(
    'list_meetings',
    "List upcoming or past meetings/bookings for a given timeframe. Returns meeting details including attendee info, times, and meeting links.",
    {
      timeframe: z
        .enum(['today', 'tomorrow', 'this_week', 'next_week'])
        .default('this_week')
        .describe('Time range to list meetings for'),
      includePast: z
        .boolean()
        .default(false)
        .describe('Whether to include past/completed/cancelled meetings. Default false (upcoming only)'),
    },
    async ({ timeframe, includePast }) => {
      if (!context) {
        return mcpError('Authentication required. Please provide a valid API token.');
      }

      try {
        const userTimezone = await getUserTimezone(context.userId);

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
            rangeStart = startOfWeek(zonedNow, { weekStartsOn: 1 });
            rangeEnd = endOfWeek(zonedNow, { weekStartsOn: 1 });
            break;
          case 'next_week':
            rangeStart = startOfWeek(addDays(zonedNow, 7), { weekStartsOn: 1 });
            rangeEnd = endOfWeek(addDays(zonedNow, 7), { weekStartsOn: 1 });
            break;
        }

        // Use parameterized ANY() instead of string interpolation for status filter
        const statuses = includePast
          ? ['confirmed', 'completed', 'cancelled', 'no_show']
          : ['confirmed'];

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
            b.location_type,
            et.title as event_type_title,
            et.duration_minutes
          FROM bookings b
          JOIN event_types et ON b.event_type_id = et.id
          WHERE b.host_id = $1
            AND b.start_time >= $2
            AND b.start_time <= $3
            AND b.status = ANY($4)
          ORDER BY b.start_time ASC
          `,
          [context.userId, rangeStart.toISOString(), rangeEnd.toISOString(), statuses],
        );

        const meetings = rows.map((row) => {
          const startZoned = toZonedTime(row.start_time, userTimezone);
          const endZoned = toZonedTime(row.end_time, userTimezone);

          return {
            id: row.id,
            title: row.event_type_title,
            date: format(startZoned, 'yyyy-MM-dd'),
            dayOfWeek: format(startZoned, 'EEEE'),
            startTime: format(startZoned, 'HH:mm'),
            endTime: format(endZoned, 'HH:mm'),
            durationMinutes: row.duration_minutes,
            status: row.status,
            invitee: {
              name: row.invitee_name,
              email: row.invitee_email,
            },
            locationType: row.location_type,
            meetingUrl: row.meeting_url,
          };
        });

        return mcpResult({
          timeframe,
          timezone: userTimezone,
          totalCount: meetings.length,
          meetings,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('MCP list_meetings error:', message);
        return mcpError(`Failed to list meetings: ${message}`);
      }
    },
  );
}
