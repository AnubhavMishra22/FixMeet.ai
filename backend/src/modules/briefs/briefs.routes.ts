import { Router } from 'express';
import * as briefsController from './briefs.controller.js';

const router = Router();

// All routes require authentication (applied in app.ts)

// List all briefs for the user
router.get('/', briefsController.listBriefs);

// Get brief for a specific booking
router.get('/:bookingId', briefsController.getBrief);

export default router;
