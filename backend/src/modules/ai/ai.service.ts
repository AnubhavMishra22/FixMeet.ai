import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { SYSTEM_PROMPT } from './prompts/system-prompt.js';

const RATE_LIMIT_DELAY_MS = 1000;
const MAX_RETRIES = 3;

let model: ChatGoogleGenerativeAI | null = null;
let lastRequestTime = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_DELAY_MS) {
    await sleep(RATE_LIMIT_DELAY_MS - elapsed);
  }
  lastRequestTime = Date.now();
}

export function initializeAI(apiKey: string): void {
  model = new ChatGoogleGenerativeAI({
    apiKey,
    model: 'gemini-2.5-flash',
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

  // Retry with delay to stay under free tier rate limits (15 RPM)
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await enforceRateLimit();
      const response = await model.invoke(messages);

      return typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    } catch (error: unknown) {
      const isRateLimit =
        error instanceof Error && error.message?.includes('429');

      if (isRateLimit && attempt < MAX_RETRIES) {
        console.log(`Rate limited, retrying in ${RATE_LIMIT_DELAY_MS}ms (attempt ${attempt}/${MAX_RETRIES})...`);
        await sleep(RATE_LIMIT_DELAY_MS);
        continue;
      }

      throw error;
    }
  }

  throw new Error('AI request failed after max retries');
}
