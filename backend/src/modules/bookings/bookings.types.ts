export type BookingStatus =
  | 'confirmed'
  | 'cancelled'
  | 'rescheduled'
  | 'completed'
  | 'no_show';

export interface Booking {
  id: string;
  eventTypeId: string;
  hostId: string;

  // Invitee
  inviteeName: string;
  inviteeEmail: string;
  inviteeTimezone: string;
  inviteeNotes: string | null;

  // Time
  startTime: Date;
  endTime: Date;

  // Location
  locationType: string;
  locationValue: string | null;
  meetingUrl: string | null;

  // Status
  status: BookingStatus;
  cancellationReason: string | null;
  cancelledBy: 'host' | 'invitee' | null;
  cancelledAt: Date | null;

  // Custom question responses
  responses: Record<string, string>;

  // Token for invitee actions
  cancelToken: string;

  // Calendar sync
  hostCalendarEventId: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface BookingRow {
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
  invitee_calendar_event_id: string | null;
  source: string;
  created_at: Date;
  updated_at: Date;
}

export interface BookingWithDetails extends Booking {
  eventType: {
    id: string;
    title: string;
    slug: string;
    durationMinutes: number;
    color: string;
  };
  host: {
    id: string;
    name: string;
    email: string;
    username: string;
    timezone: string;
  };
}

export interface BookingWithDetailsRow extends BookingRow {
  event_type_title: string;
  event_type_slug: string;
  event_type_duration_minutes: number;
  event_type_color: string;
  host_name: string;
  host_email: string;
  host_username: string;
  host_timezone: string;
}

export interface BookingFilters {
  status?: 'confirmed' | 'cancelled' | 'all';
  from?: string;
  to?: string;
  upcoming?: boolean;
}
