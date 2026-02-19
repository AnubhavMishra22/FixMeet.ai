import { Request, Response } from 'express';
import * as briefsService from './briefs.service.js';
import { AppError, UnauthorizedError } from '../../utils/errors.js';

/** GET /api/briefs - List all briefs for the authenticated user */
export async function listBriefs(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedError();

  const briefs = await briefsService.listBriefs(userId);

  res.json({
    success: true,
    data: briefs,
  });
}

/** GET /api/briefs/:bookingId - Get brief for a specific booking */
export async function getBrief(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedError();

  const bookingId = req.params.bookingId;
  if (!bookingId) throw new AppError('Booking ID is required', 400, 'VALIDATION_ERROR');

  const brief = await briefsService.getBriefByBookingId(bookingId, userId);

  res.json({
    success: true,
    data: brief,
  });
}
