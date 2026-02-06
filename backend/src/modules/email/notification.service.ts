import { sendEmail } from './email.service.js';
import {
  bookingConfirmedHostEmail,
  bookingConfirmedInviteeEmail,
  bookingCancelledEmail,
  bookingRescheduledEmail,
  reminderEmail,
} from './email.templates.js';
import type { BookingEmailData } from './email.types.js';
import type { BookingWithDetails } from '../bookings/bookings.types.js';
import { env } from '../../config/env.js';

function buildEmailData(
  booking: BookingWithDetails,
  timezone: string
): BookingEmailData {
  const cancelUrl = `${env.FRONTEND_URL}/bookings/${booking.id}?token=${booking.cancelToken}`;
  const dashboardUrl = `${env.FRONTEND_URL}/dashboard/bookings/${booking.id}`;

  return {
    hostName: booking.host.name,
    hostEmail: booking.host.email,
    inviteeName: booking.inviteeName,
    inviteeEmail: booking.inviteeEmail,
    eventTitle: booking.eventType.title,
    startTime: booking.startTime,
    endTime: booking.endTime,
    timezone,
    locationType: booking.locationType,
    locationValue: booking.locationValue,
    meetingUrl: booking.meetingUrl,
    cancelUrl,
    dashboardUrl,
  };
}

/**
 * Send confirmation emails to both host and invitee
 */
export async function sendBookingConfirmationEmails(
  booking: BookingWithDetails
): Promise<void> {
  // Email to host (in host's timezone)
  const hostEmailData = buildEmailData(booking, booking.host.timezone);
  const hostEmail = bookingConfirmedHostEmail(hostEmailData);
  await sendEmail({
    to: booking.host.email,
    subject: hostEmail.subject,
    html: hostEmail.html,
    text: hostEmail.text,
  });

  // Email to invitee (in invitee's timezone)
  const inviteeEmailData = buildEmailData(booking, booking.inviteeTimezone);
  const inviteeEmail = bookingConfirmedInviteeEmail(inviteeEmailData);
  await sendEmail({
    to: booking.inviteeEmail,
    subject: inviteeEmail.subject,
    html: inviteeEmail.html,
    text: inviteeEmail.text,
  });
}

/**
 * Send cancellation emails to the other party (not the one who cancelled)
 */
export async function sendBookingCancellationEmails(
  booking: BookingWithDetails,
  cancelledBy: 'host' | 'invitee',
  reason?: string
): Promise<void> {
  // Notify the OTHER party (not the one who cancelled)
  if (cancelledBy === 'host') {
    // Notify invitee
    const emailData = buildEmailData(booking, booking.inviteeTimezone);
    const email = bookingCancelledEmail(emailData, cancelledBy, reason);
    await sendEmail({
      to: booking.inviteeEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  } else {
    // Notify host
    const emailData = buildEmailData(booking, booking.host.timezone);
    const email = bookingCancelledEmail(emailData, cancelledBy, reason);
    await sendEmail({
      to: booking.host.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  }
}

/**
 * Send reschedule notification to invitee
 */
export async function sendBookingRescheduledEmail(
  booking: BookingWithDetails,
  oldStartTime: Date
): Promise<void> {
  // Notify invitee about the reschedule
  const emailData = buildEmailData(booking, booking.inviteeTimezone);
  const email = bookingRescheduledEmail(emailData, oldStartTime, 'invitee');
  await sendEmail({
    to: booking.inviteeEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

/**
 * Send reminder email to a specific recipient
 */
export async function sendReminderEmail(
  booking: BookingWithDetails,
  recipientType: 'host' | 'invitee',
  hoursUntil: number
): Promise<void> {
  const timezone =
    recipientType === 'host' ? booking.host.timezone : booking.inviteeTimezone;
  const emailData = buildEmailData(booking, timezone);

  const email = reminderEmail(emailData, recipientType, hoursUntil);
  const to =
    recipientType === 'host' ? booking.host.email : booking.inviteeEmail;

  await sendEmail({
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}
