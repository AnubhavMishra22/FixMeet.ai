import { formatInTimeZone } from 'date-fns-tz';
import type { EmailTemplate } from '../email.types.js';

export interface MeetingBriefEmailData {
  hostName: string;
  inviteeName: string;
  eventTitle: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  inviteeSummary: string;
  companySummary: string;
  companyName: string | null;
  talkingPoints: string[];
  dashboardUrl: string;
}

function formatDateTime(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "EEEE, MMMM d, yyyy 'at' h:mm a zzz");
}

function formatDuration(startTime: Date, endTime: Date): string {
  const minutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`;
  }
  return `${minutes} min`;
}

export function meetingBriefEmail(data: MeetingBriefEmailData): EmailTemplate {
  const formattedTime = formatDateTime(data.startTime, data.timezone);
  const duration = formatDuration(data.startTime, data.endTime);
  const aboutLabel = data.companyName ? `About ${data.companyName}` : 'About their company';

  const talkingPointsHtml = data.talkingPoints
    .map((point) => `<li style="margin-bottom: 8px;">${point}</li>`)
    .join('');

  const talkingPointsText = data.talkingPoints
    .map((point) => `  • ${point}`)
    .join('\n');

  return {
    subject: `Meeting brief: ${data.eventTitle} with ${data.inviteeName}`,
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
          .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .meeting-details { background: white; border-radius: 8px; padding: 16px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
          .detail { margin: 8px 0; padding: 6px 0; }
          .label { font-weight: 600; color: #666; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 2px; }
          .value { color: #111; }
          .section { background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
          .section h2 { margin: 0 0 10px; font-size: 16px; color: #8B5CF6; }
          .section p { margin: 0; color: #444; font-size: 14px; line-height: 1.6; }
          .talking-points { background: white; border-radius: 8px; padding: 16px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
          .talking-points h2 { margin: 0 0 10px; font-size: 16px; color: #8B5CF6; }
          .talking-points ul { margin: 0; padding-left: 20px; color: #444; font-size: 14px; }
          .button { display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 5px; font-weight: 500; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
          a { color: #8B5CF6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Meeting Brief</h1>
            <p>Your prep brief for ${data.eventTitle}</p>
          </div>
          <div class="content">
            <p>Hi ${data.hostName},</p>
            <p>Here's your AI-generated meeting brief to help you prepare.</p>

            <div class="meeting-details">
              <div class="detail">
                <span class="label">Meeting</span>
                <span class="value">${data.eventTitle}</span>
              </div>
              <div class="detail">
                <span class="label">When</span>
                <span class="value">${formattedTime} (${duration})</span>
              </div>
              <div class="detail">
                <span class="label">With</span>
                <span class="value">${data.inviteeName}</span>
              </div>
            </div>

            <div class="section">
              <h2>👤 About ${data.inviteeName}</h2>
              <p>${data.inviteeSummary}</p>
            </div>

            <div class="section">
              <h2>🏢 ${aboutLabel}</h2>
              <p>${data.companySummary}</p>
            </div>

            <div class="talking-points">
              <h2>💡 Suggested Talking Points</h2>
              <ul>
                ${talkingPointsHtml}
              </ul>
            </div>

            <a href="${data.dashboardUrl}" class="button">View Full Brief in Dashboard</a>

            <div class="footer">
              <p>This brief was generated by FixMeet AI. Information may not be 100% accurate.</p>
              <p>This email was sent by FixMeet.ai</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Meeting Brief: ${data.eventTitle} with ${data.inviteeName}

Hi ${data.hostName},

Here's your AI-generated meeting brief to help you prepare.

MEETING DETAILS
Meeting: ${data.eventTitle}
When: ${formattedTime} (${duration})
With: ${data.inviteeName}

ABOUT ${data.inviteeName.toUpperCase()}
${data.inviteeSummary}

${aboutLabel.toUpperCase()}
${data.companySummary}

SUGGESTED TALKING POINTS
${talkingPointsText}

View full brief: ${data.dashboardUrl}

Note: This brief was generated by FixMeet AI. Information may not be 100% accurate.

- FixMeet.ai
    `.trim(),
  };
}
