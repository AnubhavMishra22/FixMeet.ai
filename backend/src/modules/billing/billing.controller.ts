import type { Request, Response } from 'express';
import { ServiceUnavailableError, UnauthorizedError } from '../../utils/errors.js';
import { isStripeConfigured } from './stripe-client.js';
import * as billingService from './billing.service.js';
import type { CheckoutSessionBody } from './billing.schema.js';

function checkoutBody(req: Request): CheckoutSessionBody {
  return req.body as CheckoutSessionBody;
}

function requireUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new UnauthorizedError('Authentication required');
  }
  return userId;
}

export async function createCheckoutSession(req: Request, res: Response): Promise<void> {
  if (!isStripeConfigured()) {
    throw new ServiceUnavailableError('Stripe billing is not configured.');
  }
  const userId = requireUserId(req);
  const email = await billingService.getUserEmail(userId);
  const { url } = await billingService.createCheckoutSession(
    userId,
    email,
    checkoutBody(req),
  );
  res.status(200).json({ success: true, data: { url } });
}

export async function createPortalSession(req: Request, res: Response): Promise<void> {
  if (!isStripeConfigured()) {
    throw new ServiceUnavailableError('Stripe billing is not configured.');
  }
  const userId = requireUserId(req);
  const { url } = await billingService.createPortalSession(userId);
  res.status(200).json({ success: true, data: { url } });
}
