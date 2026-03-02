import { useEffect, useState, useCallback } from 'react';
import { Button } from '../../../components/ui/button';
import { StatsCards } from '../../../components/insights/stats-cards';
import { MeetingsByDayChart } from '../../../components/insights/meetings-by-day-chart';
import { MeetingsByHourChart } from '../../../components/insights/meetings-by-hour-chart';
import { MeetingsTrendChart } from '../../../components/insights/meetings-trend-chart';
import { MeetingTypesChart } from '../../../components/insights/meeting-types-chart';
import { AIInsightsCard } from '../../../components/insights/ai-insights-card';
import { SmartRecommendations } from '../../../components/insights/smart-recommendations';
import { MeetingGoalCard } from '../../../components/insights/meeting-goal-card';
import { InsightsSkeleton } from '../../../components/insights/insights-skeleton';
import { InsightsEmptyState } from '../../../components/insights/insights-empty-state';
import { PDFExportButton } from '../../../components/insights/pdf-export-button';
import {
  getInsightsStats,
  getInsightsByDay,
  getInsightsByHour,
  getInsightsByType,
  getInsightsTrends,
  getInsightsNoShows,
  getAIInsights,
  refreshAIInsights,
} from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth-store';
import { useToast } from '../../../stores/toast-store';
import { RefreshCw } from 'lucide-react';
import type {
  DateRange,
  MeetingStatsWithComparison,
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
  const { user, fetchUser } = useAuthStore();

  // Date range
  const [range, setRange] = useState<DateRange>('30d');

  // Range-dependent data
  const [stats, setStats] = useState<MeetingStatsWithComparison | null>(null);
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
  const [aiRefreshing, setAiRefreshing] = useState(false);

  // Meeting goal from user profile
  const [meetingGoal, setMeetingGoal] = useState<number | null>(
    user?.meetingHoursGoal ?? null,
  );

  // Fetch range-dependent data
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      try {
        const [s, d, h, t, n] = await Promise.all([
          getInsightsStats(range, true),
          getInsightsByDay(range),
          getInsightsByHour(range),
          getInsightsByType(range),
          getInsightsNoShows(range),
        ]);

        if (!cancelled) {
          setStats(s);
          setByDay(d);
          setByHour(h);
          setByType(t);
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

  // Fetch trends + AI insights once on mount (not range-dependent)
  useEffect(() => {
    getInsightsTrends()
      .then(setTrends)
      .catch((e) => console.error('Failed to fetch trends:', e));
    fetchAIInsights();
  }, []);

  const fetchAIInsights = useCallback(async () => {
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
  }, []);

  const handleRefreshAI = useCallback(async () => {
    setAiRefreshing(true);
    setAiError(null);
    try {
      const data = await refreshAIInsights();
      setAiInsights(data);
    } catch (e) {
      console.error('Failed to refresh AI insights:', e);
      setAiError('Failed to regenerate insights. Please try again.');
    } finally {
      setAiRefreshing(false);
    }
  }, []);

  const handleRefreshAll = useCallback(async () => {
    // Re-trigger the range-dependent fetch by toggling range
    const currentRange = range;
    setRange('7d');
    // Use microtask to re-set (triggers useEffect re-run)
    setTimeout(() => setRange(currentRange), 0);
  }, [range]);

  const handleGoalUpdate = useCallback(
    (goal: number | null) => {
      setMeetingGoal(goal);
      // Refresh user to keep auth store in sync
      fetchUser();
    },
    [fetchUser],
  );

  // Check if there's truly no data
  const isEmpty = !isLoading && stats && stats.totalMeetings === 0;

  if (isLoading && !stats) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Insights</h1>
          <p className="text-gray-600">Analyze your meeting patterns and performance</p>
        </div>
        <InsightsSkeleton />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Insights</h1>
          <p className="text-gray-600">Analyze your meeting patterns and performance</p>
        </div>
        <InsightsEmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Insights</h1>
          <p className="text-gray-600">Analyze your meeting patterns and performance</p>
        </div>
        <div className="flex items-center gap-2">
          <PDFExportButton targetId="insights-export-area" />
          <Button variant="outline" size="sm" onClick={handleRefreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div id="insights-export-area">
        {/* Date range selector */}
        <div className="flex gap-2 mb-6">
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

        {/* Goal + Recommendations row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {stats && (
            <MeetingGoalCard
              stats={stats}
              goal={meetingGoal}
              onGoalUpdate={handleGoalUpdate}
            />
          )}
          {stats && byDay && byHour && noShows && trends && (
            <SmartRecommendations
              stats={stats}
              byDay={byDay}
              byHour={byHour}
              noShows={noShows}
              trends={trends}
            />
          )}
        </div>

        {/* Charts - 2 column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {byDay && <MeetingsByDayChart data={byDay} />}
          {byHour && <MeetingsByHourChart data={byHour} />}
          {trends && <MeetingsTrendChart data={trends} />}
          {byType && <MeetingTypesChart data={byType} />}
        </div>

        {/* AI Insights - full width */}
        <div className="mt-6">
          <AIInsightsCard
            data={aiInsights}
            isLoading={aiLoading}
            error={aiError}
            onRetry={fetchAIInsights}
            onRefresh={handleRefreshAI}
            isRefreshing={aiRefreshing}
          />
        </div>
      </div>
    </div>
  );
}
