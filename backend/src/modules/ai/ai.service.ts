import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { buildSystemPrompt } from './prompts/system-prompt.js';
import { sql } from '../../config/database.js';

const RATE_LIMIT_DELAY_MS = 1000;
const MAX_RETRIES = 3;

let model: ChatGoogleGenerativeAI | null = null;
// Note: In-memory rate limiter works for single-instance deployment.
// For multi-instance, replace with Redis-based rate limiting.
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

export function isInitialized(): boolean {
  return model !== null;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function getUserContext(userId: string) {
  const [user] = await sql`
    SELECT name, timezone FROM users WHERE id = ${userId}
  `;

  if (!user) {
    return { userName: 'User', userTimezone: 'UTC' };
  }

  return {
    userName: user.name || 'User',
    userTimezone: user.timezone || 'UTC',
  };
}

export async function chat(
  message: string,
  conversationHistory: ConversationMessage[] = [],
  userId: string,
): Promise<string> {
  if (!model) {
    throw new Error('AI service not initialized. Please set GOOGLE_AI_API_KEY.');
  }

  // Fetch user info for personalized system prompt
  const userContext = await getUserContext(userId);

  const now = new Date();
  const currentDateTime = now.toLocaleString('en-US', {
    timeZone: userContext.userTimezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const systemPrompt = buildSystemPrompt({
    userName: userContext.userName,
    userTimezone: userContext.userTimezone,
    currentDateTime,
  });

  const messages: BaseMessage[] = [new SystemMessage(systemPrompt)];

  for (const msg of conversationHistory) {
    if (msg.role === 'user') {
      messages.push(new HumanMessage(msg.content));
    } else {
      messages.push(new AIMessage(msg.content));
    }
  }

  messages.push(new HumanMessage(message));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await enforceRateLimit();
      const response = await model.invoke(messages);

      return typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    } catch (error: unknown) {
      const isRateLimit =
        (error instanceof Error && error.message?.includes('429')) ||
        (error as { status?: number })?.status === 429 ||
        (error as { response?: { status?: number } })?.response?.status === 429;

      if (isRateLimit && attempt < MAX_RETRIES) {
        const backoffMs = RATE_LIMIT_DELAY_MS * attempt;
        console.log(`Rate limited, retrying in ${backoffMs}ms (attempt ${attempt}/${MAX_RETRIES})...`);
        await sleep(backoffMs);
        continue;
      }

      throw error;
    }
  }

  throw new Error('AI request failed after max retries');
}
