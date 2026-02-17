import { Request, Response } from 'express';
import * as aiService from './ai.service.js';
import type { ChatInput } from './ai.schema.js';

export async function chat(
  req: Request<object, object, ChatInput>,
  res: Response,
): Promise<void> {
  const { message, conversationHistory } = req.body;

  const response = await aiService.chat(message, conversationHistory);

  res.json({
    success: true,
    data: { response },
  });
}
