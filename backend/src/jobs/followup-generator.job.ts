import { sql } from '../config/database.js';

/**
 * Followup generator job — runs every 30 minutes.
 *
 * Finds bookings that ended 30–90 minutes ago and creates draft followup
 * records for the host. AI generation of content is handled in Step 2.
 */
export async function processFollowupGeneration(): Promise<void> {
  console.log('📝 Processing meeting followups...');

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

  console.log('📝 Followup processing complete');
}
