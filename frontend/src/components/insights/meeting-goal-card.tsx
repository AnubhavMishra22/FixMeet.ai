import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Target, Edit3, Check, X } from 'lucide-react';
import type { MeetingStats } from '../../types';
import api from '../../lib/api';
import { useToast } from '../../stores/toast-store';

interface MeetingGoalCardProps {
  stats: MeetingStats;
  goal: number | null;
  onGoalUpdate: (goal: number | null) => void;
}

export function MeetingGoalCard({ stats, goal, onGoalUpdate }: MeetingGoalCardProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(goal?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  const hoursUsed = stats.totalHours;
  const progress = goal && goal > 0 ? Math.min((hoursUsed / goal) * 100, 100) : 0;
  const isOverGoal = goal !== null && hoursUsed > goal;

  const handleSave = async () => {
    setSaving(true);
    try {
      const newGoal = inputValue.trim() === '' ? null : parseFloat(inputValue);
      if (newGoal !== null && (isNaN(newGoal) || newGoal < 0 || newGoal > 168)) {
        return;
      }
      await api.patch('/api/auth/me', { meetingHoursGoal: newGoal });
      onGoalUpdate(newGoal);
      setEditing(false);
    } catch {
      toast({ title: 'Failed to update meeting goal', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setInputValue(goal?.toString() ?? '');
    setEditing(false);
  };

  const progressColor = isOverGoal
    ? 'bg-red-500'
    : progress > 80
      ? 'bg-yellow-500'
      : 'bg-green-500';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-500" />
            Meeting Hours Goal
          </CardTitle>
          {!editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInputValue(goal?.toString() ?? '');
                setEditing(true);
              }}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="168"
              step="0.5"
              placeholder="e.g. 20"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-24"
              autoFocus
            />
            <span className="text-sm text-gray-500">hours / period</span>
            <div className="flex gap-1 ml-auto">
              <Button size="sm" variant="ghost" onClick={handleCancel} disabled={saving}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : goal !== null ? (
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-2xl font-bold">
                  {hoursUsed.toFixed(1)}
                </span>
                <span className="text-gray-500 text-sm ml-1">
                  / {goal}h
                </span>
              </div>
              <span
                className={`text-sm font-medium ${isOverGoal ? 'text-red-600' : 'text-gray-600'}`}
              >
                {progress.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            {isOverGoal && (
              <p className="text-xs text-red-600">
                You're {(hoursUsed - goal).toFixed(1)}h over your goal
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400">
            <p className="text-sm">No goal set</p>
            <Button
              variant="link"
              size="sm"
              className="mt-1"
              onClick={() => {
                setInputValue('');
                setEditing(true);
              }}
            >
              Set a weekly meeting hours goal
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
