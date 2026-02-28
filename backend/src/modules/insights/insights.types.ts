// ── Date range filter ────────────────────────────────────────────────
export type DateRange = '7d' | '30d' | '90d' | '365d' | 'all';

// ── Meeting Stats ────────────────────────────────────────────────────
export interface MeetingStats {
  totalMeetings: number;
  totalHours: number;
  avgDurationMinutes: number;
  byStatus: {
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow: number;
    rescheduled: number;
  };
}

export interface MeetingStatsRow {
  total: string;
  total_hours: string;
  avg_duration_minutes: string;
  confirmed: string;
  completed: string;
  cancelled: string;
  no_show: string;
  rescheduled: string;
}

// ── Meetings by Day of Week ──────────────────────────────────────────
export interface DayCount {
  day: string;
  count: number;
}

export interface MeetingsByDay {
  days: DayCount[];
  busiestDay: string | null;
}

export interface DayCountRow {
  dow: string;
  count: string;
}

// ── Meetings by Hour ─────────────────────────────────────────────────
export interface HourCount {
  hour: number;
  count: number;
}

export interface MeetingsByHour {
  hours: HourCount[];
  peakHour: number | null;
}

export interface HourCountRow {
  hour: string;
  count: string;
}

// ── Meetings by Event Type ───────────────────────────────────────────
export interface TypeCount {
  eventTypeId: string;
  title: string;
  color: string;
  count: number;
  totalMinutes: number;
}

export interface MeetingsByType {
  types: TypeCount[];
}

export interface TypeCountRow {
  id: string;
  title: string;
  color: string;
  count: string;
  total_minutes: string;
}

// ── Meeting Trends (weekly) ──────────────────────────────────────────
export interface WeekCount {
  week: string;
  count: number;
}

export interface MeetingTrends {
  weeks: WeekCount[];
  currentPeriodCount: number;
  previousPeriodCount: number;
  changePercent: number | null;
}

export interface WeekCountRow {
  week: Date;
  count: string;
}

// ── No-Show / Cancellation Rate ──────────────────────────────────────
export interface NoShowStats {
  totalCompleted: number;
  totalCancelled: number;
  totalNoShow: number;
  cancellationRate: number;
  noShowRate: number;
}

export interface NoShowRow {
  completed: string;
  cancelled: string;
  no_show: string;
}

// ── AI Insights ──────────────────────────────────────────────────────
export type InsightType = 'optimization' | 'warning' | 'positive' | 'suggestion';
export type InsightPriority = 'high' | 'medium' | 'low';

export interface AIInsight {
  title: string;
  description: string;
  type: InsightType;
  priority: InsightPriority;
}

export interface AIInsightsResponse {
  insights: AIInsight[];
  generatedAt: string;
  expiresAt: string;
  cached: boolean;
}

export interface InsightsCacheRow {
  id: string;
  user_id: string;
  insights: AIInsight[];
  stats_snapshot: Record<string, unknown>;
  generated_at: Date;
  expires_at: Date;
}
