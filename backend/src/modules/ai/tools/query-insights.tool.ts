import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import * as insightsService from '../../insights/insights.service.js';
import type {
  DateRange,
  MeetingStats,
  MeetingsByDay,
  MeetingsByHour,
  MeetingsByType,
  MeetingTrends,
  NoShowStats,
  ComparisonMetrics,
} from '../../insights/insights.types.js';

// ── Formatter helpers ───────────────────────────────────────────────

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function formatChangePercent(pct: number | null): string {
  if (pct === null) return 'N/A';
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

function formatStats(stats: MeetingStats, range: string): string {
  return [
    `**Meeting Stats (${range})**\n`,
    `- Total meetings: ${stats.totalMeetings}`,
    `- Total hours in meetings: ${stats.totalHours}h`,
    `- Average duration: ${stats.avgDurationMinutes} minutes`,
    `- Status breakdown: ${stats.byStatus.confirmed} confirmed, ${stats.byStatus.completed} completed, ${stats.byStatus.cancelled} cancelled, ${stats.byStatus.noShow} no-show, ${stats.byStatus.rescheduled} rescheduled`,
  ].join('\n');
}

function formatByDay(data: MeetingsByDay, range: string): string {
  return [
    `**Meetings by Day of Week (${range})**\n`,
    ...data.days.map((d) => `- ${d.day}: ${d.count} meetings`),
    data.busiestDay ? `\nBusiest day: **${data.busiestDay}**` : '',
  ].filter(Boolean).join('\n');
}

function formatByHour(data: MeetingsByHour, range: string): string {
  if (data.hours.length === 0) return 'No meeting hour data available for this period.';
  return [
    `**Meetings by Hour (${range})**\n`,
    ...data.hours.map((h) => `- ${formatHourLabel(h.hour)}: ${h.count} meetings`),
    data.peakHour !== null ? `\nPeak hour: **${data.peakHour}:00**` : '',
  ].filter(Boolean).join('\n');
}

function formatByType(data: MeetingsByType, range: string): string {
  if (data.types.length === 0) return 'No meetings by type data available for this period.';
  return [
    `**Meetings by Event Type (${range})**\n`,
    ...data.types.map((t) => `- ${t.title}: ${t.count} meetings (${t.totalMinutes} min total)`),
  ].join('\n');
}

function formatTrends(data: MeetingTrends): string {
  const trendStr = data.changePercent !== null
    ? `${data.changePercent > 0 ? '+' : ''}${data.changePercent}% vs previous 12 weeks`
    : 'No previous period data';
  return [
    `**12-Week Meeting Trend**\n`,
    `- Current 12 weeks: ${data.currentPeriodCount} meetings`,
    `- Previous 12 weeks: ${data.previousPeriodCount} meetings`,
    `- Change: ${trendStr}`,
    '',
    'Weekly breakdown:',
    ...(data.weeks.length > 0
      ? data.weeks.map((w) => `  ${w.week}: ${w.count} meetings`)
      : ['  No weekly data available']),
  ].join('\n');
}

function formatNoShows(data: NoShowStats, range: string): string {
  return [
    `**No-Show & Cancellation Rates (${range})**\n`,
    `- Completed: ${data.totalCompleted}`,
    `- Cancelled: ${data.totalCancelled} (${data.cancellationRate}%)`,
    `- No-shows: ${data.totalNoShow} (${data.noShowRate}%)`,
  ].join('\n');
}

function formatComparison(data: ComparisonMetrics, range: string): string {
  return [
    `**Period Comparison (${range} vs previous ${range})**\n`,
    `- Total meetings: ${data.totalMeetings.current} (was ${data.totalMeetings.previous}) → ${formatChangePercent(data.totalMeetings.changePercent)}`,
    `- Total hours: ${data.totalHours.current}h (was ${data.totalHours.previous}h) → ${formatChangePercent(data.totalHours.changePercent)}`,
    `- Avg duration: ${data.avgDurationMinutes.current}min (was ${data.avgDurationMinutes.previous}min) → ${formatChangePercent(data.avgDurationMinutes.changePercent)}`,
    `- Cancellation rate: ${data.cancellationRate.current}% (was ${data.cancellationRate.previous}%) → ${formatChangePercent(data.cancellationRate.changePercent)}`,
  ].join('\n');
}

// ── Tool factory ────────────────────────────────────────────────────

export function createQueryInsightsTool(userId: string, userTimezone: string) {
  return new DynamicStructuredTool({
    name: 'query_insights',
    description:
      "Get the user's meeting insights and analytics. Use this when the user asks about their meeting patterns, stats, trends, busiest days, peak hours, or performance metrics.",
    schema: z.object({
      metric: z
        .enum(['stats', 'by_day', 'by_hour', 'by_type', 'trends', 'no_shows', 'comparison'])
        .describe(
          'Which metric to fetch: stats (totals/averages), by_day (busiest days), by_hour (peak hours), by_type (event type breakdown), trends (12-week trend), no_shows (cancellation/no-show rates), comparison (period-over-period comparison)',
        ),
      range: z
        .enum(['7d', '30d', '90d', '365d', 'all'])
        .default('30d')
        .describe('Date range filter (default 30d). Not used for trends which always uses 12 weeks.'),
    }),
    func: async ({ metric, range }) => {
      try {
        switch (metric) {
          case 'stats':
            return formatStats(await insightsService.getMeetingStats(userId, range), range);
          case 'by_day':
            return formatByDay(await insightsService.getMeetingsByDay(userId, range), range);
          case 'by_hour':
            return formatByHour(await insightsService.getMeetingsByHour(userId, range, userTimezone), range);
          case 'by_type':
            return formatByType(await insightsService.getMeetingsByType(userId, range), range);
          case 'trends':
            return formatTrends(await insightsService.getMeetingTrends(userId));
          case 'no_shows':
            return formatNoShows(await insightsService.getNoShowRate(userId, range), range);
          case 'comparison':
            return formatComparison(await insightsService.getComparisonMetrics(userId, range), range);
          default:
            return 'Unknown metric. Available: stats, by_day, by_hour, by_type, trends, no_shows, comparison';
        }
      } catch (error) {
        console.error('query_insights tool error:', error);
        return 'Sorry, I encountered an error fetching your insights. Please try again.';
      }
    },
  });
}
