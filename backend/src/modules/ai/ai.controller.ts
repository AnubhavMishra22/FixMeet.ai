import { Request, Response } from 'express';
import * as aiService from './ai.service.js';
import type { ChatInput } from './ai.schema.js';

export async function chat(
  req: Request<object, object, ChatInput>,
  res: Response,
): Promise<void> {
  const { message, conversationHistory } = req.body;

  try {
    const response = await aiService.chat(message, conversationHistory);

    res.json({
      success: true,
      data: { response },
    });
  } catch (error) {
    console.error('AI chat error:', error);
    throw error;
  }
}
