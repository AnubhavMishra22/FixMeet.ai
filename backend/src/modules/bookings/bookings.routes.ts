import { Router } from 'express';
import * as bookingsController from './bookings.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  updateBookingSchema,
  rescheduleBookingSchema,
  cancelBookingSchema,
} from './bookings.schema.js';

const router = Router();

// All routes require authentication (applied in app.ts)

// List bookings
router.get('/', bookingsController.getBookings);

// Get single booking
router.get('/:id', bookingsController.getBooking);

// Update booking
router.patch(
  '/:id',
  validate(updateBookingSchema),
  bookingsController.updateBooking
);

// Cancel booking as host
router.post(
  '/:id/cancel',
  validate(cancelBookingSchema),
  bookingsController.cancelBooking
);

// Reschedule booking
router.post(
  '/:id/reschedule',
  validate(rescheduleBookingSchema),
  bookingsController.rescheduleBooking
);

export default router;
