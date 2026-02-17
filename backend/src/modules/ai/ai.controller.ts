import { Request, Response } from 'express';
import * as aiService from './ai.service.js';
import type { ChatInput } from './ai.schema.js';
import { UnauthorizedError } from '../../utils/errors.js';

export async function chat(
  req: Request<object, object, ChatInput>,
  res: Response,
): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    throw new UnauthorizedError('Authentication required');
  }

  const { message, conversationHistory } = req.body;

  const response = await aiService.chat(message, conversationHistory, userId);

  res.json({
    success: true,
    data: { response },
  });
}
