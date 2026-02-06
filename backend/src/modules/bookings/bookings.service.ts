import crypto from 'crypto';
import { addMinutes, parseISO, isBefore, startOfDay, endOfDay } from 'date-fns';
import { sql } from '../../config/database.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../../utils/errors.js';
import type {
  Booking,
  BookingRow,
  BookingWithDetails,
  BookingWithDetailsRow,
  BookingFilters,
} from './bookings.types.js';
import type {
  CreateBookingInput,
  UpdateBookingInput,
  RescheduleBookingInput,
} from './bookings.schema.js';
import type { EventTypeRow } from '../event-types/event-types.types.js';
import type { JSONValue } from 'postgres';
import {
  sendBookingConfirmationEmails,
  sendBookingCancellationEmails,
  sendBookingRescheduledEmail,
} from '../email/notification.service.js';
import { getAuthenticatedGoogleClient } from '../calendars/calendars.service.js';
import {
  createCalendarEvent,
  getCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from '../calendars/google/google-calendar.service.js';

function rowToBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    eventTypeId: row.event_type_id,
    hostId: row.host_id,
    inviteeName: row.invitee_name,
    inviteeEmail: row.invitee_email,
    inviteeTimezone: row.invitee_timezone,
    inviteeNotes: row.invitee_notes,
    startTime: row.start_time,
    endTime: row.end_time,
    locationType: row.location_type,
    locationValue: row.location_value,
    meetingUrl: row.meeting_url,
    status: row.status as Booking['status'],
    cancellationReason: row.cancellation_reason,
    cancelledBy: row.cancelled_by as Booking['cancelledBy'],
    cancelledAt: row.cancelled_at,
    responses: row.responses,
    cancelToken: row.cancel_token,
    hostCalendarEventId: row.host_calendar_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToBookingWithDetails(row: BookingWithDetailsRow): BookingWithDetails {
  return {
    ...rowToBooking(row),
    eventType: {
      id: row.event_type_id,
      title: row.event_type_title,
      slug: row.event_type_slug,
      durationMinutes: row.event_type_duration_minutes,
      color: row.event_type_color,
    },
    host: {
      id: row.host_id,
      name: row.host_name,
      email: row.host_email,
      username: row.host_username,
      timezone: row.host_timezone,
    },
  };
}

function generateCancelToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Check if a time slot conflicts with existing bookings
 */
async function hasConflict(
  hostId: string,
  startTime: Date,
  endTime: Date,
  bufferBefore: number,
  bufferAfter: number,
  excludeBookingId?: string
): Promise<boolean> {
  // Calculate the effective time window with buffers
  const effectiveStart = addMinutes(startTime, -bufferBefore);
  const effectiveEnd = addMinutes(endTime, bufferAfter);

  let query;
  if (excludeBookingId) {
    query = sql<{ count: string }[]>`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE host_id = ${hostId}
        AND status = 'confirmed'
        AND id != ${excludeBookingId}
        AND (
          (start_time < ${effectiveEnd} AND end_time > ${effectiveStart})
        )
    `;
  } else {
    query = sql<{ count: string }[]>`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE host_id = ${hostId}
        AND status = 'confirmed'
        AND (
          (start_time < ${effectiveEnd} AND end_time > ${effectiveStart})
        )
    `;
  }

  const result = await query;
  const count = parseInt(result[0]?.count ?? '0', 10);
  return count > 0;
}

/**
 * Validate that a booking time is valid for the event type
 */
async function validateBookingTime(
  eventType: EventTypeRow,
  startTime: Date,
  hostId: string,
  excludeBookingId?: string
): Promise<void> {
  const now = new Date();

  // Check if booking is in the past
  if (isBefore(startTime, now)) {
    throw new BadRequestError('Cannot book a time in the past');
  }

  // Check minimum notice
  const minNoticeTime = addMinutes(now, eventType.min_notice_minutes);
  if (isBefore(startTime, minNoticeTime)) {
    throw new BadRequestError(
      `Bookings require at least ${eventType.min_notice_minutes} minutes notice`
    );
  }

  // Check date range
  const startDate = startOfDay(startTime);
  const today = startOfDay(now);

  if (eventType.range_type === 'rolling') {
    const maxDate = addMinutes(today, (eventType.range_days ?? 60) * 24 * 60);
    if (startTime > maxDate) {
      throw new BadRequestError('Selected date is outside the booking window');
    }
  } else if (eventType.range_type === 'range') {
    if (eventType.range_start && startDate < parseISO(eventType.range_start)) {
      throw new BadRequestError('Selected date is before the available range');
    }
    if (eventType.range_end && startDate > parseISO(eventType.range_end)) {
      throw new BadRequestError('Selected date is after the available range');
    }
  }

  // Calculate end time
  const endTime = addMinutes(startTime, eventType.duration_minutes);

  // Check for conflicts with existing bookings
  const conflict = await hasConflict(
    hostId,
    startTime,
    endTime,
    eventType.buffer_before,
    eventType.buffer_after,
    excludeBookingId
  );

  if (conflict) {
    throw new ConflictError('This time slot is no longer available');
  }
}

/**
 * Create a new booking
 */
export async function createBooking(
  eventTypeId: string,
  input: CreateBookingInput
): Promise<BookingWithDetails> {
  // Fetch event type with host info
  const eventTypes = await sql<
    (EventTypeRow & { host_name: string; host_email: string; host_username: string; host_timezone: string })[]
  >`
    SELECT et.*, u.name as host_name, u.email as host_email, u.username as host_username, u.timezone as host_timezone
    FROM event_types et
    JOIN users u ON et.user_id = u.id
    WHERE et.id = ${eventTypeId} AND et.is_active = true
  `;

  const eventType = eventTypes[0];
  if (!eventType) {
    throw new NotFoundError('Event type not found');
  }

  const startTime = parseISO(input.startTime);

  // Validate the booking time
  await validateBookingTime(eventType, startTime, eventType.user_id);

  // Calculate end time
  const endTime = addMinutes(startTime, eventType.duration_minutes);

  // Generate cancel token
  const cancelToken = generateCancelToken();

  // Create booking
  const rows = await sql<BookingRow[]>`
    INSERT INTO bookings (
      event_type_id,
      host_id,
      invitee_name,
      invitee_email,
      invitee_timezone,
      invitee_notes,
      start_time,
      end_time,
      location_type,
      location_value,
      responses,
      cancel_token
    ) VALUES (
      ${eventTypeId},
      ${eventType.user_id},
      ${input.inviteeName},
      ${input.inviteeEmail},
      ${input.inviteeTimezone},
      ${input.inviteeNotes ?? null},
      ${startTime.toISOString()},
      ${endTime.toISOString()},
      ${eventType.location_type},
      ${eventType.location_value},
      ${sql.json(input.responses as unknown as JSONValue)},
      ${cancelToken}
    )
    RETURNING *
  `;

  const row = rows[0];
  if (!row) {
    throw new Error('Failed to create booking');
  }

  // Build booking with details
  let bookingWithDetails: BookingWithDetails = {
    ...rowToBooking(row),
    eventType: {
      id: eventType.id,
      title: eventType.title,
      slug: eventType.slug,
      durationMinutes: eventType.duration_minutes,
      color: eventType.color,
    },
    host: {
      id: eventType.user_id,
      name: eventType.host_name,
      email: eventType.host_email,
      username: eventType.host_username,
      timezone: eventType.host_timezone,
    },
  };

  // Create Google Calendar event if host has connected calendar
  try {
    const googleClient = await getAuthenticatedGoogleClient(eventType.user_id);
    if (googleClient) {
      // Create the calendar event
      const eventId = await createCalendarEvent(googleClient.client, googleClient.calendarId, {
        summary: `${eventType.title} with ${input.inviteeName}`,
        description: input.inviteeNotes || undefined,
        startTime,
        endTime,
        attendeeEmail: input.inviteeEmail,
      });

      // Get the event details to retrieve Meet link
      const eventDetails = await getCalendarEvent(
        googleClient.client,
        googleClient.calendarId,
        eventId
      );

      // Update booking with calendar event ID and Meet URL
      const updateFields: { host_calendar_event_id: string; meeting_url?: string } = {
        host_calendar_event_id: eventId,
      };

      if (eventDetails.meetingUrl) {
        updateFields.meeting_url = eventDetails.meetingUrl;
      }

      const updatedRows = await sql<BookingRow[]>`
        UPDATE bookings
        SET host_calendar_event_id = ${eventId},
            meeting_url = COALESCE(${eventDetails.meetingUrl ?? null}, meeting_url),
            updated_at = NOW()
        WHERE id = ${row.id}
        RETURNING *
      `;

      if (updatedRows[0]) {
        bookingWithDetails = {
          ...rowToBooking(updatedRows[0]),
          eventType: bookingWithDetails.eventType,
          host: bookingWithDetails.host,
        };
      }
    }
  } catch (err) {
    console.error('Failed to create Google Calendar event:', err);
    // Continue without calendar event - booking is still valid
  }

  // Send confirmation emails (don't await - send in background)
  sendBookingConfirmationEmails(bookingWithDetails).catch((err) => {
    console.error('Failed to send confirmation emails:', err);
  });

  return bookingWithDetails;
}

/**
 * Get bookings for a host with filters
 */
export async function getBookingsByHost(
  hostId: string,
  filters: BookingFilters
): Promise<BookingWithDetails[]> {
  const conditions: string[] = ['b.host_id = $1'];
  const params: (string | number | boolean | null)[] = [hostId];
  let paramIndex = 2;

  // Status filter
  if (filters.status && filters.status !== 'all') {
    conditions.push(`b.status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  // Date range filters
  if (filters.from) {
    conditions.push(`b.start_time >= $${paramIndex}`);
    params.push(filters.from);
    paramIndex++;
  }

  if (filters.to) {
    conditions.push(`b.start_time <= $${paramIndex}`);
    params.push(filters.to);
    paramIndex++;
  }

  // Upcoming filter
  if (filters.upcoming) {
    conditions.push(`b.start_time >= $${paramIndex}`);
    params.push(new Date().toISOString());
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  const rows = await sql.unsafe<BookingWithDetailsRow[]>(
    `
    SELECT
      b.*,
      et.title as event_type_title,
      et.slug as event_type_slug,
      et.duration_minutes as event_type_duration_minutes,
      et.color as event_type_color,
      u.name as host_name,
      u.email as host_email,
      u.username as host_username,
      u.timezone as host_timezone
    FROM bookings b
    JOIN event_types et ON b.event_type_id = et.id
    JOIN users u ON b.host_id = u.id
    WHERE ${whereClause}
    ORDER BY b.start_time ASC
    `,
    params as (string | number | boolean | null)[]
  );

  return rows.map(rowToBookingWithDetails);
}

/**
 * Get a single booking by ID (for host)
 */
export async function getBookingById(
  hostId: string,
  bookingId: string
): Promise<BookingWithDetails> {
  const rows = await sql<BookingWithDetailsRow[]>`
    SELECT
      b.*,
      et.title as event_type_title,
      et.slug as event_type_slug,
      et.duration_minutes as event_type_duration_minutes,
      et.color as event_type_color,
      u.name as host_name,
      u.email as host_email,
      u.username as host_username,
      u.timezone as host_timezone
    FROM bookings b
    JOIN event_types et ON b.event_type_id = et.id
    JOIN users u ON b.host_id = u.id
    WHERE b.id = ${bookingId} AND b.host_id = ${hostId}
  `;

  const row = rows[0];
  if (!row) {
    throw new NotFoundError('Booking not found');
  }

  return rowToBookingWithDetails(row);
}

/**
 * Get a booking by cancel token (for invitee)
 */
export async function getBookingByToken(
  bookingId: string,
  cancelToken: string
): Promise<BookingWithDetails> {
  const rows = await sql<BookingWithDetailsRow[]>`
    SELECT
      b.*,
      et.title as event_type_title,
      et.slug as event_type_slug,
      et.duration_minutes as event_type_duration_minutes,
      et.color as event_type_color,
      u.name as host_name,
      u.email as host_email,
      u.username as host_username,
      u.timezone as host_timezone
    FROM bookings b
    JOIN event_types et ON b.event_type_id = et.id
    JOIN users u ON b.host_id = u.id
    WHERE b.id = ${bookingId} AND b.cancel_token = ${cancelToken}
  `;

  const row = rows[0];
  if (!row) {
    throw new NotFoundError('Booking not found');
  }

  return rowToBookingWithDetails(row);
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  bookingId: string,
  cancelledBy: 'host' | 'invitee',
  reason?: string,
  hostId?: string,
  cancelToken?: string
): Promise<BookingWithDetails> {
  // Verify access
  let booking: BookingWithDetailsRow | undefined;

  if (cancelledBy === 'host' && hostId) {
    const rows = await sql<BookingWithDetailsRow[]>`
      SELECT
        b.*,
        et.title as event_type_title,
        et.slug as event_type_slug,
        et.duration_minutes as event_type_duration_minutes,
        et.color as event_type_color,
        u.name as host_name,
        u.email as host_email,
        u.username as host_username,
        u.timezone as host_timezone
      FROM bookings b
      JOIN event_types et ON b.event_type_id = et.id
      JOIN users u ON b.host_id = u.id
      WHERE b.id = ${bookingId} AND b.host_id = ${hostId}
    `;
    booking = rows[0];
  } else if (cancelledBy === 'invitee' && cancelToken) {
    const rows = await sql<BookingWithDetailsRow[]>`
      SELECT
        b.*,
        et.title as event_type_title,
        et.slug as event_type_slug,
        et.duration_minutes as event_type_duration_minutes,
        et.color as event_type_color,
        u.name as host_name,
        u.email as host_email,
        u.username as host_username,
        u.timezone as host_timezone
      FROM bookings b
      JOIN event_types et ON b.event_type_id = et.id
      JOIN users u ON b.host_id = u.id
      WHERE b.id = ${bookingId} AND b.cancel_token = ${cancelToken}
    `;
    booking = rows[0];
  }

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  if (booking.status === 'cancelled') {
    throw new BadRequestError('Booking is already cancelled');
  }

  // Update booking
  const rows = await sql<BookingRow[]>`
    UPDATE bookings
    SET
      status = 'cancelled',
      cancelled_by = ${cancelledBy},
      cancelled_at = NOW(),
      cancellation_reason = ${reason ?? null},
      updated_at = NOW()
    WHERE id = ${bookingId}
    RETURNING *
  `;

  const row = rows[0];
  if (!row) {
    throw new Error('Failed to cancel booking');
  }

  const cancelledBooking: BookingWithDetails = {
    ...rowToBooking(row),
    eventType: {
      id: booking.event_type_id,
      title: booking.event_type_title,
      slug: booking.event_type_slug,
      durationMinutes: booking.event_type_duration_minutes,
      color: booking.event_type_color,
    },
    host: {
      id: booking.host_id,
      name: booking.host_name,
      email: booking.host_email,
      username: booking.host_username,
      timezone: booking.host_timezone,
    },
  };

  // Delete Google Calendar event if exists (don't await)
  if (booking.host_calendar_event_id) {
    (async () => {
      try {
        const googleClient = await getAuthenticatedGoogleClient(booking.host_id);
        if (googleClient) {
          await deleteCalendarEvent(
            googleClient.client,
            googleClient.calendarId,
            booking.host_calendar_event_id!
          );
        }
      } catch (err) {
        console.error('Failed to delete Google Calendar event:', err);
      }
    })();
  }

  // Send cancellation email to the other party (don't await)
  sendBookingCancellationEmails(cancelledBooking, cancelledBy, reason).catch(
    (err) => {
      console.error('Failed to send cancellation email:', err);
    }
  );

  return cancelledBooking;
}

/**
 * Update a booking (host only)
 */
export async function updateBooking(
  hostId: string,
  bookingId: string,
  input: UpdateBookingInput
): Promise<BookingWithDetails> {
  // Verify booking belongs to host
  const existing = await getBookingById(hostId, bookingId);

  const updates: Record<string, unknown> = {};

  if (input.status !== undefined) {
    updates.status = input.status;
    if (input.status === 'cancelled') {
      updates.cancelled_by = 'host';
      updates.cancelled_at = sql`NOW()`;
    }
  }

  if (input.cancellationReason !== undefined) {
    updates.cancellation_reason = input.cancellationReason;
  }

  updates.updated_at = sql`NOW()`;

  if (Object.keys(updates).length === 1) {
    return existing;
  }

  const rows = await sql<BookingWithDetailsRow[]>`
    UPDATE bookings b
    SET ${sql(updates)}
    WHERE b.id = ${bookingId} AND b.host_id = ${hostId}
    RETURNING
      b.*,
      (SELECT title FROM event_types WHERE id = b.event_type_id) as event_type_title,
      (SELECT slug FROM event_types WHERE id = b.event_type_id) as event_type_slug,
      (SELECT duration_minutes FROM event_types WHERE id = b.event_type_id) as event_type_duration_minutes,
      (SELECT color FROM event_types WHERE id = b.event_type_id) as event_type_color,
      (SELECT name FROM users WHERE id = b.host_id) as host_name,
      (SELECT email FROM users WHERE id = b.host_id) as host_email,
      (SELECT username FROM users WHERE id = b.host_id) as host_username,
      (SELECT timezone FROM users WHERE id = b.host_id) as host_timezone
  `;

  const row = rows[0];
  if (!row) {
    throw new Error('Failed to update booking');
  }

  return rowToBookingWithDetails(row);
}

/**
 * Reschedule a booking (host only)
 */
export async function rescheduleBooking(
  hostId: string,
  bookingId: string,
  input: RescheduleBookingInput
): Promise<BookingWithDetails> {
  // Get existing booking with event type info
  const bookingRows = await sql<(BookingRow & { duration_minutes: number; buffer_before: number; buffer_after: number; min_notice_minutes: number; range_type: string; range_days: number | null; range_start: string | null; range_end: string | null })[]>`
    SELECT b.*, et.duration_minutes, et.buffer_before, et.buffer_after, et.min_notice_minutes, et.range_type, et.range_days, et.range_start, et.range_end
    FROM bookings b
    JOIN event_types et ON b.event_type_id = et.id
    WHERE b.id = ${bookingId} AND b.host_id = ${hostId}
  `;

  const bookingData = bookingRows[0];
  if (!bookingData) {
    throw new NotFoundError('Booking not found');
  }

  if (bookingData.status === 'cancelled') {
    throw new BadRequestError('Cannot reschedule a cancelled booking');
  }

  // Store old start time for notification
  const oldStartTime = bookingData.start_time;

  const newStartTime = parseISO(input.startTime);

  // Create a mock event type object for validation
  const eventTypeLike = {
    min_notice_minutes: bookingData.min_notice_minutes,
    range_type: bookingData.range_type,
    range_days: bookingData.range_days,
    range_start: bookingData.range_start,
    range_end: bookingData.range_end,
    duration_minutes: bookingData.duration_minutes,
    buffer_before: bookingData.buffer_before,
    buffer_after: bookingData.buffer_after,
  } as EventTypeRow;

  // Validate new time (exclude current booking from conflict check)
  await validateBookingTime(eventTypeLike, newStartTime, hostId, bookingId);

  const newEndTime = addMinutes(newStartTime, bookingData.duration_minutes);

  // Update booking
  const rows = await sql<BookingWithDetailsRow[]>`
    UPDATE bookings b
    SET
      start_time = ${newStartTime.toISOString()},
      end_time = ${newEndTime.toISOString()},
      status = 'confirmed',
      updated_at = NOW()
    WHERE b.id = ${bookingId} AND b.host_id = ${hostId}
    RETURNING
      b.*,
      (SELECT title FROM event_types WHERE id = b.event_type_id) as event_type_title,
      (SELECT slug FROM event_types WHERE id = b.event_type_id) as event_type_slug,
      (SELECT duration_minutes FROM event_types WHERE id = b.event_type_id) as event_type_duration_minutes,
      (SELECT color FROM event_types WHERE id = b.event_type_id) as event_type_color,
      (SELECT name FROM users WHERE id = b.host_id) as host_name,
      (SELECT email FROM users WHERE id = b.host_id) as host_email,
      (SELECT username FROM users WHERE id = b.host_id) as host_username,
      (SELECT timezone FROM users WHERE id = b.host_id) as host_timezone
  `;

  const row = rows[0];
  if (!row) {
    throw new Error('Failed to reschedule booking');
  }

  const rescheduledBooking = rowToBookingWithDetails(row);

  // Update Google Calendar event if exists (don't await)
  if (bookingData.host_calendar_event_id) {
    (async () => {
      try {
        const googleClient = await getAuthenticatedGoogleClient(hostId);
        if (googleClient) {
          await updateCalendarEvent(
            googleClient.client,
            googleClient.calendarId,
            bookingData.host_calendar_event_id!,
            {
              startTime: newStartTime,
              endTime: newEndTime,
            }
          );
        }
      } catch (err) {
        console.error('Failed to update Google Calendar event:', err);
      }
    })();
  }

  // Send reschedule notification to invitee if requested (don't await)
  if (input.notifyInvitee !== false) {
    sendBookingRescheduledEmail(rescheduledBooking, oldStartTime).catch((err) => {
      console.error('Failed to send reschedule email:', err);
    });
  }

  return rescheduledBooking;
}

/**
 * Get confirmed bookings for a host on a specific date
 * Used by availability service to exclude booked slots
 */
export async function getConfirmedBookingsForDate(
  hostId: string,
  date: Date
): Promise<{ startTime: Date; endTime: Date }[]> {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const rows = await sql<{ start_time: Date; end_time: Date }[]>`
    SELECT start_time, end_time
    FROM bookings
    WHERE host_id = ${hostId}
      AND status = 'confirmed'
      AND start_time >= ${dayStart.toISOString()}
      AND start_time <= ${dayEnd.toISOString()}
    ORDER BY start_time ASC
  `;

  return rows.map((row) => ({
    startTime: row.start_time,
    endTime: row.end_time,
  }));
}
