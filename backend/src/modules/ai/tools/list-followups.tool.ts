import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { sql } from '../../../config/database.js';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface FollowupRow {
  id: string;
  subject: string | null;
  body: string | null;
  status: string;
  created_at: Date;
  invitee_name: string;
  invitee_email: string;
  start_time: Date;
  event_type_title: string;
}

export function createListFollowupsTool(userId: string, userTimezone: string) {
  return new DynamicStructuredTool({
    name: 'list_pending_followups',
    description:
      'List pending (draft) follow-up emails that need to be reviewed and sent. Can also list all follow-ups including sent and skipped ones.',
    schema: z.object({
      includeAll: z
        .boolean()
        .optional()
        .describe(
          'If true, include sent and skipped follow-ups too. Default is false (only drafts).',
        ),
    }),
    func: async ({ includeAll }) => {
      try {
        const statusFilter = includeAll ? sql`` : sql`AND mf.status = 'draft'`;

        const rows = await sql<FollowupRow[]>`
          SELECT mf.id, mf.subject, mf.body, mf.status, mf.created_at,
                 b.invitee_name, b.invitee_email, b.start_time,
                 et.title AS event_type_title
          FROM meeting_followups mf
          JOIN bookings b ON mf.booking_id = b.id
          JOIN event_types et ON b.event_type_id = et.id
          WHERE mf.user_id = ${userId}
            ${statusFilter}
          ORDER BY mf.created_at DESC
          LIMIT 20
        `;

        if (rows.length === 0) {
          if (includeAll) {
            return 'You have no follow-ups yet. Follow-ups are generated automatically after your meetings end, or you can generate them manually from a booking detail page.';
          }
          return 'No pending follow-up drafts! You\'re all caught up. 🎉';
        }

        const label = includeAll ? 'follow-ups' : 'pending follow-up drafts';
        const lines: string[] = [`You have **${rows.length}** ${label}:\n`];

        for (const row of rows) {
          const startZoned = toZonedTime(row.start_time, userTimezone);
          const dateStr = format(startZoned, 'EEE, MMM d');
          const timeStr = format(startZoned, 'h:mm a');

          const statusEmoji =
            row.status === 'draft' ? '📝' : row.status === 'sent' ? '✅' : '⏭️';
          const subjectPreview = row.subject
            ? ` — "${row.subject}"`
            : ' — (no subject yet)';

          lines.push(
            `${statusEmoji} **${row.invitee_name}** (${row.event_type_title}, ${dateStr} at ${timeStr})${subjectPreview}`,
          );
        }

        if (!includeAll) {
          lines.push(
            `\nYou can review and send these from the **Follow-ups** section of your dashboard.`,
          );
        }

        return lines.join('\n');
      } catch (error: unknown) {
        console.error('list_pending_followups tool error:', error);
        return `Sorry, I couldn't retrieve your follow-ups due to an internal error.`;
      }
    },
  });
}
