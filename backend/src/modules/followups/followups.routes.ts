import { Router } from 'express';
import * as followupsController from './followups.controller.js';

const router = Router();

// All routes require authentication (applied in app.ts)

// List all followups for the user
router.get('/', followupsController.listFollowups);

// Get followup by booking ID (must be before /:id)
router.get('/by-booking/:bookingId', followupsController.getFollowupByBooking);

// Generate a followup for a booking (must be before /:id)
router.post('/generate/:bookingId', followupsController.generateFollowupForBooking);

// Get a single followup
router.get('/:id', followupsController.getFollowup);

// Update a draft followup (edit before sending)
router.patch('/:id', followupsController.updateFollowup);

// Send the followup email
router.post('/:id/send', followupsController.sendFollowup);

// Skip the followup
router.post('/:id/skip', followupsController.skipFollowup);

export default router;
