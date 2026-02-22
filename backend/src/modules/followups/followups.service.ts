import { sql } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';
import type {
  MeetingFollowup,
  MeetingFollowupRow,
  MeetingFollowupWithBooking,
  FollowupWithBookingRow,
} from './followups.types.js';

// ── Row → Object mappers ────────────────────────────────────────────────

function mapRow(row: MeetingFollowupRow): MeetingFollowup {
  return {
    id: row.id,
    bookingId: row.booking_id,
    userId: row.user_id,
    subject: row.subject,
    body: row.body,
    actionItems: row.action_items ?? [],
    status: row.status as MeetingFollowup['status'],
    sentAt: row.sent_at,
    createdAt: row.created_at,
  };
}

function mapRowWithBooking(row: FollowupWithBookingRow): MeetingFollowupWithBooking {
  return {
    ...mapRow(row),
    booking: {
      inviteeName: row.invitee_name,
      inviteeEmail: row.invitee_email,
      startTime: row.start_time,
      endTime: row.end_time,
      eventTypeTitle: row.event_type_title,
    },
  };
}

// ── Queries ─────────────────────────────────────────────────────────────

/** List all followups for a user, newest first */
export async function listFollowups(userId: string): Promise<MeetingFollowupWithBooking[]> {
  const rows = await sql<FollowupWithBookingRow[]>`
    SELECT
      mf.*,
      b.invitee_name,
      b.invitee_email,
      b.start_time,
      b.end_time,
      et.title AS event_type_title
    FROM meeting_followups mf
    JOIN bookings b ON mf.booking_id = b.id
    JOIN event_types et ON b.event_type_id = et.id
    WHERE mf.user_id = ${userId}
    ORDER BY mf.created_at DESC
  `;
  return rows.map(mapRowWithBooking);
}

/** Get a single followup by ID (must belong to user) */
export async function getFollowupById(
  id: string,
  userId: string,
): Promise<MeetingFollowupWithBooking> {
  const rows = await sql<FollowupWithBookingRow[]>`
    SELECT
      mf.*,
      b.invitee_name,
      b.invitee_email,
      b.start_time,
      b.end_time,
      et.title AS event_type_title
    FROM meeting_followups mf
    JOIN bookings b ON mf.booking_id = b.id
    JOIN event_types et ON b.event_type_id = et.id
    WHERE mf.id = ${id} AND mf.user_id = ${userId}
  `;
  if (rows.length === 0) {
    throw new AppError('Followup not found', 404, 'NOT_FOUND');
  }
  return mapRowWithBooking(rows[0]);
}

/** Update a draft followup (subject, body, action_items) */
export async function updateFollowup(
  id: string,
  userId: string,
  updates: { subject?: string; body?: string; actionItems?: string[] },
): Promise<MeetingFollowup> {
  // Ensure it exists and belongs to user
  const existing = await sql<MeetingFollowupRow[]>`
    SELECT * FROM meeting_followups WHERE id = ${id} AND user_id = ${userId}
  `;
  if (existing.length === 0) {
    throw new AppError('Followup not found', 404, 'NOT_FOUND');
  }
  if (existing[0].status === 'sent') {
    throw new AppError('Cannot edit a sent followup', 400, 'VALIDATION_ERROR');
  }

  const rows = await sql<MeetingFollowupRow[]>`
    UPDATE meeting_followups
    SET
      subject = COALESCE(${updates.subject ?? null}, subject),
      body = COALESCE(${updates.body ?? null}, body),
      action_items = COALESCE(${updates.actionItems ? sql.json(updates.actionItems) : null}, action_items)
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  return mapRow(rows[0]);
}

/** Mark followup as sent */
export async function markSent(id: string, userId: string): Promise<MeetingFollowup> {
  const existing = await sql<MeetingFollowupRow[]>`
    SELECT * FROM meeting_followups WHERE id = ${id} AND user_id = ${userId}
  `;
  if (existing.length === 0) {
    throw new AppError('Followup not found', 404, 'NOT_FOUND');
  }
  if (existing[0].status === 'sent') {
    throw new AppError('Followup already sent', 400, 'VALIDATION_ERROR');
  }
  if (!existing[0].subject || !existing[0].body) {
    throw new AppError('Cannot send followup without subject and body', 400, 'VALIDATION_ERROR');
  }

  const rows = await sql<MeetingFollowupRow[]>`
    UPDATE meeting_followups
    SET status = 'sent', sent_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  return mapRow(rows[0]);
}

/** Create a draft followup for a booking (used by the job) */
export async function createDraftFollowup(
  bookingId: string,
  userId: string,
): Promise<MeetingFollowup> {
  const rows = await sql<MeetingFollowupRow[]>`
    INSERT INTO meeting_followups (booking_id, user_id, status)
    VALUES (${bookingId}, ${userId}, 'draft')
    ON CONFLICT (booking_id, user_id) DO NOTHING
    RETURNING *
  `;
  if (rows.length === 0) {
    // Already exists — return existing
    const existing = await sql<MeetingFollowupRow[]>`
      SELECT * FROM meeting_followups
      WHERE booking_id = ${bookingId} AND user_id = ${userId}
    `;
    return mapRow(existing[0]);
  }
  return mapRow(rows[0]);
}
