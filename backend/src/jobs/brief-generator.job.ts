import { sql } from '../config/database.js';

/**
 * Find bookings happening in 20-28 hours that don't have a brief yet.
 * Creates pending brief records in a single bulk INSERT...SELECT.
 * Run this every hour via setInterval.
 */
export async function processBriefGeneration(): Promise<void> {
  const now = new Date();

  console.log('📋 Processing meeting briefs...');

  // Window: bookings starting in 20-28 hours from now
  const windowStart = new Date(now.getTime() + 20 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 28 * 60 * 60 * 1000);

  try {
    // Bulk insert pending briefs for all eligible bookings in one query
    const created = await sql<{ booking_id: string }[]>`
      INSERT INTO meeting_briefs (booking_id, user_id, status)
      SELECT b.id, b.host_id, 'pending'
      FROM bookings b
      WHERE b.status = 'confirmed'
        AND b.start_time >= ${windowStart}
        AND b.start_time < ${windowEnd}
        AND NOT EXISTS (
          SELECT 1 FROM meeting_briefs mb
          WHERE mb.booking_id = b.id AND mb.user_id = b.host_id
        )
      ON CONFLICT (booking_id, user_id) DO NOTHING
      RETURNING booking_id
    `;

    if (created.length > 0) {
      console.log(`  ✓ Created ${created.length} pending brief records`);
    } else {
      console.log('  No new briefs needed');
    }
  } catch (err) {
    console.error('  ✗ Failed to process brief generation:', err);
  }

  console.log('📋 Brief generation processing complete');
}
