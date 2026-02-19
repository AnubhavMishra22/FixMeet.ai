import { sql } from '../config/database.js';
import { createPendingBrief } from '../modules/briefs/briefs.service.js';

interface UpcomingBookingRow {
  id: string;
  host_id: string;
  invitee_name: string;
  start_time: Date;
}

/**
 * Find bookings happening in 20-28 hours that don't have a brief yet.
 * Creates pending brief records for each.
 * Run this every hour via setInterval.
 */
export async function processBriefGeneration(): Promise<void> {
  const now = new Date();

  console.log('📋 Processing meeting briefs...');

  // Window: bookings starting in 20-28 hours from now
  const windowStart = new Date(now.getTime() + 20 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 28 * 60 * 60 * 1000);

  // Find confirmed bookings in the window that don't have a brief yet
  const bookings = await sql<UpcomingBookingRow[]>`
    SELECT b.id, b.host_id, b.invitee_name, b.start_time
    FROM bookings b
    WHERE b.status = 'confirmed'
    AND b.start_time >= ${windowStart.toISOString()}
    AND b.start_time < ${windowEnd.toISOString()}
    AND NOT EXISTS (
      SELECT 1 FROM meeting_briefs mb
      WHERE mb.booking_id = b.id AND mb.user_id = b.host_id
    )
  `;

  console.log(`  Found ${bookings.length} bookings needing briefs`);

  for (const booking of bookings) {
    try {
      await createPendingBrief(booking.id, booking.host_id);
      console.log(`  ✓ Created pending brief for booking ${booking.id} (${booking.invitee_name})`);
    } catch (err) {
      console.error(`  ✗ Failed to create brief for booking ${booking.id}:`, err);
    }
  }

  console.log('📋 Brief generation processing complete');
}
