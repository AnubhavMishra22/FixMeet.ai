import { sql } from '../config/database.js';
import { env } from '../config/env.js';
import {
  getPendingBriefs,
  markGenerating,
  markCompleted,
  markFailed,
  getPreviousMeetings,
  sendBriefEmail,
} from '../modules/briefs/briefs.service.js';
import { searchPersonInfo } from '../modules/briefs/scraper.service.js';
import { generateBrief } from '../modules/briefs/brief-generator.service.js';

/**
 * Brief generation job — runs every hour.
 *
 * Phase 1: Create pending brief records for upcoming bookings.
 *   Uses each user's brief_generation_hours setting to determine the window.
 *   Respects briefs_enabled preference.
 * Phase 2: Process pending/failed briefs through the full pipeline:
 *   scrape → fetch previous meetings → AI generate → save to DB → send email.
 */
export async function processBriefGeneration(): Promise<void> {
  // Phase 1: Create pending records for upcoming bookings
  try {
    const created = await sql<{ booking_id: string }[]>`
      INSERT INTO meeting_briefs (booking_id, user_id, status)
      SELECT b.id, b.host_id, 'pending'
      FROM bookings b
      JOIN users u ON b.host_id = u.id
      WHERE b.status = 'confirmed'
        AND COALESCE(u.briefs_enabled, true) = true
        AND b.start_time >= NOW()
        AND b.start_time < NOW() + (COALESCE(u.brief_generation_hours, 24) || ' hours')::interval
        AND NOT EXISTS (
          SELECT 1 FROM meeting_briefs mb
          WHERE mb.booking_id = b.id AND mb.user_id = b.host_id
        )
      ON CONFLICT (booking_id, user_id) DO NOTHING
      RETURNING booking_id
    `;

    if (created.length > 0) {
      console.log(`Briefs: created ${created.length} pending records`);
    }
  } catch (err) {
    console.error('Briefs: failed to create pending records:', err);
  }

  // Phase 2: Generate briefs for pending/failed records
  if (!env.GOOGLE_AI_API_KEY) return;

  const pending = await getPendingBriefs();
  if (pending.length === 0) return;

  console.log(`Briefs: generating ${pending.length}...`);

  for (const brief of pending) {
    try {
      // Mark as generating
      await markGenerating(brief.id);

      // Step 1: Scrape person/company info
      // Step 1: Scrape person/company info
      const personInfo = await searchPersonInfo(brief.invitee_name, brief.invitee_email);

      // Step 2: Fetch previous meetings with this invitee
      const previousMeetings = await getPreviousMeetings(
        brief.user_id,
        brief.invitee_email,
        brief.booking_id,
      );

      // Step 3: Generate brief with AI
      const result = await generateBrief({
        inviteeName: brief.invitee_name,
        inviteeEmail: brief.invitee_email,
        eventTitle: brief.event_type_title,
        personInfo,
        previousMeetings,
      });

      // Step 4: Save to database
      await markCompleted(brief.id, result, previousMeetings);

      // Step 5: Send email to host
      try {
        const sent = await sendBriefEmail({
          briefId: brief.id,
          bookingId: brief.booking_id,
          userId: brief.user_id,
          inviteeName: brief.invitee_name,
          inviteeEmail: brief.invitee_email,
          eventTitle: brief.event_type_title,
          startTime: brief.start_time,
          endTime: brief.end_time,
          inviteeSummary: result.inviteeSummary,
          companySummary: result.companySummary,
          talkingPoints: result.talkingPoints,
        });
        if (sent) {
          console.log(`Brief email sent for ${brief.invitee_name}`);
        }
      } catch (emailErr) {
        console.error(`Brief email failed for ${brief.invitee_name}:`, (emailErr as Error).message);
      }
    } catch (err) {
      console.error(`Brief generation failed for ${brief.invitee_name}:`, (err as Error).message);
      await markFailed(brief.id).catch((failErr) => {
        console.error(`Failed to mark brief ${brief.id} as failed:`, (failErr as Error).message);
      });
    }
  }

  console.log(`Briefs: ${pending.length} processed`);
}
