import { google, calendar_v3 } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

export interface CalendarInfo {
  id: string;
  name: string;
  primary: boolean;
}

export interface BusyTime {
  start: Date;
  end: Date;
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail?: string;
  location?: string;
  meetingUrl?: string;
}

export interface CalendarEventResult {
  id: string;
  meetingUrl: string | null;
}

/**
 * List user's calendars
 */
export async function listCalendars(auth: OAuth2Client): Promise<CalendarInfo[]> {
  const calendar = google.calendar({ version: 'v3', auth });

  const response = await calendar.calendarList.list();
  const items = response.data.items || [];

  return items.map((cal) => ({
    id: cal.id!,
    name: cal.summary || 'Unnamed Calendar',
    primary: cal.primary || false,
  }));
}

/**
 * Get busy times from calendar for a date range
 */
export async function getBusyTimes(
  auth: OAuth2Client,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
): Promise<BusyTime[]> {
  const calendar = google.calendar({ version: 'v3', auth });

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: calendarId }],
    },
  });

  const busySlots = response.data.calendars?.[calendarId]?.busy || [];

  return busySlots.map((slot) => ({
    start: new Date(slot.start!),
    end: new Date(slot.end!),
  }));
}

/**
 * Create a calendar event for a booking
 */
export async function createCalendarEvent(
  auth: OAuth2Client,
  calendarId: string,
  event: CalendarEventInput
): Promise<string> {
  const calendar = google.calendar({ version: 'v3', auth });

  const eventBody: calendar_v3.Schema$Event = {
    summary: event.summary,
    description: event.description,
    start: {
      dateTime: event.startTime.toISOString(),
    },
    end: {
      dateTime: event.endTime.toISOString(),
    },
    attendees: event.attendeeEmail ? [{ email: event.attendeeEmail }] : undefined,
    location: event.location || event.meetingUrl,
    // Add Google Meet link automatically
    conferenceData: {
      createRequest: {
        requestId: `fixmeet-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const response = await calendar.events.insert({
    calendarId,
    requestBody: eventBody,
    conferenceDataVersion: 1, // Enable Meet link creation
    sendUpdates: 'all', // Send invite emails
  });

  return response.data.id!;
}

/**
 * Get event details (including Meet link)
 */
export async function getCalendarEvent(
  auth: OAuth2Client,
  calendarId: string,
  eventId: string
): Promise<CalendarEventResult> {
  const calendar = google.calendar({ version: 'v3', auth });

  const response = await calendar.events.get({
    calendarId,
    eventId,
  });

  const meetLink = response.data.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === 'video'
  )?.uri;

  return {
    id: response.data.id!,
    meetingUrl: meetLink || null,
  };
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  auth: OAuth2Client,
  calendarId: string,
  eventId: string
): Promise<void> {
  const calendar = google.calendar({ version: 'v3', auth });

  await calendar.events.delete({
    calendarId,
    eventId,
    sendUpdates: 'all', // Notify attendees
  });
}

/**
 * Update a calendar event (for reschedule)
 */
export async function updateCalendarEvent(
  auth: OAuth2Client,
  calendarId: string,
  eventId: string,
  updates: {
    startTime?: Date;
    endTime?: Date;
    summary?: string;
  }
): Promise<void> {
  const calendar = google.calendar({ version: 'v3', auth });

  const eventBody: calendar_v3.Schema$Event = {};

  if (updates.startTime) {
    eventBody.start = { dateTime: updates.startTime.toISOString() };
  }
  if (updates.endTime) {
    eventBody.end = { dateTime: updates.endTime.toISOString() };
  }
  if (updates.summary) {
    eventBody.summary = updates.summary;
  }

  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: eventBody,
    sendUpdates: 'all',
  });
}
