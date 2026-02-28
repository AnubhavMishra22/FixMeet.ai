import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
import { env, DEFAULT_AI_MODEL } from '../../config/env.js';
import { sql } from '../../config/database.js';
import type { JSONValue } from 'postgres';
import * as insightsService from './insights.service.js';
import type {
  AIInsight,
  AIInsightsResponse,
  InsightsCacheRow,
  MeetingStats,
  MeetingsByDay,
  MeetingsByHour,
  MeetingsByType,
  MeetingTrends,
  NoShowStats,
} from './insights.types.js';

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

/** Create a one-off Gemini model instance */
function createModel(): ChatGoogleGenerativeAI | null {
  if (!env.GOOGLE_AI_API_KEY) return null;

  return new ChatGoogleGenerativeAI({
    apiKey: env.GOOGLE_AI_API_KEY,
    model: env.GOOGLE_AI_MODEL_NAME || DEFAULT_AI_MODEL,
    maxOutputTokens: env.GOOGLE_AI_MAX_TOKENS ? parseInt(env.GOOGLE_AI_MAX_TOKENS, 10) : 1024,
    temperature: 0.7,
  });
}

// ── Collected stats snapshot ─────────────────────────────────────────

interface StatsSnapshot {
  stats: MeetingStats;
  byDay: MeetingsByDay;
  byHour: MeetingsByHour;
  byType: MeetingsByType;
  trends: MeetingTrends;
  noShows: NoShowStats;
}

/** Collect all stats for the user (30d range for most, trends uses 12 weeks) */
async function collectStats(userId: string): Promise<StatsSnapshot> {
  const [stats, byDay, byHour, byType, trends, noShows] = await Promise.all([
    insightsService.getMeetingStats(userId, '30d'),
    insightsService.getMeetingsByDay(userId, '30d'),
    insightsService.getMeetingsByHour(userId, '30d'),
    insightsService.getMeetingsByType(userId, '30d'),
    insightsService.getMeetingTrends(userId),
    insightsService.getNoShowRate(userId, '30d'),
  ]);

  return { stats, byDay, byHour, byType, trends, noShows };
}

// ── Prompt building ──────────────────────────────────────────────────

function buildPrompt(snapshot: StatsSnapshot): string {
  const { stats, byDay, byHour, byType, trends, noShows } = snapshot;

  const typeBreakdown = byType.types
    .map((t) => `  - ${t.title}: ${t.count} meetings (${t.totalMinutes} min total)`)
    .join('\n');

  const weeklyTrend = trends.weeks
    .map((w) => `  ${w.week}: ${w.count}`)
    .join('\n');

  const trendDirection = trends.changePercent !== null
    ? `${trends.changePercent > 0 ? '+' : ''}${trends.changePercent}% vs previous 12 weeks`
    : 'No previous period data';

  return `Analyze this user's meeting data and provide actionable insights.

Data:
- Total meetings (30 days): ${stats.totalMeetings}
- Total hours in meetings: ${stats.totalHours}
- Average meeting duration: ${stats.avgDurationMinutes} minutes
- Busiest day: ${byDay.busiestDay ?? 'N/A'}
- Peak hour: ${byHour.peakHour !== null ? `${byHour.peakHour}:00` : 'N/A'}
- No-show rate: ${noShows.noShowRate}%
- Cancellation rate: ${noShows.cancellationRate}%
- Completed: ${noShows.totalCompleted}, Cancelled: ${noShows.totalCancelled}, No-shows: ${noShows.totalNoShow}
- Meeting types breakdown:
${typeBreakdown || '  No meetings by type'}
- Weekly trend (last 12 weeks):
${weeklyTrend || '  No weekly data'}
- Trend: ${trendDirection}
- Status breakdown: ${stats.byStatus.confirmed} confirmed, ${stats.byStatus.completed} completed, ${stats.byStatus.cancelled} cancelled, ${stats.byStatus.noShow} no-show

Generate 3-5 specific, actionable insights such as:
- Schedule optimization suggestions
- Time blocking recommendations
- No-show reduction tips
- Work-life balance observations
- Comparison to healthy meeting patterns

Be specific with numbers. Keep each insight to 1-2 sentences.
If the user has very few or no meetings, provide helpful onboarding tips instead.

IMPORTANT: Respond ONLY with valid JSON in this exact format, no markdown, no code blocks:
{"insights": [{"title": "...", "description": "...", "type": "...", "priority": "..."}]}
Types: optimization, warning, positive, suggestion
Priority: high, medium, low`;
}

