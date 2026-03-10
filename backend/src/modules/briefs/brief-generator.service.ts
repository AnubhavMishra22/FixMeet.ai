import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
import { env, DEFAULT_AI_MODEL } from '../../config/env.js';
import type { PersonInfo } from './scraper.types.js';
import type { PreviousMeeting } from './briefs.types.js';

/** Result shape returned by Gemini after parsing */
export interface BriefGenerationResult {
  inviteeSummary: string;
  companySummary: string;
  talkingPoints: string[];
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

/** Create a one-off Gemini model instance for brief generation */
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
 * Build the prompt for meeting brief generation.
 */
function buildPrompt(params: {
  inviteeName: string;
  inviteeEmail: string;
  eventTitle: string;
  personInfo: PersonInfo;
  previousMeetings: PreviousMeeting[];
}): string {
  const { inviteeName, inviteeEmail, eventTitle, personInfo, previousMeetings } = params;

  const personSection = [
    `Name: ${personInfo.name}`,
    `Email: ${personInfo.email}`,
    personInfo.companyName ? `Company: ${personInfo.companyName}` : null,
    personInfo.companyDescription ? `Company Description: ${personInfo.companyDescription}` : null,
    personInfo.linkedinUrl ? `LinkedIn: ${personInfo.linkedinUrl}` : null,
    personInfo.domain ? `Domain: ${personInfo.domain}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const meetingsSection =
    previousMeetings.length > 0
      ? previousMeetings
          .map((m) => `- ${m.date}: ${m.title}${m.notes ? ` (${m.notes})` : ''}`)
          .join('\n')
      : 'No previous meetings found.';

  return `Generate a meeting prep brief for an upcoming meeting with ${inviteeName} (${inviteeEmail}).

Meeting topic/type: ${eventTitle}

Person info:
${personSection}

Previous meetings with this person:
${meetingsSection}

Generate the following:
1. A 2-3 sentence summary about this person based on available info. If limited info is available, focus on what we know from their email domain and any company info.
2. A 2-3 sentence summary about their company. If no company info is available, state that.
3. 3-5 suggested talking points relevant to the meeting context and any prior interactions.

IMPORTANT: Respond ONLY with valid JSON in this exact format, no markdown, no code blocks:
{"inviteeSummary": "...", "companySummary": "...", "talkingPoints": ["...", "...", "..."]}`;
}

/**
 * Parse the AI response into a BriefGenerationResult.
 * Handles cases where the model wraps JSON in markdown code blocks.
 */
function parseAIResponse(text: string): BriefGenerationResult {
  // Strip markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  // Validate required fields
  if (typeof parsed.inviteeSummary !== 'string') {
    throw new Error('Missing or invalid inviteeSummary in AI response');
  }
  if (typeof parsed.companySummary !== 'string') {
    throw new Error('Missing or invalid companySummary in AI response');
  }
  if (!Array.isArray(parsed.talkingPoints)) {
    throw new Error('Missing or invalid talkingPoints in AI response');
  }

  return {
    inviteeSummary: parsed.inviteeSummary,
    companySummary: parsed.companySummary,
    talkingPoints: parsed.talkingPoints.filter((p): p is string => typeof p === 'string'),
  };
}

/**
 * Generate a meeting brief using Gemini AI.
 * Returns structured brief data or throws on failure.
 */
export async function generateBrief(params: {
  inviteeName: string;
  inviteeEmail: string;
  eventTitle: string;
  personInfo: PersonInfo;
  previousMeetings: PreviousMeeting[];
}): Promise<BriefGenerationResult> {
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
