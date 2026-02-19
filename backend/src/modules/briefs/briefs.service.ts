import { sql } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError, NotFoundError } from '../../utils/errors.js';
import { sendEmail } from '../email/email.service.js';
import { meetingBriefEmail } from '../email/templates/meeting-brief.template.js';
import { searchPersonInfo } from './scraper.service.js';
import { generateBrief } from './brief-generator.service.js';
import type { MeetingBriefRow, BriefWithBookingRow, MeetingBrief, MeetingBriefWithBooking, PreviousMeeting } from './briefs.types.js';
import type { BriefGenerationResult } from './brief-generator.service.js';

function rowToBrief(row: MeetingBriefRow): MeetingBrief {
  return {
    id: row.id,
    bookingId: row.booking_id,
    userId: row.user_id,
    inviteeSummary: row.invitee_summary,
    companySummary: row.company_summary,
    previousMeetings: row.previous_meetings ?? [],
    talkingPoints: row.talking_points ?? [],
    status: row.status as MeetingBrief['status'],
    attemptCount: row.attempt_count,
    generatedAt: row.generated_at,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  };
}

/** Get brief for a specific booking */
export async function getBriefByBookingId(bookingId: string, userId: string): Promise<MeetingBrief> {
  const rows = await sql<MeetingBriefRow[]>`
    SELECT * FROM meeting_briefs
    WHERE booking_id = ${bookingId} AND user_id = ${userId}
  `;

  if (rows.length === 0) {
    throw new NotFoundError('Meeting brief not found');
  }

  return rowToBrief(rows[0]!);
}

/** List all briefs for a user, joined with booking info */
export async function listBriefs(userId: string): Promise<MeetingBriefWithBooking[]> {
  const rows = await sql<BriefWithBookingRow[]>`
    SELECT
      mb.*,
      b.invitee_name,
      b.invitee_email,
      b.start_time,
      b.end_time,
      et.title as event_type_title
    FROM meeting_briefs mb
    JOIN bookings b ON mb.booking_id = b.id
    JOIN event_types et ON b.event_type_id = et.id
    WHERE mb.user_id = ${userId}
    ORDER BY b.start_time DESC
    LIMIT 50
  `;

  return rows.map((row) => ({
    ...rowToBrief(row),
    booking: {
      inviteeName: row.invitee_name,
      inviteeEmail: row.invitee_email,
      startTime: row.start_time,
      endTime: row.end_time,
      eventTypeTitle: row.event_type_title,
    },
  }));
}

/** Create a pending brief record */
export async function createPendingBrief(bookingId: string, userId: string): Promise<MeetingBrief> {
  const rows = await sql<MeetingBriefRow[]>`
    INSERT INTO meeting_briefs (booking_id, user_id, status)
    VALUES (${bookingId}, ${userId}, 'pending')
    ON CONFLICT (booking_id, user_id) DO NOTHING
    RETURNING *
  `;

  // If conflict (already exists), fetch the existing one
  if (rows.length === 0) {
    return getBriefByBookingId(bookingId, userId);
  }

  return rowToBrief(rows[0]!);
}

// ---------------------------------------------------------------------------
// Status update helpers (used by brief-generator job)
// ---------------------------------------------------------------------------

/** Pending brief row returned by getPendingBriefs query */
export interface PendingBriefRow {
  id: string;
  booking_id: string;
  user_id: string;
  attempt_count: number;
  invitee_name: string;
  invitee_email: string;
  event_type_title: string;
  start_time: Date;
  end_time: Date;
}

const MAX_ATTEMPTS = 3;

/** Get all pending/failed briefs that haven't exceeded max attempts */
export async function getPendingBriefs(): Promise<PendingBriefRow[]> {
  return sql<PendingBriefRow[]>`
    SELECT
      mb.id,
      mb.booking_id,
      mb.user_id,
      mb.attempt_count,
      b.invitee_name,
      b.invitee_email,
      b.start_time,
      b.end_time,
      et.title as event_type_title
    FROM meeting_briefs mb
    JOIN bookings b ON mb.booking_id = b.id
    JOIN event_types et ON b.event_type_id = et.id
    WHERE mb.status IN ('pending', 'failed')
      AND mb.attempt_count < ${MAX_ATTEMPTS}
      AND b.status = 'confirmed'
    ORDER BY mb.created_at ASC
    LIMIT 10
  `;
}

