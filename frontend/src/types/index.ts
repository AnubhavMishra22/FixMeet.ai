export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  timezone: string;
  briefsEnabled: boolean;
  briefEmailsEnabled: boolean;
  briefGenerationHours: number;
  followupsEnabled: boolean;
  followupTone: 'formal' | 'friendly' | 'casual';
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

// ── Follow-ups ──────────────────────────────────────────────────────────

export type FollowupStatus = 'draft' | 'sent' | 'skipped';

export interface MeetingFollowup {
  id: string;
  bookingId: string;
  userId: string;
  subject: string | null;
  body: string | null;
  actionItems: string[];
  status: FollowupStatus;
  sentAt: string | null;
  createdAt: string;
}

export interface MeetingFollowupWithBooking extends MeetingFollowup {
  booking: {
    inviteeName: string;
    inviteeEmail: string;
    startTime: string;
    endTime: string;
    eventTypeTitle: string;
  };
}

// ── Insights ────────────────────────────────────────────────────────────

export type DateRange = '7d' | '30d' | '90d' | '365d' | 'all';

export interface MeetingStats {
  totalMeetings: number;
  totalHours: number;
  avgDurationMinutes: number;
  byStatus: {
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow: number;
    rescheduled: number;
  };
}

export interface MeetingsByDay {
  days: { day: string; count: number }[];
  busiestDay: string | null;
}

export interface MeetingsByHour {
  hours: { hour: number; count: number }[];
  peakHour: number | null;
}

export interface MeetingsByType {
  types: {
    eventTypeId: string;
    title: string;
    color: string;
    count: number;
    totalMinutes: number;
  }[];
}

export interface MeetingTrends {
  weeks: { week: string; count: number }[];
  currentPeriodCount: number;
  previousPeriodCount: number;
  changePercent: number | null;
}

export interface NoShowStats {
  totalCompleted: number;
  totalCancelled: number;
  totalNoShow: number;
  cancellationRate: number;
  noShowRate: number;
}

export type InsightType = 'optimization' | 'warning' | 'positive' | 'suggestion';
export type InsightPriority = 'high' | 'medium' | 'low';

export interface AIInsight {
  title: string;
  description: string;
  type: InsightType;
  priority: InsightPriority;
}

export interface AIInsightsResponse {
  insights: AIInsight[];
  generatedAt: string;
  expiresAt: string;
  cached: boolean;
}
