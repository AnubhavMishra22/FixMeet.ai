export interface TimeRange {
  start: string; // "09:00"
  end: string; // "17:00"
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

export interface CustomQuestion {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  label: string;
  required: boolean;
  options?: string[]; // for select type
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
  rangeStart: string | null;
  rangeEnd: string | null;
  questions: CustomQuestion[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventTypeRow {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  location_type: string;
  location_value: string | null;
  color: string;
  schedule: WeeklySchedule;
  buffer_before: number;
  buffer_after: number;
  min_notice_minutes: number;
  slot_interval: number;
  max_bookings_per_day: number | null;
  range_type: string;
  range_days: number | null;
  range_start: string | null;
  range_end: string | null;
  questions: CustomQuestion[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AvailabilityOverride {
  id: string;
  userId: string;
  eventTypeId: string | null;
  date: string;
  isAvailable: boolean;
  timeRanges: TimeRange[];
  createdAt: Date;
}

export interface AvailabilityOverrideRow {
  id: string;
  user_id: string;
  event_type_id: string | null;
  date: string;
  is_available: boolean;
  time_ranges: TimeRange[];
  created_at: Date;
}

export interface TimeSlot {
  start: string; // "09:00"
  end: string; // "09:30"
}

export interface PublicEventType {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  locationType: string;
  color: string;
  questions: CustomQuestion[];
}

export interface PublicHost {
  name: string;
  username: string;
  timezone: string;
}

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';
