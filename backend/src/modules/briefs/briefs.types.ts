export type BriefStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface MeetingBrief {
  id: string;
  bookingId: string;
  userId: string;
  inviteeSummary: string | null;
  companySummary: string | null;
  previousMeetings: PreviousMeeting[];
  talkingPoints: string[];
  status: BriefStatus;
  generatedAt: Date | null;
  createdAt: Date;
}

export interface PreviousMeeting {
  date: string;
  title: string;
  notes?: string;
}

export interface MeetingBriefRow {
  id: string;
  booking_id: string;
  user_id: string;
  invitee_summary: string | null;
  company_summary: string | null;
  previous_meetings: PreviousMeeting[];
  talking_points: string[];
  status: string;
  generated_at: Date | null;
  created_at: Date;
}

export interface BriefWithBookingRow extends MeetingBriefRow {
  invitee_name: string;
  invitee_email: string;
  start_time: Date;
  end_time: Date;
  event_type_title: string;
}
