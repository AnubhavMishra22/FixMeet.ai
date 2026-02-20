import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage, AIMessageChunk } from '@langchain/core/messages';
import { buildSystemPrompt } from './prompts/system-prompt.js';
import { getToolsForUser } from './tools/index.js';
import { sql } from '../../config/database.js';
import { RateLimitError, TimeoutError } from '../../utils/errors.js';

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
const CHAT_TIMEOUT_MS = 60_000; // 60 second max for entire chat request
const INVOKE_TIMEOUT_MS = 30_000; // 30 second max for a single Gemini API call

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

interface AIConfig {
  apiKey: string;
  modelName?: string;
  maxTokens?: string;
}

export function initializeAI(config: AIConfig): void {
  const modelName = config.modelName || 'gemini-2.0-flash';
  console.log(`[AI] Initializing model: ${modelName}, maxTokens: ${config.maxTokens || '1024 (default)'}`);
  model = new ChatGoogleGenerativeAI({
    apiKey: config.apiKey,
    model: modelName,
    maxOutputTokens: config.maxTokens ? parseInt(config.maxTokens, 10) : 1024,
  });

  // Fire-and-forget health check — validates API key on startup
  healthCheck().catch((err) => {
    console.error(`[AI] ⚠️  Startup health check FAILED: ${(err as Error).message}`);
    console.error('[AI] ⚠️  AI chat will likely fail. Check GOOGLE_AI_API_KEY.');
  });
}

/** Quick ping to verify the Gemini API key works */
async function healthCheck(): Promise<void> {
  if (!model) return;
  console.log('[AI] Running startup health check...');
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const result = await model.invoke([new HumanMessage('Say "ok"')], {
      signal: controller.signal,
    }) as AIMessageChunk;
    const content = extractContent(result);
    console.log(`[AI] ✅ Health check passed in ${Date.now() - start}ms (response: "${content.substring(0, 50)}")`);
  } catch (error) {
    throw error;
  } finally {
    clearTimeout(timer);
  }
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

/** Invoke the model with retry logic, per-call timeout via AbortController */
async function invokeWithRetry(
  boundModel: ReturnType<ChatGoogleGenerativeAI['bindTools']>,
  messages: BaseMessage[],
  roundLabel: string = 'invoke',
): Promise<AIMessageChunk> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), INVOKE_TIMEOUT_MS);
    try {
      console.log(`[AI] ${roundLabel} attempt ${attempt}/${MAX_ATTEMPTS} — calling Gemini...`);
      const start = Date.now();
      const result = await boundModel.invoke(messages, {
        signal: controller.signal,
      }) as AIMessageChunk;
      console.log(`[AI] ${roundLabel} attempt ${attempt} completed in ${Date.now() - start}ms`);
      return result;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const isAbort = error instanceof Error && error.name === 'AbortError';
      console.error(`[AI] ${roundLabel} attempt ${attempt} failed: ${isAbort ? `timed out after ${INVOKE_TIMEOUT_MS}ms` : errMsg}`);
      if (isAbort && attempt < MAX_ATTEMPTS) {
        console.log(`[AI] Retrying after timeout...`);
        continue;
      }
      if (isAbort) {
        throw new TimeoutError();
      }
      if (isRateLimitError(error) && attempt < MAX_ATTEMPTS) {
        console.log(`[AI] Rate limited, retrying in ${RETRY_DELAY_MS}ms...`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      if (isRateLimitError(error)) {
        throw new RateLimitError();
      }
      throw error;
    } finally {
      clearTimeout(timer);
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

  // Wrap entire chat in a timeout
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new TimeoutError()), CHAT_TIMEOUT_MS)
  );

  return Promise.race([chatInternal(message, conversationHistory, userId), timeoutPromise]);
}

async function chatInternal(
  message: string,
  conversationHistory: ConversationMessage[],
  userId: string,
): Promise<string> {
  const chatStart = Date.now();

  // Fetch user info for personalized system prompt
  console.log(`[AI] Fetching user context for ${userId}...`);
  const userContext = await getUserContext(userId);
  console.log(`[AI] User context fetched in ${Date.now() - chatStart}ms: ${userContext.userName} (${userContext.userTimezone})`);

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
  console.log(`[AI] Tools loaded: ${tools.map(t => t.name).join(', ')}`);

  // Bind tools to the model
  const boundModel = model!.bindTools(tools);

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
  console.log(`[AI] Message history: ${messages.length} messages (${conversationHistory.length} history + system + user). Starting agent loop...`);

  // Agent loop: invoke model → handle tool calls → repeat until text response
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // Consume additional token for each tool round after the first
    if (round > 0 && !consumeToken()) {
      throw new RateLimitError();
    }

    const response = await invokeWithRetry(boundModel, messages, `round-${round}`);

    // Check if the AI wants to call any tools
    const toolCalls = response.tool_calls ?? [];

    if (toolCalls.length === 0) {
      // No tool calls — return the final text response
      const content = extractContent(response);
      console.log(`[AI] Final response in ${Date.now() - chatStart}ms (${content.length} chars)`);
      return content;
    }

    // AI wants to use tools — add its message then execute each tool
    console.log(`[AI] Round ${round}: ${toolCalls.length} tool call(s): ${toolCalls.map(tc => tc.name).join(', ')}`);
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

      // Execute the tool — catch errors so AI can explain the issue
      try {
        console.log(`[AI] Executing tool "${toolCall.name}" with keys: [${Object.keys(toolCall.args ?? {}).join(', ')}]`);
        const toolStart = Date.now();
        const result = await tool.invoke(toolCall.args);
        console.log(`[AI] Tool "${toolCall.name}" completed in ${Date.now() - toolStart}ms`);
        messages.push(
          new ToolMessage({
            tool_call_id: toolCall.id ?? toolCall.name,
            content: typeof result === 'string' ? result : JSON.stringify(result),
          })
        );
      } catch (toolError) {
        const errorMsg = toolError instanceof Error ? toolError.message : 'Unknown tool error';
        console.error(`[AI] Tool "${toolCall.name}" execution error:`, toolError);
        messages.push(
          new ToolMessage({
            tool_call_id: toolCall.id ?? toolCall.name,
            content: `Error executing tool: ${errorMsg}`,
          })
        );
      }
    }

    // Loop back — model will see tool results and formulate a response
  }

  // Exhausted tool rounds, do one final call
  console.log(`[AI] Exhausted ${MAX_TOOL_ROUNDS} tool rounds, doing final call...`);
  if (!consumeToken()) {
    throw new RateLimitError();
  }
  const finalResponse = await invokeWithRetry(boundModel, messages, 'final');
  const content = extractContent(finalResponse);
  console.log(`[AI] Final response (after tool rounds) in ${Date.now() - chatStart}ms (${content.length} chars)`);
  return content;
}
