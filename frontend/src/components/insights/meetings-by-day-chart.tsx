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
import { BarChart3 } from 'lucide-react';
import type { MeetingsByDay } from '../../types';

interface MeetingsByDayChartProps {
  data: MeetingsByDay;
}

export function MeetingsByDayChart({ data }: MeetingsByDayChartProps) {
  const hasData = data.days.some((d) => d.count > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Meetings by Day
        </CardTitle>
        <p className="text-xs text-gray-500">
          {data.busiestDay ? `Busiest day: ${data.busiestDay}` : 'No data yet'}
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
            <BarChart3 className="h-10 w-10 mb-2" />
            <p className="text-sm">No meeting data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.days} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <XAxis
                dataKey="day"
                tickFormatter={(day: string) => day.slice(0, 3)}
                tick={{ fontSize: 12 }}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [value ?? 0, 'Meetings']}
                labelFormatter={(label) => String(label)}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.days.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.day === data.busiestDay ? '#1D4ED8' : '#3B82F6'}
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
