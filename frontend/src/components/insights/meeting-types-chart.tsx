import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart3 } from 'lucide-react';
import type { MeetingsByType } from '../../types';

interface MeetingTypesChartProps {
  data: MeetingsByType;
}

const FALLBACK_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899'];

export function MeetingTypesChart({ data }: MeetingTypesChartProps) {
  const hasData = data.types.length > 0;
  const totalCount = data.types.reduce((sum, t) => sum + t.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Meeting Types
        </CardTitle>
        <p className="text-xs text-gray-500">Breakdown by event type</p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
            <BarChart3 className="h-10 w-10 mb-2" />
            <p className="text-sm">No meeting type data</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.types}
                  dataKey="count"
                  nameKey="title"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  label={false}
                >
                  {data.types.map((entry, index) => (
                    <Cell
                      key={entry.eventTypeId}
                      fill={entry.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${value ?? 0} meetings`,
                    String(name),
                  ]}
                />
                {/* Center label */}
                <text
                  x="50%"
                  y="47%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-2xl font-bold"
                  fill="#1f2937"
                  fontSize={24}
                  fontWeight={700}
                >
                  {totalCount}
                </text>
                <text
                  x="50%"
                  y="57%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#9ca3af"
                  fontSize={12}
                >
                  total
                </text>
              </PieChart>
            </ResponsiveContainer>

            {/* Custom legend */}
            <div className="w-full space-y-2 mt-2">
              {data.types.map((type, index) => (
                <div key={type.eventTypeId} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        type.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
                    }}
                  />
                  <span className="truncate flex-1 text-gray-700">{type.title}</span>
                  <span className="text-gray-500 shrink-0">
                    {type.count} &middot; {(type.totalMinutes / 60).toFixed(1)}h
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
