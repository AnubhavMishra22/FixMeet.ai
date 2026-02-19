import { sql } from '../config/database.js';
import { env } from '../config/env.js';
import {
  getPendingBriefs,
  markGenerating,
  markCompleted,
  markFailed,
  getPreviousMeetings,
} from '../modules/briefs/briefs.service.js';
import { searchPersonInfo } from '../modules/briefs/scraper.service.js';
import { generateBrief } from '../modules/briefs/brief-generator.service.js';

/**
 * Brief generation job — runs every hour.
 *
 * Phase 1: Create pending brief records for upcoming bookings (20-28h window).
 * Phase 2: Process pending/failed briefs through the full pipeline:
 *   scrape → fetch previous meetings → AI generate → save to DB.
 */
export async function processBriefGeneration(): Promise<void> {
  const now = new Date();
  console.log('📋 Processing meeting briefs...');

  // -----------------------------------------------------------------------
  // Phase 1: Create pending records for upcoming bookings
  // -----------------------------------------------------------------------
  const windowStart = new Date(now.getTime() + 20 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 28 * 60 * 60 * 1000);

  try {
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
    }
  } catch (err) {
    console.error('  ✗ Failed to create pending briefs:', err);
  }

  // -----------------------------------------------------------------------
  // Phase 2: Generate briefs for pending/failed records
  // -----------------------------------------------------------------------
  if (!env.GOOGLE_AI_API_KEY) {
    console.log('  Skipping AI generation (no GOOGLE_AI_API_KEY)');
    console.log('📋 Brief generation processing complete');
    return;
  }

  const pending = await getPendingBriefs();

  if (pending.length === 0) {
    console.log('  No briefs to generate');
    console.log('📋 Brief generation processing complete');
    return;
  }

  console.log(`  Processing ${pending.length} briefs...`);

  for (const brief of pending) {
    try {
      // Mark as generating
      await markGenerating(brief.id);

      // Step 1: Scrape person/company info
      console.log(`  🔍 Scraping info for ${brief.invitee_name} (${brief.invitee_email})...`);
      const personInfo = await searchPersonInfo(brief.invitee_name, brief.invitee_email);

      // Step 2: Fetch previous meetings with this invitee
      const previousMeetings = await getPreviousMeetings(
        brief.user_id,
        brief.invitee_email,
        brief.booking_id,
      );

      // Step 3: Generate brief with AI
      console.log(`  🤖 Generating brief for ${brief.invitee_name}...`);
      const result = await generateBrief({
        inviteeName: brief.invitee_name,
        inviteeEmail: brief.invitee_email,
        eventTitle: brief.event_type_title,
        personInfo,
        previousMeetings,
      });

      // Step 4: Save to database
      await markCompleted(brief.id, result, previousMeetings);
      console.log(`  ✓ Brief generated for ${brief.invitee_name}`);
    } catch (err) {
      console.error(`  ✗ Failed to generate brief for ${brief.invitee_name}:`, (err as Error).message);
      await markFailed(brief.id).catch(() => {});
    }
  }

  console.log('📋 Brief generation processing complete');
}
