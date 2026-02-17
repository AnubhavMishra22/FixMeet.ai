import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { SYSTEM_PROMPT } from './prompts/system-prompt.js';

let model: ChatGoogleGenerativeAI | null = null;

export function initializeAI(apiKey: string): void {
  model = new ChatGoogleGenerativeAI({
    apiKey,
    model: 'gemini-2.0-flash',
    maxOutputTokens: 1024,
  });
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chat(
  message: string,
  conversationHistory: ConversationMessage[] = [],
): Promise<string> {
  if (!model) {
    throw new Error('AI service not initialized');
  }

  const messages: BaseMessage[] = [
    new SystemMessage(SYSTEM_PROMPT),
  ];

  for (const msg of conversationHistory) {
    if (msg.role === 'user') {
      messages.push(new HumanMessage(msg.content));
    } else {
      messages.push(new AIMessage(msg.content));
    }
  }

  messages.push(new HumanMessage(message));

  const response = await model.invoke(messages);

  return typeof response.content === 'string'
    ? response.content
    : JSON.stringify(response.content);
}
