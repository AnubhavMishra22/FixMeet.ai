import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
import { env, DEFAULT_AI_MODEL } from '../../config/env.js';

/** Result shape returned by Gemini after parsing */
export interface FollowupGenerationResult {
  subject: string;
  body: string;
  actionItems: string[];
}

// Rate limiting: 2 second delay between AI calls to stay within free tier
const AI_CALL_DELAY_MS = 2000;
let lastCallTime = 0;

async function rateLimitDelay(): Promise<void> {
  const elapsed = Date.now() - lastCallTime;
  if (elapsed < AI_CALL_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, AI_CALL_DELAY_MS - elapsed));
  }
  lastCallTime = Date.now();
}

/** Create a one-off Gemini model instance for followup generation */
function createModel(): ChatGoogleGenerativeAI | null {
  if (!env.GOOGLE_AI_API_KEY) return null;

  return new ChatGoogleGenerativeAI({
    apiKey: env.GOOGLE_AI_API_KEY,
    model: env.GOOGLE_AI_MODEL_NAME || DEFAULT_AI_MODEL,
    maxOutputTokens: env.GOOGLE_AI_MAX_TOKENS ? parseInt(env.GOOGLE_AI_MAX_TOKENS, 10) : 1024,
    temperature: 0.7,
  });
}

/**
 * Build the prompt for follow-up email generation.
 */
function buildPrompt(params: {
  eventTitle: string;
  inviteeName: string;
  startTime: Date;
  endTime: Date;
  meetingBrief?: string | null;
  inviteeNotes?: string | null;
}): string {
  const { eventTitle, inviteeName, startTime, endTime, meetingBrief, inviteeNotes } = params;

  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
  const dateStr = startTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const briefSection = meetingBrief
    ? `\nMeeting brief (context from before the meeting):\n${meetingBrief}`
    : '';

  const notesSection = inviteeNotes
    ? `\nUser notes:\n${inviteeNotes}`
    : '';

  return `Generate a professional follow-up email after a meeting.

Meeting details:
- Title: ${eventTitle}
- Attendee: ${inviteeName}
- Date: ${dateStr}
- Duration: ${durationMinutes} minutes
${briefSection}
${notesSection}

Generate:
1. Email subject line
2. Professional follow-up email body that:
   - Thanks them for their time
   - References the meeting topic
   - Lists any action items (make reasonable assumptions based on the meeting type)
   - Suggests next steps
   - Keeps it concise (under 150 words)
3. Extract action items as an array of strings

IMPORTANT: Respond ONLY with valid JSON in this exact format, no markdown, no code blocks:
{"subject": "...", "body": "...", "actionItems": ["...", "..."]}`;
}

/**
 * Parse the AI response into a FollowupGenerationResult.
 * Handles cases where the model wraps JSON in markdown code blocks.
 */
function parseAIResponse(text: string): FollowupGenerationResult {
  // Strip markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  if (typeof parsed.subject !== 'string') {
    throw new Error('Missing or invalid subject in AI response');
  }
  if (typeof parsed.body !== 'string') {
    throw new Error('Missing or invalid body in AI response');
  }
  if (!Array.isArray(parsed.actionItems)) {
    throw new Error('Missing or invalid actionItems in AI response');
  }

  return {
    subject: parsed.subject,
    body: parsed.body,
    actionItems: parsed.actionItems.filter((item): item is string => typeof item === 'string'),
  };
}

/**
 * Generate a follow-up email using Gemini AI.
 * Returns structured followup data or throws on failure.
 */
export async function generateFollowup(params: {
  eventTitle: string;
  inviteeName: string;
  startTime: Date;
  endTime: Date;
  meetingBrief?: string | null;
  inviteeNotes?: string | null;
}): Promise<FollowupGenerationResult> {
  const model = createModel();
  if (!model) {
    throw new Error('AI not configured: GOOGLE_AI_API_KEY is not set');
  }

  // Rate limit
  await rateLimitDelay();

  const prompt = buildPrompt(params);

  const response = await model.invoke([new HumanMessage(prompt)]);

  const content =
    typeof response.content === 'string'
      ? response.content
      : Array.isArray(response.content)
        ? response.content.map((c) => (typeof c === 'string' ? c : '')).join('')
        : '';

  if (!content) {
    throw new Error('Empty response from AI model');
  }

  return parseAIResponse(content);
}