// ── Parse AI response ────────────────────────────────────────────────

function parseAIResponse(text: string): AIInsight[] {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  if (!Array.isArray(parsed.insights)) {
    throw new Error('Missing or invalid insights array in AI response');
  }

  const validTypes = new Set(['optimization', 'warning', 'positive', 'suggestion']);
  const validPriorities = new Set(['high', 'medium', 'low']);

  return parsed.insights
    .filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === 'object',
    )
    .map((item) => ({
      title: typeof item.title === 'string' ? item.title : 'Insight',
      description: typeof item.description === 'string' ? item.description : '',
      type: (typeof item.type === 'string' && validTypes.has(item.type)
        ? item.type
        : 'suggestion') as AIInsight['type'],
      priority: (typeof item.priority === 'string' && validPriorities.has(item.priority)
        ? item.priority
        : 'medium') as AIInsight['priority'],
    }))
    .filter((item) => item.description.length > 0);
}

// ── Cache layer ──────────────────────────────────────────────────────

async function getCachedInsights(userId: string): Promise<InsightsCacheRow | null> {
  const rows = await sql<InsightsCacheRow[]>`
    SELECT * FROM insights_cache
    WHERE user_id = ${userId} AND expires_at > NOW()
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function saveToCache(
  userId: string,
  insights: AIInsight[],
  statsSnapshot: StatsSnapshot,
): Promise<InsightsCacheRow> {
  const rows = await sql<InsightsCacheRow[]>`
    INSERT INTO insights_cache (user_id, insights, stats_snapshot, generated_at, expires_at)
    VALUES (
      ${userId},
      ${sql.json(insights as unknown as JSONValue)},
      ${sql.json(statsSnapshot as unknown as JSONValue)},
      NOW(),
      NOW() + INTERVAL '24 hours'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      insights = EXCLUDED.insights,
      stats_snapshot = EXCLUDED.stats_snapshot,
      generated_at = EXCLUDED.generated_at,
      expires_at = EXCLUDED.expires_at
    RETURNING *
  `;
  return rows[0]!;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Get AI insights for a user. Returns cached insights if valid,
 * otherwise generates fresh insights from Gemini.
 */
export async function getAIInsights(userId: string): Promise<AIInsightsResponse> {
  // 1. Check cache first
  const cached = await getCachedInsights(userId);
  if (cached) {
    return {
      insights: cached.insights,
      generatedAt: cached.generated_at.toISOString(),
      expiresAt: cached.expires_at.toISOString(),
      cached: true,
    };
  }

  // 2. Collect all stats
  const snapshot = await collectStats(userId);

  // 3. Generate insights with AI
  const model = createModel();
  if (!model) {
    // Return empty insights if AI not configured
    return {
      insights: [],
      generatedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      cached: false,
    };
  }

  await rateLimitDelay();

  const prompt = buildPrompt(snapshot);
  const response = await model.invoke([new HumanMessage(prompt)]);

  const content =
    typeof response.content === 'string'
      ? response.content
      : Array.isArray(response.content)
        ? response.content
            .map((c) => {
              if (typeof c === 'string') return c;
              if (c && typeof c === 'object' && 'text' in c) return String(c.text);
              return '';
            })
            .join('')
        : '';

  if (!content) {
    throw new Error('Empty response from AI model');
  }

  const insights = parseAIResponse(content);

  // 4. Save to cache
  const cacheRow = await saveToCache(userId, insights, snapshot);

  return {
    insights,
    generatedAt: cacheRow.generated_at.toISOString(),
    expiresAt: cacheRow.expires_at.toISOString(),
    cached: false,
  };
}
