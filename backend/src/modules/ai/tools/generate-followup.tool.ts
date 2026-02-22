import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { sql } from '../../../config/database.js';
import { generateFollowup } from '../../followups/followup-generator.service.js';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface RecentBookingRow {
  id: string;
  invitee_name: string;
  invitee_email: string;
  invitee_notes: string | null;
  start_time: Date;
  end_time: Date;
  event_type_title: string;
}

interface BriefRow {
  invitee_summary: string | null;
  company_summary: string | null;
  talking_points: string[];
}

interface FollowupRow {
  id: string;
  subject: string | null;
  body: string | null;
  status: string;
}

export function createGenerateFollowupTool(userId: string, userTimezone: string) {
  return new DynamicStructuredTool({
    name: 'generate_followup',
    description:
      'Generate a follow-up email for a recently completed meeting. Can find the meeting by attendee name or booking ID. If no meeting is specified, uses the most recent past meeting.',
    schema: z.object({
      bookingId: z
        .string()
        .optional()
        .describe('Exact booking ID if known'),
      inviteeName: z
        .string()
        .optional()
        .describe('Name of the attendee to search for'),
    }),
    func: async ({ bookingId, inviteeName }) => {
      try {
        let booking: RecentBookingRow | undefined;

        if (bookingId) {
          // Direct lookup
          const rows = await sql<RecentBookingRow[]>`
            SELECT b.id, b.invitee_name, b.invitee_email, b.invitee_notes,
                   b.start_time, b.end_time, et.title AS event_type_title
            FROM bookings b
            JOIN event_types et ON b.event_type_id = et.id
            WHERE b.id = ${bookingId} AND b.host_id = ${userId}
          `;
          booking = rows[0];
        } else if (inviteeName) {
          // Search by name in past meetings
          const safeName = inviteeName.toLowerCase().replace(/[%_]/g, '\\$&');
          const rows = await sql<RecentBookingRow[]>`
            SELECT b.id, b.invitee_name, b.invitee_email, b.invitee_notes,
                   b.start_time, b.end_time, et.title AS event_type_title
            FROM bookings b
            JOIN event_types et ON b.event_type_id = et.id
            WHERE b.host_id = ${userId}
              AND b.status = 'confirmed'
              AND b.end_time < NOW()
              AND LOWER(b.invitee_name) LIKE ${'%' + safeName + '%'}
            ORDER BY b.end_time DESC
            LIMIT 1
          `;
          booking = rows[0];
        } else {
          // Most recent past meeting
          const rows = await sql<RecentBookingRow[]>`
            SELECT b.id, b.invitee_name, b.invitee_email, b.invitee_notes,
                   b.start_time, b.end_time, et.title AS event_type_title
            FROM bookings b
            JOIN event_types et ON b.event_type_id = et.id
            WHERE b.host_id = ${userId}
              AND b.status = 'confirmed'
              AND b.end_time < NOW()
            ORDER BY b.end_time DESC
            LIMIT 1
          `;
          booking = rows[0];
        }

        if (!booking) {
          return 'No matching past meeting found. Please check the details and try again.';
        }

        // Check if a followup already exists
        const existingRows = await sql<FollowupRow[]>`
          SELECT id, subject, body, status
          FROM meeting_followups
          WHERE booking_id = ${booking.id} AND user_id = ${userId}
        `;

        const existingFollowup = existingRows[0];
        if (existingFollowup?.subject) {
          const statusLabel = existingFollowup.status === 'sent' ? '(already sent)' : '(draft)';
          return [
            `A follow-up already exists for this meeting ${statusLabel}:`,
            ``,
            `**Subject:** ${existingFollowup.subject}`,
            ``,
            existingFollowup.body ?? '',
            ``,
            `You can view and edit it in the Follow-ups section of your dashboard.`,
          ].join('\n');
        }

        // Fetch meeting brief for context if available
        let meetingBrief: string | null = null;
        const briefRows = await sql<BriefRow[]>`
          SELECT invitee_summary, company_summary, talking_points
          FROM meeting_briefs
          WHERE booking_id = ${booking.id} AND user_id = ${userId} AND status = 'completed'
          LIMIT 1
        `;

        const brief = briefRows[0];
        if (brief) {
          const parts: string[] = [];
          if (brief.invitee_summary) parts.push(`About attendee: ${brief.invitee_summary}`);
          if (brief.company_summary) parts.push(`About company: ${brief.company_summary}`);
          if (brief.talking_points?.length > 0) {
            parts.push(`Talking points: ${brief.talking_points.join(', ')}`);
          }
          if (parts.length > 0) meetingBrief = parts.join('\n');
        }

        // Generate the followup
        const result = await generateFollowup({
          eventTitle: booking.event_type_title,
          inviteeName: booking.invitee_name,
          startTime: booking.start_time,
          endTime: booking.end_time,
          meetingBrief,
          inviteeNotes: booking.invitee_notes,
        });

        // Save to database (create or update existing empty draft)
        if (existingRows.length > 0) {
          await sql`
            UPDATE meeting_followups
            SET subject = ${result.subject}, body = ${result.body},
                action_items = ${sql.json(result.actionItems)}
            WHERE booking_id = ${booking.id} AND user_id = ${userId}
          `;
        } else {
          await sql`
            INSERT INTO meeting_followups (booking_id, user_id, subject, body, action_items, status)
            VALUES (${booking.id}, ${userId}, ${result.subject}, ${result.body},
                    ${sql.json(result.actionItems)}, 'draft')
            ON CONFLICT (booking_id, user_id) DO UPDATE SET
              subject = ${result.subject}, body = ${result.body},
              action_items = ${sql.json(result.actionItems)}
          `;
        }

        const startZoned = toZonedTime(booking.start_time, userTimezone);
        const dateStr = format(startZoned, 'EEE, MMM d');
        const timeStr = format(startZoned, 'h:mm a');

        const actionItemsList = result.actionItems.length > 0
          ? `\n\n**Action Items:**\n${result.actionItems.map((item) => `- ${item}`).join('\n')}`
          : '';

        return [
          `Follow-up email generated for your meeting with **${booking.invitee_name}** (${dateStr} at ${timeStr})!`,
          ``,
          `**Subject:** ${result.subject}`,
          ``,
          result.body,
          actionItemsList,
          ``,
          `This has been saved as a draft. You can review, edit, and send it from the Follow-ups section.`,
        ].join('\n');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('generate_followup tool error:', error);
        return `Sorry, I couldn't generate the follow-up: ${message}`;
      }
    },
  });
}
