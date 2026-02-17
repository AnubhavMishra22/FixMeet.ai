import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { buildSystemPrompt } from './prompts/system-prompt.js';
import { sql } from '../../config/database.js';
import { RateLimitError } from '../../utils/errors.js';

// Token bucket rate limiter — Gemini free tier: 10 RPM
// Note: In-memory bucket works for single-instance deployment.
// For multi-instance, replace with Redis-based rate limiting.
const BUCKET_CAPACITY = 10;
const REFILL_INTERVAL_MS = 60_000; // 1 minute
let tokens = BUCKET_CAPACITY;
let lastRefillTime = Date.now();

function refillTokens(): void {
  const now = Date.now();
  const elapsed = now - lastRefillTime;
  const tokensToAdd = Math.floor(elapsed / REFILL_INTERVAL_MS) * BUCKET_CAPACITY;
  if (tokensToAdd > 0) {
    tokens = Math.min(BUCKET_CAPACITY, tokens + tokensToAdd);
    lastRefillTime = now;
  }
}

function consumeToken(): boolean {
  refillTokens();
  if (tokens > 0) {
    tokens--;
    return true;
  }
  return false;
}

const MAX_RETRIES = 2;

let model: ChatGoogleGenerativeAI | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  // Token bucket check — reject immediately if no tokens left
  if (!consumeToken()) {
    throw new RateLimitError();
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
        // If Gemini rate-limits us, wait and retry once
        await sleep(4000);
        continue;
      }

      // If rate limit exhausted retries, throw user-friendly error
      if (isRateLimit) {
        throw new RateLimitError();
      }

      throw error;
    }
  }

  throw new Error('AI request failed after max retries');
}
