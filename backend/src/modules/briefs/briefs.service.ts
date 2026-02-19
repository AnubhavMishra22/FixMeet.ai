import { sql } from '../../config/database.js';
import { NotFoundError } from '../../utils/errors.js';
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
      talking_points = ${JSON.stringify(result.talkingPoints)}::jsonb,
      previous_meetings = ${JSON.stringify(previousMeetings)}::jsonb,
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
