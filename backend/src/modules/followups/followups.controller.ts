import { Request, Response } from 'express';
import * as followupsService from './followups.service.js';
import { AppError, UnauthorizedError } from '../../utils/errors.js';

/** GET /api/followups - List all followups for the authenticated user */
export async function listFollowups(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedError();

  const followups = await followupsService.listFollowups(userId);

  res.json({ success: true, data: followups });
}

/** GET /api/followups/:id - Get a single followup */
export async function getFollowup(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedError();

  const { id } = req.params;
  if (!id) throw new AppError('Followup ID is required', 400, 'VALIDATION_ERROR');

  const followup = await followupsService.getFollowupById(id, userId);

  res.json({ success: true, data: followup });
}

/** PATCH /api/followups/:id - Update a draft followup */
export async function updateFollowup(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedError();

  const { id } = req.params;
  if (!id) throw new AppError('Followup ID is required', 400, 'VALIDATION_ERROR');

  const { subject, body, actionItems } = req.body;
  const followup = await followupsService.updateFollowup(id, userId, {
    subject,
    body,
    actionItems,
  });

  res.json({ success: true, data: followup });
}

/** POST /api/followups/:id/send - Send the followup email */
export async function sendFollowup(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedError();

  const { id } = req.params;
  if (!id) throw new AppError('Followup ID is required', 400, 'VALIDATION_ERROR');

  // TODO: Step 2 will add actual email sending here
  const followup = await followupsService.markSent(id, userId);

  res.json({ success: true, data: followup });
}