/** Mark a brief as 'generating' and increment attempt count */
export async function markGenerating(briefId: string): Promise<void> {
  await sql`
    UPDATE meeting_briefs
    SET status = 'generating', attempt_count = attempt_count + 1
    WHERE id = ${briefId}
  `;
}

/** Save completed brief with AI-generated content */
export async function markCompleted(
  briefId: string,
  result: BriefGenerationResult,
  previousMeetings: PreviousMeeting[],
): Promise<void> {
  await sql`
    UPDATE meeting_briefs
    SET
      status = 'completed',
      invitee_summary = ${result.inviteeSummary},
      company_summary = ${result.companySummary},
      talking_points = ${sql.json(result.talkingPoints as readonly string[])},
      previous_meetings = ${sql.json(previousMeetings as readonly { date: string; title: string }[])},
      generated_at = NOW()
    WHERE id = ${briefId}
  `;
}

/** Mark a brief as 'failed' */
export async function markFailed(briefId: string): Promise<void> {
  await sql`
    UPDATE meeting_briefs
    SET status = 'failed'
    WHERE id = ${briefId}
  `;
}

/** Fetch previous meetings with the same invitee email for a given host */
export async function getPreviousMeetings(
  hostId: string,
  inviteeEmail: string,
  excludeBookingId: string,
): Promise<PreviousMeeting[]> {
  const rows = await sql<{ start_time: Date; title: string }[]>`
    SELECT b.start_time, et.title
    FROM bookings b
    JOIN event_types et ON b.event_type_id = et.id
    WHERE b.host_id = ${hostId}
      AND b.invitee_email = ${inviteeEmail}
      AND b.id != ${excludeBookingId}
      AND b.status IN ('confirmed', 'completed')
    ORDER BY b.start_time DESC
    LIMIT 10
  `;

  return rows.map((r) => ({
    date: r.start_time.toISOString().split('T')[0]!,
    title: r.title,
  }));
}

// ---------------------------------------------------------------------------
// Email delivery
// ---------------------------------------------------------------------------

interface BriefEmailContext {
  briefId: string;
  bookingId: string;
  userId: string;
  inviteeName: string;
  inviteeEmail: string;
  eventTitle: string;
  startTime: Date;
  endTime: Date;
  inviteeSummary: string;
  companySummary: string;
  talkingPoints: string[];
}

/** Mark brief email as sent */
export async function markSent(briefId: string): Promise<void> {
  await sql`
    UPDATE meeting_briefs
    SET sent_at = NOW()
    WHERE id = ${briefId}
  `;
}

/**
 * Send meeting brief email to the host.
 * Checks user preference and deduplicates (won't send if already sent).
 * Returns true if email was sent, false if skipped.
 */
export async function sendBriefEmail(context: BriefEmailContext): Promise<boolean> {
  // Check if already sent
  const [brief] = await sql<{ sent_at: Date | null }[]>`
    SELECT sent_at FROM meeting_briefs WHERE id = ${context.briefId}
  `;
  if (brief?.sent_at) {
    console.log(`  Brief email already sent for ${context.inviteeName}, skipping`);
    return false;
  }

  // Check user preference
  const [user] = await sql<{ email: string; name: string; timezone: string; brief_emails_enabled: boolean }[]>`
    SELECT email, name, timezone, COALESCE(brief_emails_enabled, true) as brief_emails_enabled
    FROM users WHERE id = ${context.userId}
  `;
  if (!user) return false;

  if (!user.brief_emails_enabled) {
    console.log(`  User ${user.name} has brief emails disabled, skipping`);
    return false;
  }

  // Extract company name from company summary (first sentence or null)
  const companyName = extractCompanyName(context.inviteeEmail);

  // Build and send email
  const dashboardUrl = `${env.FRONTEND_URL}/dashboard/bookings/${context.bookingId}`;
  const emailTemplate = meetingBriefEmail({
    hostName: user.name,
    inviteeName: context.inviteeName,
    eventTitle: context.eventTitle,
    startTime: context.startTime,
    endTime: context.endTime,
    timezone: user.timezone,
    inviteeSummary: context.inviteeSummary,
    companySummary: context.companySummary,
    companyName,
    talkingPoints: context.talkingPoints,
    dashboardUrl,
  });

  const sent = await sendEmail({
    to: user.email,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    text: emailTemplate.text,
  });

  if (sent) {
    await markSent(context.briefId);
  }

  return sent;
}

