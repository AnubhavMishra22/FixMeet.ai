import { Router } from 'express';
import * as billingController from './billing.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { checkoutSessionBodySchema } from './billing.schema.js';

const router = Router();

router.post(
  '/checkout-session',
  validate(checkoutSessionBodySchema),
  billingController.createCheckoutSession,
);

router.post('/portal-session', billingController.createPortalSession);

export default router;
