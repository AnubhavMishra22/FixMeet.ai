import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Calendar, Clock, XCircle, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import type { MeetingStatsWithComparison, MeetingTrends, NoShowStats, ComparisonMetric } from '../../types';

const CANCELLATION_RATE_WARNING_THRESHOLD = 20;

interface StatsCardsProps {
  stats: MeetingStatsWithComparison;
  noShows: NoShowStats;
  trends: MeetingTrends;
}

/** Small comparison badge showing change from previous period */
function ComparisonBadge({ metric, invertColor }: { metric: ComparisonMetric; invertColor?: boolean }) {
  if (metric.changePercent === null) return null;

  const isPositive = metric.changePercent > 0;
  // For cancellation rate, going up is bad (invert the color)
  const isGood = invertColor ? !isPositive : isPositive;
  const color = isGood ? 'text-green-600' : 'text-red-600';
  const Icon = isPositive ? ArrowUp : ArrowDown;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(metric.changePercent).toFixed(0)}%
    </span>
  );
}

export function StatsCards({ stats, noShows, trends }: StatsCardsProps) {
  const comparison = stats.comparison;

  const trendIcon =
    trends.changePercent === null ? (
      <Minus className="h-4 w-4 text-gray-400" />
    ) : trends.changePercent >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );

  const trendColor =
    trends.changePercent === null
      ? 'text-gray-500'
      : trends.changePercent >= 0
        ? 'text-green-600'
        : 'text-red-600';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Meetings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Meetings
          </CardTitle>
          <Calendar className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{stats.totalMeetings}</span>
            {comparison && <ComparisonBadge metric={comparison.totalMeetings} />}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.totalHours.toFixed(1)} hours total
            {comparison && comparison.totalHours.previous > 0 && (
              <span className="ml-1">(was {comparison.totalHours.previous}h)</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Avg Duration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Avg Duration
          </CardTitle>
          <Clock className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {Math.round(stats.avgDurationMinutes)} min
            </span>
            {comparison && <ComparisonBadge metric={comparison.avgDurationMinutes} />}
          </div>
          <p className="text-xs text-gray-500 mt-1">per meeting</p>
        </CardContent>
      </Card>

      {/* Cancellation Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Cancellation Rate
          </CardTitle>
          <XCircle
            className={`h-4 w-4 ${noShows.cancellationRate > CANCELLATION_RATE_WARNING_THRESHOLD ? 'text-red-500' : 'text-gray-400'}`}
          />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${noShows.cancellationRate > CANCELLATION_RATE_WARNING_THRESHOLD ? 'text-red-600' : ''}`}
            >
              {noShows.cancellationRate.toFixed(1)}%
            </span>
            {comparison && <ComparisonBadge metric={comparison.cancellationRate} invertColor />}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {noShows.totalCancelled} of{' '}
            {noShows.totalCompleted + noShows.totalCancelled + noShows.totalNoShow}
          </p>
        </CardContent>
      </Card>

      {/* Trend */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            12-Week Trend
          </CardTitle>
          {trendIcon}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${trendColor}`}>
            {trends.changePercent !== null
              ? `${trends.changePercent > 0 ? '+' : ''}${trends.changePercent.toFixed(0)}%`
              : 'N/A'}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {trends.changePercent !== null
              ? 'vs previous period'
              : 'Not enough data'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
