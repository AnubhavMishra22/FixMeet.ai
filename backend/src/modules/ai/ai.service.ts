import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage, AIMessageChunk } from '@langchain/core/messages';
import { buildSystemPrompt } from './prompts/system-prompt.js';
import { getToolsForUser } from './tools/index.js';
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

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 4000;
const MAX_TOOL_ROUNDS = 3;

let model: ChatGoogleGenerativeAI | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Check if an error is a rate limit (429) response from the API */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error && error.message?.includes('429')) return true;
  if ((error as { status?: number })?.status === 429) return true;
  if ((error as { response?: { status?: number } })?.response?.status === 429) return true;
  return false;
}

export function initializeAI(apiKey: string): void {
  model = new ChatGoogleGenerativeAI({
    apiKey,
    model: process.env.GOOGLE_AI_MODEL_NAME || 'gemini-2.5-flash',
    maxOutputTokens: process.env.GOOGLE_AI_MAX_TOKENS
      ? parseInt(process.env.GOOGLE_AI_MAX_TOKENS, 10)
      : 1024,
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

/** Extract text content from an AI response */
function extractContent(response: AIMessageChunk): string {
  if (typeof response.content === 'string') return response.content;
  if (Array.isArray(response.content)) {
    return response.content
      .filter((c): c is { type: 'text'; text: string } =>
        typeof c === 'object' && c !== null && 'type' in c && c.type === 'text')
      .map((c) => c.text)
      .join('');
  }
  return JSON.stringify(response.content);
}

/** Invoke the model with retry logic for rate limits */
async function invokeWithRetry(
  boundModel: ReturnType<ChatGoogleGenerativeAI['bindTools']>,
  messages: BaseMessage[],
): Promise<AIMessageChunk> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await boundModel.invoke(messages) as AIMessageChunk;
    } catch (error: unknown) {
      if (isRateLimitError(error) && attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      if (isRateLimitError(error)) {
        throw new RateLimitError();
      }
      throw error;
    }
  }
  throw new Error('AI request failed after max retries');
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

  // Build tools for this user
  const tools = getToolsForUser(userId, userContext.userTimezone);
  const toolMap = new Map(tools.map((t) => [t.name, t]));

  // Bind tools to the model
  const boundModel = model.bindTools(tools);

  // Build message history
  const messages: BaseMessage[] = [new SystemMessage(systemPrompt)];

  for (const msg of conversationHistory) {
    if (msg.role === 'user') {
      messages.push(new HumanMessage(msg.content));
    } else {
      messages.push(new AIMessage(msg.content));
    }
  }

  messages.push(new HumanMessage(message));

  // Agent loop: invoke model → handle tool calls → repeat until text response
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // Consume additional token for each tool round after the first
    if (round > 0 && !consumeToken()) {
      throw new RateLimitError();
    }

    const response = await invokeWithRetry(boundModel, messages);

    // Check if the AI wants to call any tools
    const toolCalls = response.tool_calls ?? [];

    if (toolCalls.length === 0) {
      // No tool calls — return the final text response
      return extractContent(response);
    }

    // AI wants to use tools — add its message then execute each tool
    messages.push(response);

    for (const toolCall of toolCalls) {
      const tool = toolMap.get(toolCall.name);

      if (!tool) {
        messages.push(
          new ToolMessage({
            tool_call_id: toolCall.id ?? toolCall.name,
            content: `Tool "${toolCall.name}" not found.`,
          })
        );
        continue;
      }

      // Execute the tool
      const result = await tool.invoke(toolCall.args);
      messages.push(
        new ToolMessage({
          tool_call_id: toolCall.id ?? toolCall.name,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        })
      );
    }

    // Loop back — model will see tool results and formulate a response
  }

  // Exhausted tool rounds, do one final call
  if (!consumeToken()) {
    throw new RateLimitError();
  }
  const finalResponse = await invokeWithRetry(boundModel, messages);
  return extractContent(finalResponse);
}
