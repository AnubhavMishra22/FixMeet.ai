import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Calendar, Clock, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MeetingStats, MeetingTrends, NoShowStats } from '../../types';

const CANCELLATION_RATE_WARNING_THRESHOLD = 20;

interface StatsCardsProps {
  stats: MeetingStats;
  noShows: NoShowStats;
  trends: MeetingTrends;
}

export function StatsCards({ stats, noShows, trends }: StatsCardsProps) {
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
          <div className="text-2xl font-bold">{stats.totalMeetings}</div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.totalHours.toFixed(1)} hours total
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
          <div className="text-2xl font-bold">
            {Math.round(stats.avgDurationMinutes)} min
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
          <div
            className={`text-2xl font-bold ${noShows.cancellationRate > CANCELLATION_RATE_WARNING_THRESHOLD ? 'text-red-600' : ''}`}
          >
            {noShows.cancellationRate.toFixed(1)}%
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
