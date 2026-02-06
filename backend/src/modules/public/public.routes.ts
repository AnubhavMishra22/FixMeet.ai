import { Router } from 'express';
import * as publicController from './public.controller.js';

const router = Router();

// Public routes - no authentication required

// Get event type by username and slug
router.get('/:username/:slug', publicController.getPublicEventType);

// Get available slots for a specific date
router.get('/:username/:slug/slots', publicController.getAvailableSlots);

// Create a booking (invitee books a time)
router.post('/:username/:slug/book', publicController.createBooking);

// Get booking by ID (requires cancel token in query)
router.get('/bookings/:id', publicController.getBookingByToken);

// Cancel booking as invitee (requires cancel token in query)
router.post('/bookings/:id/cancel', publicController.cancelBookingByToken);

export default router;
