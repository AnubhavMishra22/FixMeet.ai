import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MeetingTrends } from '../../types';

interface MeetingsTrendChartProps {
  data: MeetingTrends;
}

function formatWeekLabel(week: string): string {
  // week is ISO date string like "2026-02-16" or ISO week "2026-W08"
  // Try parsing as date first
  const date = new Date(week);
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return week;
}

export function MeetingsTrendChart({ data }: MeetingsTrendChartProps) {
  const hasData = data.weeks.length > 0;

  const trendBadge =
    data.changePercent === null ? null : data.changePercent >= 0 ? (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
        <TrendingUp className="h-3 w-3" />
        +{data.changePercent.toFixed(0)}%
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
        <TrendingDown className="h-3 w-3" />
        {data.changePercent.toFixed(0)}%
      </span>
    );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Weekly Trend
          </CardTitle>
          {trendBadge}
        </div>
        <p className="text-xs text-gray-500">Meeting count over the last 12 weeks</p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
            <Minus className="h-10 w-10 mb-2" />
            <p className="text-sm">No trend data yet</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.weeks} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="week"
                  tickFormatter={formatWeekLabel}
                  tick={{ fontSize: 11 }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [value ?? 0, 'Meetings']}
                  labelFormatter={(label) => `Week of ${formatWeekLabel(String(label))}`}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#3B82F6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-6 mt-3 text-xs text-gray-500">
              <span>
                Current 12 weeks:{' '}
                <strong className="text-gray-700">{data.currentPeriodCount}</strong>
              </span>
              <span>
                Previous 12 weeks:{' '}
                <strong className="text-gray-700">{data.previousPeriodCount}</strong>
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
