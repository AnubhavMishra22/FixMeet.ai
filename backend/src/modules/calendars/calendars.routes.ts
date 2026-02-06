import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  getCalendars,
  getGoogleConnect,
  googleCallback,
  deleteCalendar,
} from './calendars.controller.js';

const router = Router();

// Protected routes (require authentication)
router.get('/', authMiddleware, getCalendars);
router.get('/google/connect', authMiddleware, getGoogleConnect);
router.delete('/:id', authMiddleware, deleteCalendar);

// OAuth callback (no auth - user redirected from Google)
router.get('/google/callback', googleCallback);

export default router;
