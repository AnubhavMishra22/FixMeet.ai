import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { StatsCards } from '../../../components/insights/stats-cards';
import { MeetingsByDayChart } from '../../../components/insights/meetings-by-day-chart';
import { MeetingsByHourChart } from '../../../components/insights/meetings-by-hour-chart';
import { MeetingsTrendChart } from '../../../components/insights/meetings-trend-chart';
import { MeetingTypesChart } from '../../../components/insights/meeting-types-chart';
import { AIInsightsCard } from '../../../components/insights/ai-insights-card';
import {
  getInsightsStats,
  getInsightsByDay,
  getInsightsByHour,
  getInsightsByType,
  getInsightsTrends,
  getInsightsNoShows,
  getAIInsights,
} from '../../../lib/api';
import { useToast } from '../../../stores/toast-store';
import type {
  DateRange,
  MeetingStats,
  MeetingsByDay,
  MeetingsByHour,
  MeetingsByType,
  MeetingTrends,
  NoShowStats,
  AIInsightsResponse,
} from '../../../types';

const RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export default function InsightsPage() {
  const { toast } = useToast();

  // Date range
  const [range, setRange] = useState<DateRange>('30d');

  // Range-dependent data
  const [stats, setStats] = useState<MeetingStats | null>(null);
  const [byDay, setByDay] = useState<MeetingsByDay | null>(null);
  const [byHour, setByHour] = useState<MeetingsByHour | null>(null);
  const [byType, setByType] = useState<MeetingsByType | null>(null);
  const [trends, setTrends] = useState<MeetingTrends | null>(null);
  const [noShows, setNoShows] = useState<NoShowStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // AI insights (independent)
  const [aiInsights, setAiInsights] = useState<AIInsightsResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);

  // Fetch range-dependent data
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      try {
        const [s, d, h, t, tr, n] = await Promise.all([
          getInsightsStats(range),
          getInsightsByDay(range),
          getInsightsByHour(range),
          getInsightsByType(range),
          getInsightsTrends(),
          getInsightsNoShows(range),
        ]);

        if (!cancelled) {
          setStats(s);
          setByDay(d);
          setByHour(h);
          setByType(t);
          setTrends(tr);
          setNoShows(n);
        }
      } catch (e) {
        console.error('Failed to fetch insights data:', e);
        if (!cancelled) {
          toast({ title: 'Failed to load insights data', variant: 'destructive' });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [range]);

  // Fetch AI insights (once on mount)
  useEffect(() => {
    fetchAIInsights();
  }, []);

  async function fetchAIInsights() {
    setAiLoading(true);
    setAiError(null);
    try {
      const data = await getAIInsights();
      setAiInsights(data);
    } catch (e) {
      console.error('Failed to fetch AI insights:', e);
      setAiError('Failed to generate AI insights. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-gray-600">Analyze your meeting patterns and performance</p>
      </div>

      {/* Date range selector */}
      <div className="flex gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={range === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Stats cards */}
      {stats && noShows && trends && (
        <StatsCards stats={stats} noShows={noShows} trends={trends} />
      )}

      {/* Charts - 2 column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {byDay && <MeetingsByDayChart data={byDay} />}
        {byHour && <MeetingsByHourChart data={byHour} />}
        {trends && <MeetingsTrendChart data={trends} />}
        {byType && <MeetingTypesChart data={byType} />}
      </div>

      {/* AI Insights - full width */}
      <AIInsightsCard
        data={aiInsights}
        isLoading={aiLoading}
        error={aiError}
        onRetry={fetchAIInsights}
      />
    </div>
  );
}
