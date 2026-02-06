import { formatInTimeZone } from 'date-fns-tz';
import type { BookingEmailData, EmailTemplate } from './email.types.js';

// Helper to format time in a timezone
function formatDateTime(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "EEEE, MMMM d, yyyy 'at' h:mm a zzz");
}

// ============ BOOKING CONFIRMED - HOST ============

export function bookingConfirmedHostEmail(data: BookingEmailData): EmailTemplate {
  const formattedTime = formatDateTime(data.startTime, data.timezone);

  return {
    subject: `New booking: ${data.eventTitle} with ${data.inviteeName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .detail { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail:last-of-type { border-bottom: none; }
          .label { font-weight: 600; color: #666; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
          .value { color: #111; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: 500; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
          a { color: #3B82F6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 New Booking Confirmed</h1>
          </div>
          <div class="content">
            <p>Hi ${data.hostName},</p>
            <p>You have a new booking!</p>

            <div class="detail">
              <span class="label">What</span>
              <span class="value">${data.eventTitle}</span>
            </div>
            <div class="detail">
              <span class="label">When</span>
              <span class="value">${formattedTime}</span>
            </div>
            <div class="detail">
              <span class="label">Who</span>
              <span class="value">${data.inviteeName} (<a href="mailto:${data.inviteeEmail}">${data.inviteeEmail}</a>)</span>
            </div>
            <div class="detail">
              <span class="label">Where</span>
              <span class="value">${data.locationType}${data.meetingUrl ? ` - <a href="${data.meetingUrl}">${data.meetingUrl}</a>` : ''}</span>
            </div>

            ${data.dashboardUrl ? `<a href="${data.dashboardUrl}" class="button">View in Dashboard</a>` : ''}

            <div class="footer">
              <p>This email was sent by FixMeet.ai</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
New Booking Confirmed

Hi ${data.hostName},

You have a new booking!

What: ${data.eventTitle}
When: ${formattedTime}
Who: ${data.inviteeName} (${data.inviteeEmail})
Where: ${data.locationType}${data.meetingUrl ? ` - ${data.meetingUrl}` : ''}

${data.dashboardUrl ? `View in Dashboard: ${data.dashboardUrl}` : ''}

- FixMeet.ai
    `.trim(),
  };
}

// ============ BOOKING CONFIRMED - INVITEE ============

export function bookingConfirmedInviteeEmail(data: BookingEmailData): EmailTemplate {
  const formattedTime = formatDateTime(data.startTime, data.timezone);

  return {
    subject: `Confirmed: ${data.eventTitle} with ${data.hostName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .detail { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail:last-of-type { border-bottom: none; }
          .label { font-weight: 600; color: #666; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
          .value { color: #111; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: 500; }
          .cancel-link { color: #EF4444; font-size: 14px; margin-top: 15px; display: block; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
          a { color: #3B82F6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Booking Confirmed</h1>
          </div>
          <div class="content">
            <p>Hi ${data.inviteeName},</p>
            <p>Your meeting has been scheduled!</p>

            <div class="detail">
              <span class="label">What</span>
              <span class="value">${data.eventTitle}</span>
            </div>
            <div class="detail">
              <span class="label">When</span>
              <span class="value">${formattedTime}</span>
            </div>
            <div class="detail">
              <span class="label">With</span>
              <span class="value">${data.hostName}</span>
            </div>
            <div class="detail">
              <span class="label">Where</span>
              <span class="value">${data.locationType}${data.meetingUrl ? ` - <a href="${data.meetingUrl}">${data.meetingUrl}</a>` : ''}</span>
            </div>

            ${data.cancelUrl ? `<a href="${data.cancelUrl}" class="cancel-link">Need to cancel or reschedule?</a>` : ''}

            <div class="footer">
              <p>This email was sent by FixMeet.ai on behalf of ${data.hostName}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Booking Confirmed ✓

Hi ${data.inviteeName},

Your meeting has been scheduled!

What: ${data.eventTitle}
When: ${formattedTime}
With: ${data.hostName}
Where: ${data.locationType}${data.meetingUrl ? ` - ${data.meetingUrl}` : ''}

${data.cancelUrl ? `Need to cancel or reschedule? ${data.cancelUrl}` : ''}

- FixMeet.ai
    `.trim(),
  };
}

// ============ BOOKING CANCELLED ============

