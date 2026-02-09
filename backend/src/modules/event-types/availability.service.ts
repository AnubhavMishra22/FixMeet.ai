import {
  parseISO,
  format,
  addMinutes,
  subMinutes,
  isAfter,
  isBefore,
  startOfDay,
  addDays,
  getDay,
  endOfDay,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import type {
  EventType,
  EventTypeRow,
  TimeSlot,
  TimeRange,
  DayOfWeek,
  WeeklySchedule,
} from './event-types.types.js';
import { getAuthenticatedGoogleClient } from '../calendars/calendars.service.js';
import { getBusyTimes } from '../calendars/google/google-calendar.service.js';

const DAY_MAP: Record<number, DayOfWeek> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

interface ExistingBooking {
  startTime: Date;
  endTime: Date;
}

interface AvailabilityInput {
  eventType: EventType | EventTypeRow;
  date: string; // YYYY-MM-DD
  inviteeTimezone: string;
  hostTimezone: string;
  existingBookings?: ExistingBooking[];
  checkGoogleCalendar?: boolean; // Whether to check Google Calendar for conflicts
}

/**
 * Calculate available slots for a given date
 *
 * Steps:
 * 1. Get day of week for the date
 * 2. Get time ranges from weekly schedule for that day
 * 3. Check if date is within allowed range (rolling/range/indefinite)
 * 4. Check minimum notice (filter out slots too close to now)
 * 5. Generate slot intervals
 * 6. Remove slots that conflict with existing bookings (with buffer times)
 * 7. Remove slots that conflict with Google Calendar events (if connected)
 * 8. Convert slots to invitee's timezone
 */
export async function calculateAvailableSlots(input: AvailabilityInput): Promise<TimeSlot[]> {
  const { eventType, date, inviteeTimezone, hostTimezone, existingBookings = [], checkGoogleCalendar = true } = input;

  // Get host ID for Google Calendar check
  const hostId = getHostId(eventType);

  // Parse the date and get it in host's timezone
  const dateObj = parseISO(date);

  // 1. Check if date is within allowed range
  if (!isDateInRange(eventType, dateObj)) {
    return [];
  }

  // 2. Get day of week
  const dayOfWeek = getDayOfWeek(dateObj);

  // 3. Get schedule for this day
  const schedule = getSchedule(eventType);
  const daySchedule = schedule[dayOfWeek];

  if (!daySchedule || daySchedule.length === 0) {
    return [];
  }

  // 4. Generate all possible slots for this day
  const durationMinutes = getDurationMinutes(eventType);
  const slotInterval = getSlotInterval(eventType);
  const bufferBefore = getBufferBefore(eventType);
  const bufferAfter = getBufferAfter(eventType);

  const allSlots: TimeSlot[] = [];

  for (const range of daySchedule) {
    const rangeSlots = generateSlotsForRange(
      range,
      durationMinutes,
      slotInterval,
      bufferBefore,
      bufferAfter
    );
    allSlots.push(...rangeSlots);
  }

  // 5. Filter out slots that don't meet minimum notice
  const minNoticeMinutes = getMinNoticeMinutes(eventType);
  const now = new Date();

  const validSlots = allSlots.filter((slot) => {
    // Create a full datetime for the slot start in host's timezone
    const [hours, minutes] = slot.start.split(':').map(Number);
    const slotDateInHostTz = new Date(dateObj);
    slotDateInHostTz.setHours(hours ?? 0, minutes ?? 0, 0, 0);

    // Convert to UTC to compare with now
    const slotDateUtc = fromZonedTime(slotDateInHostTz, hostTimezone);

    // Check if slot is far enough in the future
    const minNoticeDate = addMinutes(now, minNoticeMinutes);

    return isAfter(slotDateUtc, minNoticeDate);
  });

  // 6. Fetch Google Calendar busy times if connected
  let googleBusyTimes: ExistingBooking[] = [];
  if (checkGoogleCalendar) {
    try {
      const googleClient = await getAuthenticatedGoogleClient(hostId);
      if (googleClient) {
        // Get busy times for this day
        const dayStart = startOfDay(dateObj);
        const dayEnd = endOfDay(dateObj);

        // Convert to UTC for API call
        const dayStartUtc = fromZonedTime(dayStart, hostTimezone);
        const dayEndUtc = fromZonedTime(dayEnd, hostTimezone);

        const busyTimes = await getBusyTimes(
          googleClient.client,
          googleClient.calendarId,
          dayStartUtc,
          dayEndUtc
        );

        googleBusyTimes = busyTimes.map((bt) => ({
          startTime: bt.start,
          endTime: bt.end,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch Google Calendar busy times:', err);
      // Continue without Google Calendar data
    }
  }

  // Combine existing bookings with Google Calendar busy times
  const allBlockedTimes = [...existingBookings, ...googleBusyTimes];

  // 7. Filter out slots that conflict with blocked times
  const availableSlots = validSlots.filter((slot) => {
    // Create full datetime for slot in host's timezone, then convert to UTC
    const [startHours, startMinutes] = slot.start.split(':').map(Number);
    const [endHours, endMinutes] = slot.end.split(':').map(Number);

    const slotStartInHostTz = new Date(dateObj);
    slotStartInHostTz.setHours(startHours ?? 0, startMinutes ?? 0, 0, 0);

    const slotEndInHostTz = new Date(dateObj);
    slotEndInHostTz.setHours(endHours ?? 0, endMinutes ?? 0, 0, 0);

    // Convert to UTC
    const slotStartUtc = fromZonedTime(slotStartInHostTz, hostTimezone);
    const slotEndUtc = fromZonedTime(slotEndInHostTz, hostTimezone);

    // Check for conflicts with all blocked times
    for (const blocked of allBlockedTimes) {
      if (
        hasConflict(
          slotStartUtc,
          slotEndUtc,
          blocked.startTime,
          blocked.endTime,
          bufferBefore,
          bufferAfter
        )
      ) {
        return false;
      }
    }

    return true;
  });

  // 8. Convert slots to invitee's timezone
  const convertedSlots = availableSlots.map((slot) => {
    return convertSlotTimezone(slot, date, hostTimezone, inviteeTimezone);
  });

  return convertedSlots;
}

/**
 * Check if a slot conflicts with a booking (including buffer times)
 *
 * A slot conflicts with a booking if:
 * slotStart < (bookingEnd + bufferAfter) AND slotEnd > (bookingStart - bufferBefore)
 */
function hasConflict(
  slotStart: Date,
  slotEnd: Date,
  bookingStart: Date,
  bookingEnd: Date,
  bufferBefore: number,
  bufferAfter: number
): boolean {
  const bookingStartWithBuffer = subMinutes(bookingStart, bufferBefore);
  const bookingEndWithBuffer = addMinutes(bookingEnd, bufferAfter);

  return slotStart < bookingEndWithBuffer && slotEnd > bookingStartWithBuffer;
}

function isDateInRange(
  eventType: EventType | EventTypeRow,
  date: Date
): boolean {
  const rangeType = getRangeType(eventType);
  const today = startOfDay(new Date());
  const targetDate = startOfDay(date);

  // Can't book in the past
  if (isBefore(targetDate, today)) {
    return false;
  }

  switch (rangeType) {
    case 'indefinite':
      return true;

    case 'rolling': {
      const rangeDays = getRangeDays(eventType) ?? 60;
      const maxDate = addDays(today, rangeDays);
      return !isAfter(targetDate, maxDate);
    }

    case 'range': {
      const rangeStart = getRangeStart(eventType);
      const rangeEnd = getRangeEnd(eventType);

      if (rangeStart) {
        const startDate = parseISO(rangeStart);
        if (isBefore(targetDate, startDate)) {
          return false;
        }
      }

      if (rangeEnd) {
        const endDate = parseISO(rangeEnd);
        if (isAfter(targetDate, endDate)) {
          return false;
        }
      }

      return true;
    }

    default:
      return false;
  }
}

function getDayOfWeek(date: Date): DayOfWeek {
  const dayNum = getDay(date);
  return DAY_MAP[dayNum] ?? 'monday';
}

function generateSlotsForRange(
  range: TimeRange,
  durationMinutes: number,
  slotInterval: number,
  bufferBefore: number,
  bufferAfter: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Parse start and end times
  const [startHours, startMinutes] = range.start.split(':').map(Number);
  const [endHours, endMinutes] = range.end.split(':').map(Number);

  // Convert to minutes from midnight for easier calculation
  let currentMinutes = (startHours ?? 0) * 60 + (startMinutes ?? 0);
  const endMinutesTotal = (endHours ?? 0) * 60 + (endMinutes ?? 0);

  // Slots start at the range start time (no buffer offset).
  // Buffers are enforced when checking conflicts with existing bookings,
  // not by shifting slot start times.
  while (currentMinutes + durationMinutes <= endMinutesTotal) {
    const slotStart = minutesToTime(currentMinutes);
    const slotEnd = minutesToTime(currentMinutes + durationMinutes);

    slots.push({ start: slotStart, end: slotEnd });

    // Move to next slot (slot interval, not duration)
    currentMinutes += slotInterval;
  }

  return slots;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function convertSlotTimezone(
  slot: TimeSlot,
  date: string,
  fromTimezone: string,
  toTimezone: string
): TimeSlot {
  // Create full datetime in source timezone
  const [startHours, startMinutes] = slot.start.split(':').map(Number);
  const [endHours, endMinutes] = slot.end.split(':').map(Number);

  const dateObj = parseISO(date);

  // Create dates in source timezone
  const startDateSrc = new Date(dateObj);
  startDateSrc.setHours(startHours ?? 0, startMinutes ?? 0, 0, 0);

  const endDateSrc = new Date(dateObj);
  endDateSrc.setHours(endHours ?? 0, endMinutes ?? 0, 0, 0);

  // Convert from source timezone to UTC
  const startUtc = fromZonedTime(startDateSrc, fromTimezone);
  const endUtc = fromZonedTime(endDateSrc, fromTimezone);

  // Convert from UTC to target timezone
  const startInTarget = toZonedTime(startUtc, toTimezone);
  const endInTarget = toZonedTime(endUtc, toTimezone);

  return {
    start: format(startInTarget, 'HH:mm'),
    end: format(endInTarget, 'HH:mm'),
  };
}

// Helper functions to handle both EventType and EventTypeRow
function getSchedule(eventType: EventType | EventTypeRow): WeeklySchedule {
  return eventType.schedule;
}

function getDurationMinutes(eventType: EventType | EventTypeRow): number {
  if ('durationMinutes' in eventType) {
    return eventType.durationMinutes;
  }
  return eventType.duration_minutes;
}

function getSlotInterval(eventType: EventType | EventTypeRow): number {
  if ('slotInterval' in eventType) {
    return eventType.slotInterval;
  }
  return eventType.slot_interval;
}

function getBufferBefore(eventType: EventType | EventTypeRow): number {
  if ('bufferBefore' in eventType) {
    return eventType.bufferBefore;
  }
  return eventType.buffer_before;
}

function getBufferAfter(eventType: EventType | EventTypeRow): number {
  if ('bufferAfter' in eventType) {
    return eventType.bufferAfter;
  }
  return eventType.buffer_after;
}

function getMinNoticeMinutes(eventType: EventType | EventTypeRow): number {
  if ('minNoticeMinutes' in eventType) {
    return eventType.minNoticeMinutes;
  }
  return eventType.min_notice_minutes;
}

function getRangeType(
  eventType: EventType | EventTypeRow
): 'rolling' | 'range' | 'indefinite' {
  if ('rangeType' in eventType) {
    return eventType.rangeType;
  }
  return eventType.range_type as 'rolling' | 'range' | 'indefinite';
}

function getRangeDays(eventType: EventType | EventTypeRow): number | null {
  if ('rangeDays' in eventType) {
    return eventType.rangeDays;
  }
  return eventType.range_days;
}

function getRangeStart(eventType: EventType | EventTypeRow): string | null {
  if ('rangeStart' in eventType) {
    return eventType.rangeStart;
  }
  return eventType.range_start;
}

function getRangeEnd(eventType: EventType | EventTypeRow): string | null {
  if ('rangeEnd' in eventType) {
    return eventType.rangeEnd;
  }
  return eventType.range_end;
}

// Export helper to get host ID from event type
export function getHostId(eventType: EventType | EventTypeRow): string {
  if ('userId' in eventType) {
    return eventType.userId;
  }
  return eventType.user_id;
}
