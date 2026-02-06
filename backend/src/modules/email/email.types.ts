export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface BookingEmailData {
  hostName: string;
  hostEmail: string;
  inviteeName: string;
  inviteeEmail: string;
  eventTitle: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  locationType: string;
  locationValue?: string | null;
  meetingUrl?: string | null;
  cancelUrl?: string;
  dashboardUrl?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}
