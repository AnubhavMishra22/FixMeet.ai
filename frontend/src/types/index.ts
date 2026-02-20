export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  timezone: string;
  briefsEnabled: boolean;
  briefEmailsEnabled: boolean;
  briefGenerationHours: number;
  createdAt: string;
}

export interface EventType {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  locationType: string;
  locationValue: string | null;
  color: string;
  schedule: WeeklySchedule;
  bufferBefore: number;
  bufferAfter: number;
  minNoticeMinutes: number;
  slotInterval: number;
  maxBookingsPerDay: number | null;
  rangeType: 'rolling' | 'range' | 'indefinite';
  rangeDays: number | null;
  questions: CustomQuestion[];
  isActive: boolean;
  createdAt: string;
}

export interface WeeklySchedule {
  monday: TimeRange[];
  tuesday: TimeRange[];
  wednesday: TimeRange[];
  thursday: TimeRange[];
  friday: TimeRange[];
  saturday: TimeRange[];
  sunday: TimeRange[];
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface CustomQuestion {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  label: string;
  required: boolean;
  options?: string[];
}

export interface Booking {
  id: string;
  eventTypeId: string;
  hostId: string;
  inviteeName: string;
  inviteeEmail: string;
  inviteeTimezone: string;
  inviteeNotes: string | null;
  startTime: string;
  endTime: string;
  locationType: string;
  locationValue: string | null;
  meetingUrl: string | null;
  status: 'confirmed' | 'cancelled' | 'rescheduled' | 'completed' | 'no_show';
  cancellationReason: string | null;
  cancelledBy: 'host' | 'invitee' | null;
  responses: Record<string, string>;
  createdAt: string;
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

export interface TimeSlot {
  start: string;
  end: string;
}

export interface CalendarConnection {
  id: string;
  provider: string;
  calendarId: string;
  calendarName: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
}

export type BriefStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface PreviousMeeting {
  date: string;
  title: string;
  notes?: string;
}

export interface MeetingBrief {
  id: string;
  bookingId: string;
  userId: string;
  inviteeSummary: string | null;
  companySummary: string | null;
  previousMeetings: PreviousMeeting[];
  talkingPoints: string[];
  status: BriefStatus;
  attemptCount: number;
  generatedAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface MeetingBriefWithBooking extends MeetingBrief {
  booking: {
    inviteeName: string;
    inviteeEmail: string;
    startTime: string;
    endTime: string;
    eventTypeTitle: string;
  };
}
