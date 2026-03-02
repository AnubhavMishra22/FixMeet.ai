import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import * as insightsService from '../../insights/insights.service.js';
import type { DateRange } from '../../insights/insights.types.js';

export function createQueryInsightsTool(userId: string, _userTimezone: string) {
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
        const dateRange: DateRange = range;

        switch (metric) {
          case 'stats': {
            const stats = await insightsService.getMeetingStats(userId, dateRange);
            const lines = [
              `**Meeting Stats (${range})**\n`,
              `- Total meetings: ${stats.totalMeetings}`,
              `- Total hours in meetings: ${stats.totalHours}h`,
              `- Average duration: ${stats.avgDurationMinutes} minutes`,
              `- Status breakdown: ${stats.byStatus.confirmed} confirmed, ${stats.byStatus.completed} completed, ${stats.byStatus.cancelled} cancelled, ${stats.byStatus.noShow} no-show, ${stats.byStatus.rescheduled} rescheduled`,
            ];
            return lines.join('\n');
          }

          case 'by_day': {
            const data = await insightsService.getMeetingsByDay(userId, dateRange);
            const lines = [
              `**Meetings by Day of Week (${range})**\n`,
              ...data.days.map((d) => `- ${d.day}: ${d.count} meetings`),
              data.busiestDay ? `\nBusiest day: **${data.busiestDay}**` : '',
            ];
            return lines.filter(Boolean).join('\n');
          }

          case 'by_hour': {
            const data = await insightsService.getMeetingsByHour(userId, dateRange);
            if (data.hours.length === 0) return 'No meeting hour data available for this period.';
            const lines = [
              `**Meetings by Hour (${range})**\n`,
              ...data.hours.map((h) => {
                const label = h.hour === 0 ? '12 AM' : h.hour < 12 ? `${h.hour} AM` : h.hour === 12 ? '12 PM' : `${h.hour - 12} PM`;
                return `- ${label}: ${h.count} meetings`;
              }),
              data.peakHour !== null ? `\nPeak hour: **${data.peakHour}:00**` : '',
            ];
            return lines.filter(Boolean).join('\n');
          }

          case 'by_type': {
            const data = await insightsService.getMeetingsByType(userId, dateRange);
            if (data.types.length === 0) return 'No meetings by type data available for this period.';
            const lines = [
              `**Meetings by Event Type (${range})**\n`,
              ...data.types.map((t) => `- ${t.title}: ${t.count} meetings (${t.totalMinutes} min total)`),
            ];
            return lines.join('\n');
          }

          case 'trends': {
            const data = await insightsService.getMeetingTrends(userId);
            const trendStr = data.changePercent !== null
              ? `${data.changePercent > 0 ? '+' : ''}${data.changePercent}% vs previous 12 weeks`
              : 'No previous period data';
            const lines = [
              `**12-Week Meeting Trend**\n`,
              `- Current 12 weeks: ${data.currentPeriodCount} meetings`,
              `- Previous 12 weeks: ${data.previousPeriodCount} meetings`,
              `- Change: ${trendStr}`,
              '',
              'Weekly breakdown:',
              ...(data.weeks.length > 0
                ? data.weeks.map((w) => `  ${w.week}: ${w.count} meetings`)
                : ['  No weekly data available']),
            ];
            return lines.join('\n');
          }

          case 'no_shows': {
            const data = await insightsService.getNoShowRate(userId, dateRange);
            const lines = [
              `**No-Show & Cancellation Rates (${range})**\n`,
              `- Completed: ${data.totalCompleted}`,
              `- Cancelled: ${data.totalCancelled} (${data.cancellationRate}%)`,
              `- No-shows: ${data.totalNoShow} (${data.noShowRate}%)`,
            ];
            return lines.join('\n');
          }

          case 'comparison': {
            const data = await insightsService.getComparisonMetrics(userId, dateRange);
            const fmtChange = (pct: number | null) =>
              pct !== null ? `${pct > 0 ? '+' : ''}${pct}%` : 'N/A';
            const lines = [
              `**Period Comparison (${range} vs previous ${range})**\n`,
              `- Total meetings: ${data.totalMeetings.current} (was ${data.totalMeetings.previous}) → ${fmtChange(data.totalMeetings.changePercent)}`,
              `- Total hours: ${data.totalHours.current}h (was ${data.totalHours.previous}h) → ${fmtChange(data.totalHours.changePercent)}`,
              `- Avg duration: ${data.avgDurationMinutes.current}min (was ${data.avgDurationMinutes.previous}min) → ${fmtChange(data.avgDurationMinutes.changePercent)}`,
              `- Cancellation rate: ${data.cancellationRate.current}% (was ${data.cancellationRate.previous}%) → ${fmtChange(data.cancellationRate.changePercent)}`,
            ];
            return lines.join('\n');
          }

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
