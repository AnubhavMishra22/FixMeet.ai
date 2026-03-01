import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Clock } from 'lucide-react';
import type { MeetingsByHour } from '../../types';

interface MeetingsByHourChartProps {
  data: MeetingsByHour;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12a';
  if (hour < 12) return `${hour}a`;
  if (hour === 12) return '12p';
  return `${hour - 12}p`;
}

function formatHourFull(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return '12:00 PM';
  return `${hour - 12}:00 PM`;
}

export function MeetingsByHourChart({ data }: MeetingsByHourChartProps) {
  // Pad sparse array to full 0-23 range
  const fullHours = Array.from({ length: 24 }, (_, i) => {
    const found = data.hours.find((h) => h.hour === i);
    return { hour: i, count: found?.count ?? 0 };
  });

  const hasData = data.hours.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Meetings by Hour
        </CardTitle>
        <p className="text-xs text-gray-500">
          {data.peakHour !== null
            ? `Peak hour: ${formatHourFull(data.peakHour)}`
            : 'No data yet'}
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
            <Clock className="h-10 w-10 mb-2" />
            <p className="text-sm">No meeting data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fullHours} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <XAxis
                dataKey="hour"
                tickFormatter={formatHour}
                interval={2}
                tick={{ fontSize: 11 }}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [value ?? 0, 'Meetings']}
                labelFormatter={(label) => formatHourFull(Number(label))}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {fullHours.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.hour === data.peakHour ? '#6D28D9' : '#8B5CF6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