export function bookingCancelledEmail(
  data: BookingEmailData,
  cancelledBy: 'host' | 'invitee',
  reason?: string
): EmailTemplate {
  const formattedTime = formatDateTime(data.startTime, data.timezone);
  const cancelledByName = cancelledBy === 'host' ? data.hostName : data.inviteeName;

  return {
    subject: `Cancelled: ${data.eventTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #EF4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .detail { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail:last-of-type { border-bottom: none; }
          .label { font-weight: 600; color: #666; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
          .value { color: #111; }
          .reason { background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 6px; margin-top: 15px; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Booking Cancelled</h1>
          </div>
          <div class="content">
            <p>This meeting has been cancelled by ${cancelledByName}.</p>

            <div class="detail">
              <span class="label">What</span>
              <span class="value">${data.eventTitle}</span>
            </div>
            <div class="detail">
              <span class="label">Was scheduled for</span>
              <span class="value">${formattedTime}</span>
            </div>

            ${reason ? `<div class="reason"><strong>Reason:</strong> ${reason}</div>` : ''}

            <div class="footer">
              <p>This email was sent by FixMeet.ai</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Booking Cancelled

This meeting has been cancelled by ${cancelledByName}.

What: ${data.eventTitle}
Was scheduled for: ${formattedTime}
${reason ? `Reason: ${reason}` : ''}

- FixMeet.ai
    `.trim(),
  };
}

// ============ BOOKING RESCHEDULED ============

export function bookingRescheduledEmail(
  data: BookingEmailData,
  oldStartTime: Date,
  recipientType: 'host' | 'invitee'
): EmailTemplate {
  const newFormattedTime = formatDateTime(data.startTime, data.timezone);
  const oldFormattedTime = formatDateTime(oldStartTime, data.timezone);
  const recipientName = recipientType === 'host' ? data.hostName : data.inviteeName;
  const otherPerson = recipientType === 'host' ? data.inviteeName : data.hostName;

  return {
    subject: `Rescheduled: ${data.eventTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F59E0B; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .detail { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail:last-of-type { border-bottom: none; }
          .label { font-weight: 600; color: #666; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
          .value { color: #111; }
          .old-time { text-decoration: line-through; color: #999; }
          .new-time { color: #10B981; font-weight: 600; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔄 Meeting Rescheduled</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p>Your meeting with ${otherPerson} has been rescheduled.</p>

            <div class="detail">
              <span class="label">What</span>
              <span class="value">${data.eventTitle}</span>
            </div>
            <div class="detail">
              <span class="label">Old time</span>
              <span class="value old-time">${oldFormattedTime}</span>
            </div>
            <div class="detail">
              <span class="label">New time</span>
              <span class="value new-time">${newFormattedTime}</span>
            </div>
            <div class="detail">
              <span class="label">Where</span>
              <span class="value">${data.locationType}${data.meetingUrl ? ` - <a href="${data.meetingUrl}">${data.meetingUrl}</a>` : ''}</span>
            </div>

            <div class="footer">
              <p>This email was sent by FixMeet.ai</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Meeting Rescheduled

Hi ${recipientName},

Your meeting with ${otherPerson} has been rescheduled.

What: ${data.eventTitle}
Old time: ${oldFormattedTime}
New time: ${newFormattedTime}
Where: ${data.locationType}${data.meetingUrl ? ` - ${data.meetingUrl}` : ''}

- FixMeet.ai
    `.trim(),
  };
}

// ============ REMINDER ============

export function reminderEmail(
  data: BookingEmailData,
  recipientType: 'host' | 'invitee',
  hoursUntil: number
): EmailTemplate {
  const formattedTime = formatDateTime(data.startTime, data.timezone);
  const recipientName = recipientType === 'host' ? data.hostName : data.inviteeName;
  const otherPerson = recipientType === 'host' ? data.inviteeName : data.hostName;
  const timeLabel = hoursUntil === 24 ? 'tomorrow' : 'in 1 hour';

  return {
    subject: `Reminder: ${data.eventTitle} ${timeLabel}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F59E0B; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .detail { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail:last-of-type { border-bottom: none; }
          .label { font-weight: 600; color: #666; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
          .value { color: #111; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: 500; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
          a { color: #3B82F6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Meeting Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p>Friendly reminder about your upcoming meeting ${timeLabel}!</p>

            <div class="detail">
              <span class="label">What</span>
              <span class="value">${data.eventTitle}</span>
            </div>
            <div class="detail">
              <span class="label">When</span>
              <span class="value">${formattedTime}</span>
            </div>
            <div class="detail">
              <span class="label">With</span>
              <span class="value">${otherPerson}</span>
            </div>
            <div class="detail">
              <span class="label">Where</span>
              <span class="value">${data.locationType}${data.meetingUrl ? ` - <a href="${data.meetingUrl}">${data.meetingUrl}</a>` : ''}</span>
            </div>

            ${data.meetingUrl ? `<a href="${data.meetingUrl}" class="button">Join Meeting</a>` : ''}

            <div class="footer">
              <p>This email was sent by FixMeet.ai</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
⏰ Meeting Reminder

Hi ${recipientName},

Friendly reminder about your upcoming meeting ${timeLabel}!

What: ${data.eventTitle}
When: ${formattedTime}
With: ${otherPerson}
Where: ${data.locationType}${data.meetingUrl ? ` - ${data.meetingUrl}` : ''}

- FixMeet.ai
    `.trim(),
  };
}
