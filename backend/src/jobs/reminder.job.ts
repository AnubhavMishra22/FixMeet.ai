import { sql } from '../config/database.js';
import { sendReminderEmail } from '../modules/email/notification.service.js';
import type { BookingWithDetailsRow } from '../modules/bookings/bookings.types.js';

interface BookingForReminder {
  id: string;
  event_type_id: string;
  host_id: string;
  invitee_name: string;
  invitee_email: string;
  invitee_timezone: string;
  invitee_notes: string | null;
  start_time: Date;
  end_time: Date;
  location_type: string;
  location_value: string | null;
  meeting_url: string | null;
  status: string;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: Date | null;
  responses: Record<string, string>;
  cancel_token: string;
  host_calendar_event_id: string | null;
  created_at: Date;
  updated_at: Date;
  event_type_title: string;
  event_type_slug: string;
  event_type_duration_minutes: number;
  event_type_color: string;
  host_name: string;
  host_email: string;
  host_username: string;
  host_timezone: string;
}

function rowToBookingWithDetails(row: BookingForReminder) {
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
    status: row.status as 'confirmed' | 'cancelled' | 'rescheduled' | 'completed' | 'no_show',
    cancellationReason: row.cancellation_reason,
    cancelledBy: row.cancelled_by as 'host' | 'invitee' | null,
    cancelledAt: row.cancelled_at,
    responses: row.responses,
    cancelToken: row.cancel_token,
    hostCalendarEventId: row.host_calendar_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

/**
 * Find bookings that need reminders and send them
 * Run this every 15 minutes via cron or setInterval
 */
export async function processReminders(): Promise<void> {
  const now = new Date();

  console.log('🔔 Processing reminders...');

  // Find bookings starting in ~24 hours (window: 23.5h to 24.5h)
  const reminder24h = await findBookingsNeedingReminder(now, 24);
  console.log(`  Found ${reminder24h.length} bookings needing 24h reminder`);

  // Find bookings starting in ~1 hour (window: 0.5h to 1.5h)
  const reminder1h = await findBookingsNeedingReminder(now, 1);
  console.log(`  Found ${reminder1h.length} bookings needing 1h reminder`);

  for (const booking of reminder24h) {
    await sendReminders(booking, 24);
  }

  for (const booking of reminder1h) {
    await sendReminders(booking, 1);
  }

  console.log('🔔 Reminder processing complete');
}

async function findBookingsNeedingReminder(
  now: Date,
  hoursAhead: number
): Promise<BookingForReminder[]> {
  const windowStart = new Date(
    now.getTime() + (hoursAhead - 0.5) * 60 * 60 * 1000
  );
  const windowEnd = new Date(
    now.getTime() + (hoursAhead + 0.5) * 60 * 60 * 1000
  );
  const reminderType = `${hoursAhead}h`;

  const bookings = await sql<BookingForReminder[]>`
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
    WHERE b.status = 'confirmed'
    AND b.start_time >= ${windowStart.toISOString()}
    AND b.start_time < ${windowEnd.toISOString()}
    AND NOT EXISTS (
      SELECT 1 FROM sent_reminders sr
      WHERE sr.booking_id = b.id
      AND sr.reminder_type = ${reminderType}
    )
  `;

  return bookings;
}

async function sendReminders(
  bookingRow: BookingForReminder,
  hoursUntil: number
): Promise<void> {
  const reminderType = `${hoursUntil}h`;

  try {
    const booking = rowToBookingWithDetails(bookingRow);

    // Send to both host and invitee
    await sendReminderEmail(booking, 'host', hoursUntil);
    await sendReminderEmail(booking, 'invitee', hoursUntil);

    // Record that we sent the reminder
    await sql`
      INSERT INTO sent_reminders (booking_id, reminder_type)
      VALUES (${booking.id}, ${reminderType})
      ON CONFLICT DO NOTHING
    `;

    console.log(
      `  ✓ Sent ${hoursUntil}h reminders for booking ${booking.id}`
    );
  } catch (err) {
    console.error(`  ✗ Failed to send reminders for ${bookingRow.id}:`, err);
  }
}
