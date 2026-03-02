import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Sun,
  Moon,
  Clock,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Target,
} from 'lucide-react';
import type { MeetingStats, MeetingsByDay, MeetingsByHour, NoShowStats, MeetingTrends } from '../../types';

interface SmartRecommendationsProps {
  stats: MeetingStats;
  byDay: MeetingsByDay;
  byHour: MeetingsByHour;
  noShows: NoShowStats;
  trends: MeetingTrends;
}

interface Recommendation {
  icon: typeof Sun;
  iconColor: string;
  title: string;
  description: string;
}

const CANCELLATION_RATE_THRESHOLD = 15;
const NO_SHOW_RATE_THRESHOLD = 10;
const LONG_MEETING_THRESHOLD = 45;
const MEETINGS_PER_DAY_THRESHOLD = 4;

export function SmartRecommendations({
  stats,
  byDay,
  byHour,
  noShows,
  trends,
}: SmartRecommendationsProps) {
  const recommendations: Recommendation[] = [];

  // 1. Peak hours recommendation
  if (byHour.peakHour !== null) {
    const isAM = byHour.peakHour < 12;
    recommendations.push({
      icon: isAM ? Sun : Moon,
      iconColor: isAM ? 'text-amber-500' : 'text-indigo-500',
      title: `Most productive at ${formatHour(byHour.peakHour)}`,
      description: `Your meetings are concentrated around ${formatHour(byHour.peakHour)}. Consider blocking ${isAM ? 'afternoon' : 'morning'} time for deep work.`,
    });
  }

  // 2. Busiest day recommendation
  if (byDay.busiestDay) {
    const busiestCount = byDay.days.find((d) => d.day === byDay.busiestDay)?.count ?? 0;
    const avgPerDay = stats.totalMeetings / 7;
    if (busiestCount > avgPerDay * 1.5) {
      recommendations.push({
        icon: Target,
        iconColor: 'text-blue-500',
        title: `${byDay.busiestDay} is your busiest day`,
        description: `You have ${busiestCount} meetings on ${byDay.busiestDay}s. Spread meetings more evenly or keep this day for collaborative work.`,
      });
    }
  }

  // 3. Cancellation rate warning
  if (noShows.cancellationRate > CANCELLATION_RATE_THRESHOLD) {
    recommendations.push({
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      title: 'High cancellation rate',
      description: `Your ${noShows.cancellationRate.toFixed(1)}% cancellation rate is above average. Consider sending reminders or shortening meeting notice periods.`,
    });
  }

  // 4. No-show rate warning
  if (noShows.noShowRate > NO_SHOW_RATE_THRESHOLD) {
    recommendations.push({
      icon: AlertTriangle,
      iconColor: 'text-orange-500',
      title: 'No-show rate needs attention',
      description: `${noShows.noShowRate.toFixed(1)}% of attendees don't show up. Try sending confirmation emails or enabling calendar reminders.`,
    });
  }

  // 5. Long meetings suggestion
  if (stats.avgDurationMinutes > LONG_MEETING_THRESHOLD) {
    recommendations.push({
      icon: Clock,
      iconColor: 'text-purple-500',
      title: 'Meetings may be too long',
      description: `Your average meeting is ${Math.round(stats.avgDurationMinutes)} minutes. Try 25 or 50 minute meetings to leave buffer time.`,
    });
  }

  // 6. Meeting load suggestion
  const daysInRange = 30; // rough estimate for default range
  const avgDailyMeetings = stats.totalMeetings / daysInRange;
  if (avgDailyMeetings > MEETINGS_PER_DAY_THRESHOLD) {
    recommendations.push({
      icon: TrendingDown,
      iconColor: 'text-yellow-500',
      title: 'Heavy meeting load',
      description: `You average ${avgDailyMeetings.toFixed(1)} meetings per day. Consider batching meetings on specific days.`,
    });
  }

  // 7. Positive trend
  if (trends.changePercent !== null && trends.changePercent < -20) {
    recommendations.push({
      icon: CheckCircle2,
      iconColor: 'text-green-500',
      title: 'Meeting load decreasing',
      description: `Your meetings are down ${Math.abs(trends.changePercent).toFixed(0)}% compared to previous period. Great for productivity!`,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      icon: CheckCircle2,
      iconColor: 'text-green-500',
      title: 'Looking good!',
      description: 'Your meeting patterns are healthy. Keep up the good work!',
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-500" />
          Smart Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.slice(0, 4).map((rec, index) => {
            const Icon = rec.icon;
            return (
              <div
                key={index}
                className="flex gap-3 p-3 rounded-lg bg-gray-50"
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-white ${rec.iconColor}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900">{rec.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{rec.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}
