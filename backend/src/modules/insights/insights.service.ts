import { sql } from '../../config/database.js';
import type {
  DateRange,
  MeetingStats,
  MeetingStatsRow,
  MeetingsByDay,
  DayCountRow,
  MeetingsByHour,
  HourCountRow,
  MeetingsByType,
  TypeCountRow,
  MeetingTrends,
  NoShowStats,
  NoShowRow,
} from './insights.types.js';

// ── Helpers ──────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const RANGE_DAYS: Record<Exclude<DateRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '365d': 365,
};

function getDateRangeStart(range: DateRange): Date | null {
  if (range === 'all') return null;
  const days = RANGE_DAYS[range];
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/** Build a WHERE fragment for optional date range filtering */
function dateFilter(rangeStart: Date | null) {
  return rangeStart ? sql`AND b.start_time >= ${rangeStart.toISOString()}` : sql``;
}

// ── Aggregation Functions ────────────────────────────────────────────

export async function getMeetingStats(
  userId: string,
  range: DateRange,
): Promise<MeetingStats> {
  const rangeStart = getDateRangeStart(range);

  const rows = await sql<MeetingStatsRow[]>`
    SELECT
      COUNT(*)::text AS total,
      COALESCE(SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 3600), 0)::text AS total_hours,
      COALESCE(AVG(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 60), 0)::text AS avg_duration_minutes,
      COUNT(*) FILTER (WHERE b.status = 'confirmed')::text AS confirmed,
      COUNT(*) FILTER (WHERE b.status = 'completed')::text AS completed,
      COUNT(*) FILTER (WHERE b.status = 'cancelled')::text AS cancelled,
      COUNT(*) FILTER (WHERE b.status = 'no_show')::text AS no_show,
      COUNT(*) FILTER (WHERE b.status = 'rescheduled')::text AS rescheduled
    FROM bookings b
    WHERE b.host_id = ${userId}
      ${dateFilter(rangeStart)}
  `;

  const row = rows[0]!;
  return {
    totalMeetings: parseInt(row.total, 10),
    totalHours: Math.round(parseFloat(row.total_hours) * 10) / 10,
    avgDurationMinutes: Math.round(parseFloat(row.avg_duration_minutes)),
    byStatus: {
      confirmed: parseInt(row.confirmed, 10),
      completed: parseInt(row.completed, 10),
      cancelled: parseInt(row.cancelled, 10),
      noShow: parseInt(row.no_show, 10),
      rescheduled: parseInt(row.rescheduled, 10),
    },
  };
}

export async function getMeetingsByDay(
  userId: string,
  range: DateRange,
): Promise<MeetingsByDay> {
  const rangeStart = getDateRangeStart(range);

  const rows = await sql<DayCountRow[]>`
    WITH all_days AS (
      SELECT generate_series(0, 6) AS dow
    ),
    day_counts AS (
      SELECT
        EXTRACT(DOW FROM b.start_time)::int AS dow,
        COUNT(*)::text AS count
      FROM bookings b
      WHERE b.host_id = ${userId}
        AND b.status IN ('confirmed', 'completed')
        ${dateFilter(rangeStart)}
      GROUP BY dow
    )
    SELECT
      a.dow::text,
      COALESCE(d.count, '0') AS count
    FROM all_days a
    LEFT JOIN day_counts d ON a.dow = d.dow
    ORDER BY a.dow
  `;

  const days = rows.map((r) => ({
    day: DAY_NAMES[parseInt(r.dow, 10)]!,
    count: parseInt(r.count, 10),
  }));

  let busiestDay: string | null = null;
  let maxCount = 0;
  for (const d of days) {
    if (d.count > maxCount) {
      maxCount = d.count;
      busiestDay = d.day;
    }
  }

  return { days, busiestDay };
}

export async function getMeetingsByHour(
  userId: string,
  range: DateRange,
): Promise<MeetingsByHour> {
  const rangeStart = getDateRangeStart(range);

  // Fetch user timezone for hour extraction
  const userRows = await sql<{ timezone: string }[]>`
    SELECT timezone FROM users WHERE id = ${userId}
  `;
  const userTimezone = userRows[0]?.timezone ?? 'UTC';

  const rows = await sql<HourCountRow[]>`
    SELECT
      EXTRACT(HOUR FROM b.start_time AT TIME ZONE ${userTimezone})::text AS hour,
      COUNT(*)::text AS count
    FROM bookings b
    WHERE b.host_id = ${userId}
      AND b.status IN ('confirmed', 'completed')
      ${dateFilter(rangeStart)}
    GROUP BY hour
    ORDER BY hour
  `;

  // Build sparse array (only hours with meetings)
  const hours = rows.map((r) => ({
    hour: parseInt(r.hour, 10),
    count: parseInt(r.count, 10),
  }));

  let peakHour: number | null = null;
  let maxCount = 0;
  for (const h of hours) {
    if (h.count > maxCount) {
      maxCount = h.count;
      peakHour = h.hour;
    }
  }

  return { hours, peakHour };
}

export async function getMeetingsByType(
  userId: string,
  range: DateRange,
): Promise<MeetingsByType> {
  const rangeStart = getDateRangeStart(range);

  const rows = await sql<TypeCountRow[]>`
    SELECT
      et.id,
      et.title,
      et.color,
      COUNT(b.id)::text AS count,
      COALESCE(SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 60), 0)::text AS total_minutes
    FROM bookings b
    JOIN event_types et ON b.event_type_id = et.id
    WHERE b.host_id = ${userId}
      AND b.status IN ('confirmed', 'completed')
      ${dateFilter(rangeStart)}
    GROUP BY et.id, et.title, et.color
    ORDER BY count DESC
  `;

  return {
    types: rows.map((r) => ({
      eventTypeId: r.id,
      title: r.title,
      color: r.color,
      count: parseInt(r.count, 10),
      totalMinutes: Math.round(parseFloat(r.total_minutes)),
    })),
  };
}

export async function getMeetingTrends(userId: string): Promise<MeetingTrends> {
  // Single query: weekly breakdown + both period totals
  const rows = await sql<{
    weeks: { week: string; count: string }[] | null;
    current_period_count: string;
    previous_period_count: string;
  }[]>`
    SELECT
      (
        SELECT json_agg(t)
        FROM (
          SELECT
            DATE_TRUNC('week', b2.start_time) AS week,
            COUNT(*)::text AS count
          FROM bookings b2
          WHERE b2.host_id = ${userId}
            AND b2.status IN ('confirmed', 'completed')
            AND b2.start_time >= NOW() - INTERVAL '12 weeks'
          GROUP BY week
          ORDER BY week
        ) t
      ) AS weeks,
      COUNT(*) FILTER (
        WHERE b.start_time >= NOW() - INTERVAL '12 weeks'
      )::text AS current_period_count,
      COUNT(*) FILTER (
        WHERE b.start_time >= NOW() - INTERVAL '24 weeks' AND b.start_time < NOW() - INTERVAL '12 weeks'
      )::text AS previous_period_count
    FROM bookings b
    WHERE b.host_id = ${userId}
      AND b.status IN ('confirmed', 'completed')
      AND b.start_time >= NOW() - INTERVAL '24 weeks'
  `;

  const row = rows[0]!;
  const weeks = (row.weeks ?? []).map((r) => ({
    week: r.week.slice(0, 10),
    count: parseInt(r.count, 10),
  }));

  const currentPeriodCount = parseInt(row.current_period_count, 10);
  const previousPeriodCount = parseInt(row.previous_period_count, 10);

  let changePercent: number | null = null;
  if (previousPeriodCount > 0) {
    changePercent =
      Math.round(((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 1000) / 10;
  }

  return { weeks, currentPeriodCount, previousPeriodCount, changePercent };
}

export async function getNoShowRate(
  userId: string,
  range: DateRange,
): Promise<NoShowStats> {
  const rangeStart = getDateRangeStart(range);

  const rows = await sql<NoShowRow[]>`
    SELECT
      COUNT(*) FILTER (WHERE b.status = 'completed')::text AS completed,
      COUNT(*) FILTER (WHERE b.status = 'cancelled')::text AS cancelled,
      COUNT(*) FILTER (WHERE b.status = 'no_show')::text AS no_show
    FROM bookings b
    WHERE b.host_id = ${userId}
      ${dateFilter(rangeStart)}
  `;

  const row = rows[0]!;
  const completed = parseInt(row.completed, 10);
  const cancelled = parseInt(row.cancelled, 10);
  const noShow = parseInt(row.no_show, 10);
  const total = completed + cancelled + noShow;

  return {
    totalCompleted: completed,
    totalCancelled: cancelled,
    totalNoShow: noShow,
    cancellationRate: total > 0 ? Math.round((cancelled / total) * 1000) / 10 : 0,
    noShowRate: total > 0 ? Math.round((noShow / total) * 1000) / 10 : 0,
  };
}
