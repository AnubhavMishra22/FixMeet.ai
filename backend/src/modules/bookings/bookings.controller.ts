import { Request, Response } from 'express';
import * as bookingsService from './bookings.service.js';
import { listBookingsQuerySchema } from './bookings.schema.js';
import type {
  UpdateBookingInput,
  RescheduleBookingInput,
  CancelBookingInput,
} from './bookings.schema.js';
import { UnauthorizedError, BadRequestError } from '../../utils/errors.js';

/**
 * Get all bookings for the authenticated host
 */
export async function getBookings(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  // Parse and validate query params
  const queryResult = listBookingsQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    const message = queryResult.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new BadRequestError(message);
  }

  const filters = queryResult.data;

  const bookings = await bookingsService.getBookingsByHost(req.user.userId, {
    status: filters.status,
    from: filters.from,
    to: filters.to,
    upcoming: filters.upcoming,
  });

  res.status(200).json({
    success: true,
    data: { bookings },
  });
}

/**
 * Get a single booking by ID
 */
export async function getBooking(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const booking = await bookingsService.getBookingById(
    req.user.userId,
    req.params.id
  );

  res.status(200).json({
    success: true,
    data: { booking },
  });
}

/**
 * Update a booking (status, etc.)
 */
export async function updateBooking(
  req: Request<{ id: string }, object, UpdateBookingInput>,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const booking = await bookingsService.updateBooking(
    req.user.userId,
    req.params.id,
    req.body
  );

  res.status(200).json({
    success: true,
    data: { booking },
  });
}

/**
 * Cancel a booking as host
 */
export async function cancelBooking(
  req: Request<{ id: string }, object, CancelBookingInput>,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const booking = await bookingsService.cancelBooking(
    req.params.id,
    'host',
    req.body.reason,
    req.user.userId
  );

  res.status(200).json({
    success: true,
    data: { booking },
  });
}

/**
 * Reschedule a booking
 */
export async function rescheduleBooking(
  req: Request<{ id: string }, object, RescheduleBookingInput>,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const booking = await bookingsService.rescheduleBooking(
    req.user.userId,
    req.params.id,
    req.body
  );

  res.status(200).json({
    success: true,
    data: { booking },
  });
}
