import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Sparkles,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { AIInsightsResponse, InsightType, InsightPriority } from '../../types';

interface AIInsightsCardProps {
  data: AIInsightsResponse | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const TYPE_CONFIG: Record<InsightType, { icon: typeof Zap; color: string }> = {
  optimization: { icon: Zap, color: 'text-amber-500' },
  warning: { icon: AlertTriangle, color: 'text-red-500' },
  positive: { icon: CheckCircle2, color: 'text-green-500' },
  suggestion: { icon: Lightbulb, color: 'text-blue-500' },
};

const PRIORITY_STYLES: Record<InsightPriority, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

export function AIInsightsCard({ data, isLoading, error, onRetry }: AIInsightsCardProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">AI Insights</CardTitle>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
              Powered by AI
            </Badge>
          </div>
          {data && (
            <Badge variant="outline" className="text-[10px]">
              {data.cached ? 'Cached' : 'Fresh'}
            </Badge>
          )}
        </div>
        {data && (
          <p className="text-xs text-gray-500">
            Generated {formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true })}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-3 p-3 rounded-lg bg-gray-50">
                <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        )}

        {/* Empty state */}
        {data && data.insights.length === 0 && !isLoading && !error && (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-gray-400">
            <Lightbulb className="h-8 w-8" />
            <p className="text-sm">
              No insights available yet. Start scheduling meetings to get AI-powered recommendations.
            </p>
          </div>
        )}

        {/* Insights list */}
        {data && data.insights.length > 0 && !isLoading && !error && (
          <div className="space-y-3">
            {data.insights.map((insight, index) => {
              const config = TYPE_CONFIG[insight.type];
              const Icon = config.icon;
              const isExpanded = expanded.has(index);

              return (
                <div
                  key={index}
                  className="flex gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => toggleExpand(index)}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-white ${config.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">
                        {insight.title}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PRIORITY_STYLES[insight.priority]}`}
                      >
                        {insight.priority}
                      </span>
                    </div>
                    <p
                      className={`text-sm text-gray-600 ${!isExpanded ? 'line-clamp-2' : ''}`}
                    >
                      {insight.description}
                    </p>
                  </div>
                  <div className="shrink-0 self-center text-gray-400">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
