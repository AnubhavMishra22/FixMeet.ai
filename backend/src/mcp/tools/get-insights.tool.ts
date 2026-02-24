import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  getMeetingStats,
  getMeetingsByDay,
  getMeetingsByHour,
  getMeetingsByType,
  getMeetingTrends,
  getNoShowRate,
  getComparisonMetrics,
} from '../../modules/insights/insights.service.js';
import { getAIInsights } from '../../modules/insights/ai-insights.service.js';
import type { DateRange } from '../../modules/insights/insights.types.js';
import type { McpContext } from '../types.js';
import { mcpResult, mcpError, getUserTimezone } from '../types.js';

/**
 * Registers the get_insights tool on the MCP server.
 *
 * Returns meeting analytics including stats, breakdowns by day/hour/type,
 * trends, no-show rates, period comparisons, and AI-generated insights.
 */
export function registerGetInsightsTool(
  server: McpServer,
  context?: McpContext,
): void {
  server.tool(
    'get_insights',
    'Get meeting analytics and AI-generated insights. Supports different metrics: stats (totals), by_day (busiest days), by_hour (peak hours), by_type (event type breakdown), trends (weekly trends), no_shows (cancellation rates), comparison (period over period), or ai (AI-generated insights).',
    {
      metric: z
        .enum(['stats', 'by_day', 'by_hour', 'by_type', 'trends', 'no_shows', 'comparison', 'ai'])
        .default('stats')
        .describe('The type of analytics to retrieve'),
      range: z
        .enum(['7d', '30d', '90d'])
        .default('30d')
        .describe('Time range for the analytics (default: 30d)'),
    },
    async ({ metric, range }) => {
      if (!context) {
        return mcpError('Authentication required. Please provide a valid API token.');
      }

      try {
        const dateRange = range as DateRange;
        const userTimezone = await getUserTimezone(context.userId);

        switch (metric) {
          case 'stats': {
            const stats = await getMeetingStats(context.userId, dateRange);
            return mcpResult({ metric: 'stats', range, ...stats });
          }

          case 'by_day': {
            const byDay = await getMeetingsByDay(context.userId, dateRange);
            return mcpResult({ metric: 'by_day', range, ...byDay });
          }

          case 'by_hour': {
            const byHour = await getMeetingsByHour(context.userId, dateRange, userTimezone);
            return mcpResult({ metric: 'by_hour', range, timezone: userTimezone, ...byHour });
          }

          case 'by_type': {
            const byType = await getMeetingsByType(context.userId, dateRange);
            return mcpResult({ metric: 'by_type', range, ...byType });
          }

          case 'trends': {
            const trends = await getMeetingTrends(context.userId);
            return mcpResult({ metric: 'trends', ...trends });
          }

          case 'no_shows': {
            const noShows = await getNoShowRate(context.userId, dateRange);
            return mcpResult({ metric: 'no_shows', range, ...noShows });
          }

          case 'comparison': {
            const comparison = await getComparisonMetrics(context.userId, dateRange);
            return mcpResult({ metric: 'comparison', range, ...comparison });
          }

          case 'ai': {
            const aiInsights = await getAIInsights(context.userId);
            return mcpResult({
              metric: 'ai',
              insights: aiInsights.insights,
              generatedAt: aiInsights.generatedAt,
              cached: aiInsights.cached,
            });
          }

          default:
            return mcpError(`Unknown metric: ${metric as string}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('MCP get_insights error:', message);
        return mcpError(`Failed to get insights: ${message}`);
      }
    },
  );
}
