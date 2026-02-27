import { formatInTimeZone } from 'date-fns-tz';
import type { EmailTemplate } from '../email.types.js';

export interface FollowupEmailData {
  hostName: string;
  inviteeName: string;
  inviteeEmail: string;
  eventTitle: string;
  startTime: Date;
  timezone: string;
  subject: string;
  body: string;
  actionItems: string[];
}

function formatDateTime(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "EEEE, MMMM d, yyyy 'at' h:mm a zzz");
}

/** Escape user-provided content to prevent XSS in HTML emails */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function followupEmail(data: FollowupEmailData): EmailTemplate {
  const formattedTime = formatDateTime(data.startTime, data.timezone);

  // Escape then convert body line breaks to <br> for HTML
  const htmlBody = escapeHtml(data.body).replace(/\n/g, '<br>');

  const actionItemsHtml = data.actionItems.length > 0
    ? `
      <div style="margin-top: 16px;">
        <span class="label">Action Items</span>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #111;">
          ${data.actionItems.map((item) => `<li style="margin: 4px 0;">${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
    `
    : '';

  const actionItemsText = data.actionItems.length > 0
    ? `\nAction Items:\n${data.actionItems.map((item) => `  - ${item}`).join('\n')}`
    : '';

  return {
    subject: data.subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8B5CF6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .detail { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail:last-of-type { border-bottom: none; }
          .label { font-weight: 600; color: #666; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
          .value { color: #111; }
          .body-content { margin: 16px 0; padding: 16px; background: white; border-radius: 6px; border: 1px solid #e5e7eb; color: #333; line-height: 1.8; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📨 Follow-up from ${escapeHtml(data.hostName)}</h1>
          </div>
          <div class="content">
            <p>Hi ${escapeHtml(data.inviteeName)},</p>

            <div class="detail">
              <span class="label">Regarding</span>
              <span class="value">${escapeHtml(data.eventTitle)}</span>
            </div>
            <div class="detail">
              <span class="label">Meeting Date</span>
              <span class="value">${formattedTime}</span>
            </div>

            <div class="body-content">
              ${htmlBody}
            </div>

            ${actionItemsHtml}

            <div class="footer">
              <p>This email was sent by ${escapeHtml(data.hostName)} via FixMeet.ai</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Follow-up from ${data.hostName}

Hi ${data.inviteeName},

Regarding: ${data.eventTitle}
Meeting Date: ${formattedTime}

${data.body}
${actionItemsText}

- Sent by ${data.hostName} via FixMeet.ai
    `.trim(),
  };
}
