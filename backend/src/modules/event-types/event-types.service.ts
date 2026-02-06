import { sql } from '../../config/database.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import type {
  EventType,
  EventTypeRow,
  WeeklySchedule,
} from './event-types.types.js';
import type {
  CreateEventTypeInput,
  UpdateEventTypeInput,
} from './event-types.schema.js';
import type { JSONValue } from 'postgres';

const DEFAULT_SCHEDULE: WeeklySchedule = {
  monday: [{ start: '09:00', end: '17:00' }],
  tuesday: [{ start: '09:00', end: '17:00' }],
  wednesday: [{ start: '09:00', end: '17:00' }],
  thursday: [{ start: '09:00', end: '17:00' }],
  friday: [{ start: '09:00', end: '17:00' }],
  saturday: [],
  sunday: [],
};

function rowToEventType(row: EventTypeRow): EventType {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    durationMinutes: row.duration_minutes,
    locationType: row.location_type,
    locationValue: row.location_value,
    color: row.color,
    schedule: row.schedule,
    bufferBefore: row.buffer_before,
    bufferAfter: row.buffer_after,
    minNoticeMinutes: row.min_notice_minutes,
    slotInterval: row.slot_interval,
    maxBookingsPerDay: row.max_bookings_per_day,
    rangeType: row.range_type as 'rolling' | 'range' | 'indefinite',
    rangeDays: row.range_days,
    rangeStart: row.range_start,
    rangeEnd: row.range_end,
    questions: row.questions,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

export async function createEventType(
  userId: string,
  input: CreateEventTypeInput
): Promise<EventType> {
  // Generate slug from title if not provided
  let slug = input.slug ?? generateSlug(input.title);

  // Check slug uniqueness for this user
  const existingSlugs = await sql<{ id: string }[]>`
    SELECT id FROM event_types WHERE user_id = ${userId} AND slug = ${slug}
  `;

  if (existingSlugs.length > 0) {
    // If slug exists, append a random suffix
    const suffix = Math.random().toString(36).substring(2, 6);
    slug = `${slug}-${suffix}`;

    // Verify the new slug is unique
    const checkAgain = await sql<{ id: string }[]>`
      SELECT id FROM event_types WHERE user_id = ${userId} AND slug = ${slug}
    `;

    if (checkAgain.length > 0) {
      throw new ConflictError('Unable to generate unique slug');
    }
  }

  const schedule = input.schedule ?? DEFAULT_SCHEDULE;
  const questions = input.questions ?? [];

  const rows = await sql<EventTypeRow[]>`
    INSERT INTO event_types (
      user_id,
      slug,
      title,
      description,
      duration_minutes,
      location_type,
      location_value,
      color,
      schedule,
      buffer_before,
      buffer_after,
      min_notice_minutes,
      slot_interval,
      max_bookings_per_day,
      range_type,
      range_days,
      range_start,
      range_end,
      questions,
      is_active
    ) VALUES (
      ${userId},
      ${slug},
      ${input.title},
      ${input.description ?? null},
      ${input.durationMinutes},
      ${input.locationType},
      ${input.locationValue ?? null},
      ${input.color},
      ${sql.json(schedule as unknown as JSONValue)},
      ${input.bufferBefore},
      ${input.bufferAfter},
      ${input.minNoticeMinutes},
      ${input.slotInterval},
      ${input.maxBookingsPerDay ?? null},
      ${input.rangeType},
      ${input.rangeDays},
      ${input.rangeStart ?? null},
      ${input.rangeEnd ?? null},
      ${sql.json(questions as unknown as JSONValue)},
      ${input.isActive ?? true}
    )
    RETURNING *
  `;

  const row = rows[0];
  if (!row) {
    throw new Error('Failed to create event type');
  }

  return rowToEventType(row);
}

export async function getEventTypesByUserId(userId: string): Promise<EventType[]> {
  const rows = await sql<EventTypeRow[]>`
    SELECT * FROM event_types
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;

  return rows.map(rowToEventType);
}

export async function getEventTypeById(
  userId: string,
  eventTypeId: string
): Promise<EventType> {
  const rows = await sql<EventTypeRow[]>`
    SELECT * FROM event_types
    WHERE id = ${eventTypeId} AND user_id = ${userId}
  `;

  const row = rows[0];
  if (!row) {
    throw new NotFoundError('Event type not found');
  }

  return rowToEventType(row);
}

export async function updateEventType(
  userId: string,
  eventTypeId: string,
  input: UpdateEventTypeInput
): Promise<EventType> {
  // First, verify the event type exists and belongs to the user
  const existing = await sql<EventTypeRow[]>`
    SELECT * FROM event_types
    WHERE id = ${eventTypeId} AND user_id = ${userId}
  `;

  if (existing.length === 0) {
    throw new NotFoundError('Event type not found');
  }

  // If slug is being changed, check uniqueness
  if (input.slug && input.slug !== existing[0]?.slug) {
    const slugExists = await sql<{ id: string }[]>`
      SELECT id FROM event_types
      WHERE user_id = ${userId} AND slug = ${input.slug} AND id != ${eventTypeId}
    `;

    if (slugExists.length > 0) {
      throw new ConflictError('Slug already in use');
    }
  }

  // Build dynamic update query
  const updates: Record<string, unknown> = {};

  if (input.slug !== undefined) updates.slug = input.slug;
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.durationMinutes !== undefined)
    updates.duration_minutes = input.durationMinutes;
  if (input.locationType !== undefined) updates.location_type = input.locationType;
  if (input.locationValue !== undefined)
    updates.location_value = input.locationValue;
  if (input.color !== undefined) updates.color = input.color;
  if (input.schedule !== undefined) updates.schedule = sql.json(input.schedule as unknown as JSONValue);
  if (input.bufferBefore !== undefined) updates.buffer_before = input.bufferBefore;
  if (input.bufferAfter !== undefined) updates.buffer_after = input.bufferAfter;
  if (input.minNoticeMinutes !== undefined)
    updates.min_notice_minutes = input.minNoticeMinutes;
  if (input.slotInterval !== undefined) updates.slot_interval = input.slotInterval;
  if (input.maxBookingsPerDay !== undefined)
    updates.max_bookings_per_day = input.maxBookingsPerDay;
  if (input.rangeType !== undefined) updates.range_type = input.rangeType;
  if (input.rangeDays !== undefined) updates.range_days = input.rangeDays;
  if (input.rangeStart !== undefined) updates.range_start = input.rangeStart;
  if (input.rangeEnd !== undefined) updates.range_end = input.rangeEnd;
  if (input.questions !== undefined)
    updates.questions = sql.json(input.questions as unknown as JSONValue);
  if (input.isActive !== undefined) updates.is_active = input.isActive;

  updates.updated_at = sql`NOW()`;

  // If no updates, just return the existing record
  if (Object.keys(updates).length === 1) {
    return rowToEventType(existing[0]!);
  }

  const rows = await sql<EventTypeRow[]>`
    UPDATE event_types
    SET ${sql(updates)}
    WHERE id = ${eventTypeId} AND user_id = ${userId}
    RETURNING *
  `;

  const row = rows[0];
  if (!row) {
    throw new Error('Failed to update event type');
  }

  return rowToEventType(row);
}

export async function deleteEventType(
  userId: string,
  eventTypeId: string
): Promise<void> {
  const result = await sql`
    DELETE FROM event_types
    WHERE id = ${eventTypeId} AND user_id = ${userId}
  `;

  if (result.count === 0) {
    throw new NotFoundError('Event type not found');
  }
}

export async function getEventTypeByUsernameAndSlug(
  username: string,
  slug: string
): Promise<{
  eventType: EventTypeRow;
  user: { id: string; name: string; username: string; timezone: string };
} | null> {
  const rows = await sql<
    (EventTypeRow & { user_name: string; user_username: string; user_timezone: string })[]
  >`
    SELECT
      et.*,
      u.name as user_name,
      u.username as user_username,
      u.timezone as user_timezone
    FROM event_types et
    JOIN users u ON et.user_id = u.id
    WHERE u.username = ${username}
      AND et.slug = ${slug}
      AND et.is_active = true
  `;

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    eventType: row,
    user: {
      id: row.user_id,
      name: row.user_name,
      username: row.user_username,
      timezone: row.user_timezone,
    },
  };
}
