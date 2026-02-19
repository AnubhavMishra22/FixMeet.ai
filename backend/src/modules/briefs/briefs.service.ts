import { sql } from '../../config/database.js';
import { NotFoundError } from '../../utils/errors.js';
import type { MeetingBriefRow, BriefWithBookingRow, MeetingBrief, MeetingBriefWithBooking } from './briefs.types.js';

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
