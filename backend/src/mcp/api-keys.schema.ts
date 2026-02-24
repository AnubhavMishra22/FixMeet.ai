import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or fewer'),
});

export const revokeApiKeySchema = z.object({
  id: z.string().uuid('Invalid API key ID'),
});
