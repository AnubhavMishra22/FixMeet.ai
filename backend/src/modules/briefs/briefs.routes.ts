import { Router } from 'express';
import * as briefsController from './briefs.controller.js';

const router = Router();

// All routes require authentication (applied in app.ts)

// List all briefs for the user
router.get('/', briefsController.listBriefs);

// Manually generate a brief for a booking (must be before /:bookingId)
router.post('/generate/:bookingId', briefsController.generateBrief);

// Regenerate an existing brief (must be before /:bookingId)
router.post('/regenerate/:bookingId', briefsController.regenerateBrief);

// Get brief for a specific booking
router.get('/:bookingId', briefsController.getBrief);

export default router;
