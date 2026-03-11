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

/** POST /api/briefs/generate/:bookingId - Manually trigger brief generation (async) */
export async function generateBrief(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedError();

  const bookingId = req.params.bookingId;
  if (!bookingId) throw new AppError('Booking ID is required', 400, 'VALIDATION_ERROR');

  // Creates a pending record (or returns existing completed brief)
  const brief = await briefsService.startBriefGeneration(bookingId, userId);

  // If already completed, return immediately
  if (brief.status === 'completed') {
    res.json({ success: true, data: brief });
    return;
  }

  // Kick off generation in the background (don't await)
  briefsService.runBriefPipeline(bookingId, userId).catch((err) => {
    console.error(`Background brief generation failed for booking ${bookingId}:`, (err as Error).message);
  });

  // Return 202 Accepted with the pending/generating brief
  res.status(202).json({
    success: true,
    data: brief,
  });
}

/** POST /api/briefs/regenerate/:bookingId - Reset and regenerate a brief (async) */
export async function regenerateBrief(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedError();

  const bookingId = req.params.bookingId;
  if (!bookingId) throw new AppError('Booking ID is required', 400, 'VALIDATION_ERROR');

  // Reset existing brief to pending state
  await briefsService.resetBriefForRegeneration(bookingId, userId);

  // Get the reset brief to return
  const brief = await briefsService.getBriefByBookingId(bookingId, userId);

  // Kick off generation in the background (don't await)
  briefsService.runBriefPipeline(bookingId, userId).catch((err) => {
    console.error(`Background brief regeneration failed for booking ${bookingId}:`, (err as Error).message);
  });

  // Return 202 Accepted with the pending brief
  res.status(202).json({
    success: true,
    data: brief,
  });
}
