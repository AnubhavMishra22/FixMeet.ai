import { z } from 'zod';

// Public: Invitee creates a booking
export const createBookingSchema = z.object({
  inviteeName: z.string().min(1).max(255),
  inviteeEmail: z.string().email(),
  inviteeTimezone: z.string().min(1), // IANA timezone
  inviteeNotes: z.string().max(1000).optional(),
  startTime: z.string().datetime(), // ISO string
  responses: z.record(z.string()).default({}),
});

// Public: Invitee cancels their booking
export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

// Host: Update booking
export const updateBookingSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  cancellationReason: z.string().max(500).optional(),
});

// Host: Reschedule booking
export const rescheduleBookingSchema = z.object({
  startTime: z.string().datetime(),
  notifyInvitee: z.boolean().default(true),
});

// Query params for listing bookings
export const listBookingsQuerySchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'all']).default('confirmed'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  upcoming: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
