import { z } from 'zod';

export const chatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .optional()
    .default([]),
});

export type ChatInput = z.infer<typeof chatSchema>;
