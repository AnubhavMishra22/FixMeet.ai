import { Router } from 'express';
import * as followupsController from './followups.controller.js';

const router = Router();

// All routes require authentication (applied in app.ts)

// List all followups for the user
router.get('/', followupsController.listFollowups);

// Get a single followup
router.get('/:id', followupsController.getFollowup);

// Update a draft followup (edit before sending)
router.patch('/:id', followupsController.updateFollowup);

// Send the followup email
router.post('/:id/send', followupsController.sendFollowup);

export default router;
