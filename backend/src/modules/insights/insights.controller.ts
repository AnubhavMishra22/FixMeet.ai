import { Request, Response } from 'express';
import { z } from 'zod';
import { UnauthorizedError } from '../../utils/errors.js';
import * as insightsService from './insights.service.js';
import { getAIInsights } from './ai-insights.service.js';
import type { DateRange } from './insights.types.js';

const rangeSchema = z.object({
  range: z.enum(['7d', '30d', '90d', '365d', 'all']).default('30d'),
});

function parseRange(query: unknown): DateRange {
  return rangeSchema.parse(query).range;
}

export async function getStats(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const range = parseRange(req.query);
  const stats = await insightsService.getMeetingStats(req.user.userId, range);
  res.status(200).json({ success: true, data: stats });
}

export async function getByDay(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const range = parseRange(req.query);
  const data = await insightsService.getMeetingsByDay(req.user.userId, range);
  res.status(200).json({ success: true, data });
}

export async function getByHour(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const range = parseRange(req.query);
  const data = await insightsService.getMeetingsByHour(req.user.userId, range);
  res.status(200).json({ success: true, data });
}

export async function getByType(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const range = parseRange(req.query);
  const data = await insightsService.getMeetingsByType(req.user.userId, range);
  res.status(200).json({ success: true, data });
}

export async function getTrends(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const data = await insightsService.getMeetingTrends(req.user.userId);
  res.status(200).json({ success: true, data });
}

export async function getNoShows(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const range = parseRange(req.query);
  const data = await insightsService.getNoShowRate(req.user.userId, range);
  res.status(200).json({ success: true, data });
}

export async function getAI(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const data = await getAIInsights(req.user.userId);
  res.status(200).json({ success: true, data });
}