/** Extract a company name from an email domain (best-effort) */
function extractCompanyName(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;

  const freeProviders = new Set([
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'live.com', 'aol.com', 'icloud.com', 'protonmail.com', 'proton.me',
  ]);
  if (freeProviders.has(domain)) return null;

  // Use the domain name minus TLD as a rough company name
  const parts = domain.split('.');
  if (parts.length >= 2) {
    const name = parts[parts.length - 2]!;
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Manual generation & regeneration
// ---------------------------------------------------------------------------

interface BookingInfoRow {
  id: string;
  host_id: string;
  invitee_name: string;
  invitee_email: string;
  start_time: Date;
  end_time: Date;
  status: string;
  event_type_title: string;
}

/**
 * Manually trigger brief generation for a specific booking.
 * Creates a pending record if it doesn't exist, then runs the full pipeline.
 */
export async function generateBriefForBooking(bookingId: string, userId: string): Promise<MeetingBrief> {
  if (!env.GOOGLE_AI_API_KEY) {
    throw new AppError('AI is not configured on this server', 503, 'AI_NOT_CONFIGURED');
  }

  // Verify booking belongs to user and is confirmed
  const [booking] = await sql<BookingInfoRow[]>`
    SELECT b.id, b.host_id, b.invitee_name, b.invitee_email,
           b.start_time, b.end_time, b.status,
           et.title as event_type_title
    FROM bookings b
    JOIN event_types et ON b.event_type_id = et.id
    WHERE b.id = ${bookingId} AND b.host_id = ${userId}
  `;

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }
  if (booking.status !== 'confirmed') {
    throw new AppError('Can only generate briefs for confirmed bookings', 400, 'INVALID_STATUS');
  }

  // Create or get existing brief
  const brief = await createPendingBrief(bookingId, userId);

  // If already completed, return existing
  if (brief.status === 'completed') {
    return brief;
  }

  // Run the pipeline
  await markGenerating(brief.id);

  try {
    const personInfo = await searchPersonInfo(booking.invitee_name, booking.invitee_email);
    const previousMeetings = await getPreviousMeetings(userId, booking.invitee_email, bookingId);
    const result = await generateBrief({
      inviteeName: booking.invitee_name,
      inviteeEmail: booking.invitee_email,
      eventTitle: booking.event_type_title,
      personInfo,
      previousMeetings,
    });

    await markCompleted(brief.id, result, previousMeetings);

    // Send email (non-blocking)
    sendBriefEmail({
      briefId: brief.id,
      bookingId,
      userId,
      inviteeName: booking.invitee_name,
      inviteeEmail: booking.invitee_email,
      eventTitle: booking.event_type_title,
      startTime: booking.start_time,
      endTime: booking.end_time,
      inviteeSummary: result.inviteeSummary,
      companySummary: result.companySummary,
      talkingPoints: result.talkingPoints,
    }).catch((err) => {
      console.error(`Brief email failed for ${booking.invitee_name}:`, (err as Error).message);
    });

    return getBriefByBookingId(bookingId, userId);
  } catch (err) {
    await markFailed(brief.id).catch(() => {});
    throw new AppError(
      `Brief generation failed: ${(err as Error).message}`,
      500,
      'GENERATION_FAILED',
    );
  }
}

/**
 * Reset an existing brief to 'pending' so it can be regenerated.
 * Clears all generated content and resets attempt count.
 */
export async function resetBriefForRegeneration(bookingId: string, userId: string): Promise<void> {
  const result = await sql`
    UPDATE meeting_briefs
    SET
      status = 'pending',
      attempt_count = 0,
      invitee_summary = NULL,
      company_summary = NULL,
      talking_points = '[]'::jsonb,
      previous_meetings = '[]'::jsonb,
      generated_at = NULL,
      sent_at = NULL
    WHERE booking_id = ${bookingId} AND user_id = ${userId}
  `;

  if (result.count === 0) {
    throw new NotFoundError('Meeting brief not found');
  }
}
