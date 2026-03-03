import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { sql } from '../../config/database.js';
import { generateFollowup } from '../../modules/followups/followup-generator.service.js';
import type { McpContext } from '../types.js';
import { mcpResult, mcpError, getUserTimezone } from '../types.js';

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
  action_items: string[];
  status: string;
}

/**
 * Registers the generate_followup tool on the MCP server.
 *
 * Generates an AI-powered follow-up email draft for a past meeting.
 * Can find the meeting by booking ID or attendee name. Uses meeting
 * brief context when available for better follow-up content.
 */
export function registerGenerateFollowupTool(
  server: McpServer,
  context?: McpContext,
): void {
  server.tool(
    'generate_followup',
    'Generate a follow-up email for a past meeting. Finds the meeting by booking ID, attendee name, or uses the most recent past meeting. Returns a draft email with subject, body, and action items.',
    {
      bookingId: z.string().describe('The booking ID to generate a follow-up for'),
      notes: z
        .string()
        .optional()
        .describe('Optional meeting notes to include as context for the follow-up'),
    },
    async ({ bookingId, notes }) => {
      if (!context) {
        return mcpError('Authentication required. Please provide a valid API token.');
      }

      try {
        const userTimezone = await getUserTimezone(context.userId);

        // Look up the booking
        const rows = await sql<RecentBookingRow[]>`
          SELECT b.id, b.invitee_name, b.invitee_email, b.invitee_notes,
                 b.start_time, b.end_time, et.title AS event_type_title
          FROM bookings b
          JOIN event_types et ON b.event_type_id = et.id
          WHERE b.id = ${bookingId} AND b.host_id = ${context.userId}
        `;
        const booking = rows[0];

        if (!booking) {
          return mcpError('Booking not found. Please check the booking ID.');
        }

        // Check if a followup already exists
        const existingRows = await sql<FollowupRow[]>`
          SELECT id, subject, body, action_items, status
          FROM meeting_followups
          WHERE booking_id = ${booking.id} AND user_id = ${context.userId}
        `;

        const existing = existingRows[0];
        if (existing?.subject) {
          return mcpResult({
            bookingId: booking.id,
            existing: true,
            status: existing.status,
            followup: {
              subject: existing.subject,
              body: existing.body,
              actionItems: existing.action_items,
            },
            message: `A follow-up already exists (${existing.status}). View it in the Follow-ups section.`,
          });
        }

        // Fetch meeting brief for context if available
        let meetingBrief: string | null = null;
        const briefRows = await sql<BriefRow[]>`
          SELECT invitee_summary, company_summary, talking_points
          FROM meeting_briefs
          WHERE booking_id = ${booking.id} AND user_id = ${context.userId} AND status = 'completed'
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

        // Combine existing invitee notes with user-provided notes
        const combinedNotes = [booking.invitee_notes, notes].filter(Boolean).join('\n') || null;

        // Generate the followup via AI
        const result = await generateFollowup({
          eventTitle: booking.event_type_title,
          inviteeName: booking.invitee_name,
          startTime: booking.start_time,
          endTime: booking.end_time,
          timezone: userTimezone,
          meetingBrief,
          inviteeNotes: combinedNotes,
        });

        // Save as draft (upsert)
        await sql`
          INSERT INTO meeting_followups (booking_id, user_id, subject, body, action_items, status)
          VALUES (${booking.id}, ${context.userId}, ${result.subject}, ${result.body},
                  ${sql.json(result.actionItems)}, 'draft')
          ON CONFLICT (booking_id, user_id) DO UPDATE SET
            subject = ${result.subject}, body = ${result.body},
            action_items = ${sql.json(result.actionItems)}
        `;

        return mcpResult({
          bookingId: booking.id,
          existing: false,
          status: 'draft',
          invitee: {
            name: booking.invitee_name,
            email: booking.invitee_email,
          },
          followup: {
            subject: result.subject,
            body: result.body,
            actionItems: result.actionItems,
          },
          message: 'Follow-up email generated and saved as draft.',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('MCP generate_followup error:', message);
        return mcpError(`Failed to generate follow-up: ${message}`);
      }
    },
  );
}
