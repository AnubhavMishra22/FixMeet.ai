export type FollowupStatus = 'draft' | 'sent' | 'skipped';

export interface MeetingFollowup {
  id: string;
  bookingId: string;
  userId: string;
  subject: string | null;
  body: string | null;
  actionItems: string[];
  status: FollowupStatus;
  sentAt: Date | null;
  createdAt: Date;
}

export interface MeetingFollowupRow {
  id: string;
  booking_id: string;
  user_id: string;
  subject: string | null;
  body: string | null;
  action_items: string[];
  status: string;
  sent_at: Date | null;
  created_at: Date;
}

export interface FollowupWithBookingRow extends MeetingFollowupRow {
  invitee_name: string;
  invitee_email: string;
  start_time: Date;
  end_time: Date;
  event_type_title: string;
}

export interface MeetingFollowupWithBooking extends MeetingFollowup {
  booking: {
    inviteeName: string;
    inviteeEmail: string;
    startTime: Date;
    endTime: Date;
    eventTypeTitle: string;
  };
}
