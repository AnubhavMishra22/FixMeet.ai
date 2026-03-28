import { z } from 'zod';

export const checkoutSessionBodySchema = z.object({
  tier: z.enum(['pro', 'max']),
});

export type CheckoutSessionBody = z.infer<typeof checkoutSessionBodySchema>;
