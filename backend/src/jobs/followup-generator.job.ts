import { sql } from '../config/database.js';
import { env } from '../config/env.js';
import { generateFollowup } from '../modules/followups/followup-generator.service.js';

interface PendingFollowupRow {
  id: string;
  booking_id: string;
  user_id: string;
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

/**
 * Followup generator job — runs every 30 minutes.
 *
 * Phase 1: Create draft followup records for recently ended meetings
 *   (ended 30–90 minutes ago).
 * Phase 2: Generate AI content for drafts that have no subject/body yet.
 */
export async function processFollowupGeneration(): Promise<void> {
  console.log('📝 Processing meeting followups...');

  // ── Phase 1: Create draft records for recently ended meetings ─────────
  try {
    const created = await sql<{ booking_id: string; invitee_name: string }[]>`
      INSERT INTO meeting_followups (booking_id, user_id, status)
      SELECT b.id, b.host_id, 'draft'
      FROM bookings b
      WHERE b.status = 'confirmed'
        AND b.end_time < NOW() - INTERVAL '30 minutes'
        AND b.end_time > NOW() - INTERVAL '90 minutes'
        AND NOT EXISTS (
          SELECT 1 FROM meeting_followups mf
          WHERE mf.booking_id = b.id AND mf.user_id = b.host_id
        )
      ON CONFLICT (booking_id, user_id) DO NOTHING
      RETURNING booking_id, (
        SELECT invitee_name FROM bookings WHERE id = booking_id
      ) AS invitee_name
    `;

    if (created.length > 0) {
      for (const row of created) {
        console.log(`  ✓ Created draft followup for booking ${row.booking_id} (${row.invitee_name})`);
      }
      console.log(`  Total: ${created.length} new followup drafts`);
    } else {
      console.log('  No recently ended meetings found');
    }
  } catch (err) {
    console.error('  ✗ Failed to create followup drafts:', (err as Error).message);
  }

  // ── Phase 2: Generate AI content for empty drafts ─────────────────────
  if (!env.GOOGLE_AI_API_KEY) {
    console.log('  Skipping AI generation (no GOOGLE_AI_API_KEY)');
    console.log('📝 Followup processing complete');
    return;
  }

  // Find drafts without subject/body (not yet generated)
  const pending = await sql<PendingFollowupRow[]>`
    SELECT
      mf.id,
      mf.booking_id,
      mf.user_id,
      b.invitee_name,
      b.invitee_email,
      b.invitee_notes,
      b.start_time,
      b.end_time,
      et.title AS event_type_title
    FROM meeting_followups mf
    JOIN bookings b ON mf.booking_id = b.id
    JOIN event_types et ON b.event_type_id = et.id
    WHERE mf.status = 'draft'
      AND mf.subject IS NULL
      AND mf.body IS NULL
    ORDER BY mf.created_at ASC
    LIMIT 5
  `;

  if (pending.length === 0) {
    console.log('  No followups need AI generation');
    console.log('📝 Followup processing complete');
    return;
  }

  console.log(`  Generating AI content for ${pending.length} followups...`);

  for (const row of pending) {
    try {
      // Fetch meeting brief if one exists (for extra context)
      let meetingBrief: string | null = null;
      const briefRows = await sql<BriefRow[]>`
        SELECT invitee_summary, company_summary, talking_points
        FROM meeting_briefs
        WHERE booking_id = ${row.booking_id}
          AND user_id = ${row.user_id}
          AND status = 'completed'
        LIMIT 1
      `;

      if (briefRows.length > 0) {
        const brief = briefRows[0];
        const parts: string[] = [];
        if (brief.invitee_summary) parts.push(`About attendee: ${brief.invitee_summary}`);
        if (brief.company_summary) parts.push(`About company: ${brief.company_summary}`);
        if (brief.talking_points?.length > 0) {
          parts.push(`Talking points: ${brief.talking_points.join(', ')}`);
        }
        if (parts.length > 0) meetingBrief = parts.join('\n');
      }

      // Generate followup content with AI
      console.log(`  🤖 Generating followup for ${row.invitee_name}...`);
      const result = await generateFollowup({
        eventTitle: row.event_type_title,
        inviteeName: row.invitee_name,
        startTime: row.start_time,
        endTime: row.end_time,
        meetingBrief,
        inviteeNotes: row.invitee_notes,
      });

      // Save generated content to database
      await sql`
        UPDATE meeting_followups
        SET
          subject = ${result.subject},
          body = ${result.body},
          action_items = ${sql.json(result.actionItems)}
        WHERE id = ${row.id}
      `;

      console.log(`  ✓ Followup generated for ${row.invitee_name}: "${result.subject}"`);
    } catch (err) {
      console.error(`  ✗ Failed to generate followup for ${row.invitee_name}:`, (err as Error).message);
      // Don't block other followups — continue to next
    }
  }

  console.log('📝 Followup processing complete');
}
