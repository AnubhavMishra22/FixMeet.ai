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

  console.log(`AI chat request from user ${userId}: "${message.substring(0, 50)}..."`);
  const startTime = Date.now();

  try {
    const response = await aiService.chat(message, conversationHistory, userId);

    console.log(`AI chat response in ${Date.now() - startTime}ms`);
    res.json({
      success: true,
      data: { response },
    });
  } catch (error) {
    console.error(`AI chat error after ${Date.now() - startTime}ms:`, (error as Error).message);
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
