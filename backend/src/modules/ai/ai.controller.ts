import { Request, Response } from 'express';
import * as aiService from './ai.service.js';
import type { ChatInput } from './ai.schema.js';
import { UnauthorizedError, TimeoutError } from '../../utils/errors.js';

export async function chat(
  req: Request<object, object, ChatInput>,
  res: Response,
): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    throw new UnauthorizedError('Authentication required');
  }

  const { message, conversationHistory } = req.body;

  try {
    const response = await aiService.chat(message, conversationHistory, userId);

    res.json({
      success: true,
      data: { response },
    });
  } catch (error) {
    // Let AppError subclasses (RateLimitError etc.) bubble up to error middleware
    if (error instanceof TimeoutError) {
      res.status(504).json({
        success: false,
        error: {
          message: 'The AI is taking too long to respond. Please try again.',
          code: 'TIMEOUT',
        },
      });
      return;
    }
    throw error;
  }
}
