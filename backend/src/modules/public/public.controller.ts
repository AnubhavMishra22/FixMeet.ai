import { Request, Response } from 'express';
import { parseISO } from 'date-fns';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import * as eventTypesService from '../event-types/event-types.service.js';
import { calculateAvailableSlots } from '../event-types/availability.service.js';
import { getSlotsQuerySchema } from '../event-types/event-types.schema.js';
import * as bookingsService from '../bookings/bookings.service.js';
import {
  createBookingSchema,
  cancelBookingSchema,
} from '../bookings/bookings.schema.js';
import type { PublicEventType, PublicHost } from '../event-types/event-types.types.js';
import type { CreateBookingInput, CancelBookingInput } from '../bookings/bookings.schema.js';

export async function getPublicEventType(
  req: Request<{ username: string; slug: string }>,
  res: Response
): Promise<void> {
  const { username, slug } = req.params;

  const result = await eventTypesService.getEventTypeByUsernameAndSlug(
    username,
    slug
  );

  if (!result) {
    throw new NotFoundError('Event type not found');
  }

  const { eventType, user } = result;

  // Return only public-safe fields
  const publicEventType: PublicEventType = {
    id: eventType.id,
    slug: eventType.slug,
    title: eventType.title,
    description: eventType.description,
    durationMinutes: eventType.duration_minutes,
    locationType: eventType.location_type,
    color: eventType.color,
    questions: eventType.questions,
  };

  const host: PublicHost = {
    name: user.name,
    username: user.username,
    timezone: user.timezone,
  };

  res.status(200).json({
    success: true,
    data: {
      eventType: publicEventType,
      host,
    },
  });
}

export async function getAvailableSlots(
  req: Request<{ username: string; slug: string }>,
  res: Response
): Promise<void> {
  const { username, slug } = req.params;

  // Validate query params
  const queryResult = getSlotsQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    const message = queryResult.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new BadRequestError(message);
  }

  const { date, timezone: inviteeTimezone } = queryResult.data;

  // Get event type
  const result = await eventTypesService.getEventTypeByUsernameAndSlug(
    username,
    slug
  );

  if (!result) {
    throw new NotFoundError('Event type not found');
  }

  const { eventType, user } = result;

  // Get existing bookings for this date to exclude them
  const dateObj = parseISO(date);
  const existingBookings = await bookingsService.getConfirmedBookingsForDate(
    user.id,
    dateObj
  );

  // Calculate available slots (now excluding booked slots and Google Calendar conflicts)
  const slots = await calculateAvailableSlots({
    eventType,
    date,
    inviteeTimezone,
    hostTimezone: user.timezone,
    existingBookings,
  });

  res.status(200).json({
    success: true,
    data: {
      date,
      timezone: inviteeTimezone,
      slots,
    },
  });
}

/**
 * Create a new booking (public endpoint for invitees)
 */
export async function createBooking(
  req: Request<{ username: string; slug: string }, object, CreateBookingInput>,
  res: Response
): Promise<void> {
  const { username, slug } = req.params;

  // Validate body
  const bodyResult = createBookingSchema.safeParse(req.body);
  if (!bodyResult.success) {
    const message = bodyResult.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new BadRequestError(message);
  }

  // Get event type
  const result = await eventTypesService.getEventTypeByUsernameAndSlug(
    username,
    slug
  );

  if (!result) {
    throw new NotFoundError('Event type not found');
  }

  const { eventType } = result;

  // Create booking
  const booking = await bookingsService.createBooking(
    eventType.id,
    bodyResult.data
  );

  // Return booking with limited details
  res.status(201).json({
    success: true,
    data: {
      booking: {
        id: booking.id,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        meetingUrl: booking.meetingUrl,
        cancelToken: booking.cancelToken,
      },
      eventType: {
        title: booking.eventType.title,
      },
      host: {
        name: booking.host.name,
        email: booking.host.email,
      },
    },
  });
}

/**
 * Get booking details by ID and cancel token (for invitees)
 */
export async function getBookingByToken(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const token = req.query.token as string | undefined;

  if (!token) {
    throw new BadRequestError('Cancel token is required');
  }

  const booking = await bookingsService.getBookingByToken(id, token);

  res.status(200).json({
    success: true,
    data: {
      booking: {
        id: booking.id,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        inviteeName: booking.inviteeName,
        inviteeEmail: booking.inviteeEmail,
        meetingUrl: booking.meetingUrl,
        locationType: booking.locationType,
      },
      eventType: {
        title: booking.eventType.title,
        slug: booking.eventType.slug,
        durationMinutes: booking.eventType.durationMinutes,
        color: booking.eventType.color,
      },
      host: {
        name: booking.host.name,
        email: booking.host.email,
        timezone: booking.host.timezone,
      },
    },
  });
}

/**
 * Cancel a booking as invitee (using cancel token)
 */
export async function cancelBookingByToken(
  req: Request<{ id: string }, object, CancelBookingInput>,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const token = req.query.token as string | undefined;

  if (!token) {
    throw new BadRequestError('Cancel token is required');
  }

  // Validate body
  const bodyResult = cancelBookingSchema.safeParse(req.body);
  if (!bodyResult.success) {
    const message = bodyResult.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new BadRequestError(message);
  }

  const booking = await bookingsService.cancelBooking(
    id,
    'invitee',
    bodyResult.data.reason,
    undefined,
    token
  );

  res.status(200).json({
    success: true,
    data: {
      booking: {
        id: booking.id,
        status: booking.status,
        cancelledAt: booking.cancelledAt,
      },
    },
  });
}
