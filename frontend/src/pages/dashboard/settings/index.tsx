import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { FileText, MailCheck } from 'lucide-react';
import { Switch } from '../../../components/ui/switch';
import { useAuthStore } from '../../../stores/auth-store';
import { useToast } from '../../../stores/toast-store';
import api from '../../../lib/api';
import type { CalendarConnection } from '../../../types';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z.string().min(3).max(50).regex(/^[a-z0-9_-]+$/, 'Only lowercase letters, numbers, hyphens, and underscores'),
  timezone: z.string(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export default function SettingsPage() {
  const { user, fetchUser } = useAuthStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      username: user?.username || '',
      timezone: user?.timezone || 'America/New_York',
    },
  });

  const onSubmit = async (data: ProfileForm) => {
    setIsSubmitting(true);
    try {
      await api.patch('/api/auth/me', data);
      await fetchUser();
      toast({ title: 'Profile updated!' });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast({
        title: err.response?.data?.error?.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-600">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="username">Username</Label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">fixmeet.ai/</span>
                <Input id="username" {...register('username')} />
              </div>
              {errors.username && (
                <p className="text-sm text-red-500 mt-1">{errors.username.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ''} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('timezone')}
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendar Connections</CardTitle>
          <CardDescription>Connect your calendars to check availability</CardDescription>
        </CardHeader>
        <CardContent>
          <CalendarConnections />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Meeting Briefs
          </CardTitle>
          <CardDescription>AI-generated preparation notes for your meetings</CardDescription>
        </CardHeader>
        <CardContent>
          <BriefSettings />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailCheck className="h-5 w-5 text-purple-600" />
            Follow-up Emails
          </CardTitle>
          <CardDescription>AI-generated follow-up emails after your meetings</CardDescription>
        </CardHeader>
        <CardContent>
          <FollowupSettings />
        </CardContent>
      </Card>
    </div>
  );
}

function CalendarConnections() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [googleConfigured, setGoogleConfigured] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    try {
      const { data } = await api.get('/api/calendars');
      setConnections(data.connections);
      setGoogleConfigured(data.googleConfigured);
    } catch {
      console.error('Failed to fetch connections');
    } finally {
      setIsLoading(false);
    }
  }

  async function connectGoogle() {
    try {
      const { data } = await api.get('/api/calendars/google/connect');
      window.location.href = data.url;
    } catch {
      toast({ title: 'Failed to start connection', variant: 'destructive' });
    }
  }

  async function disconnect(id: string) {
    if (!confirm('Are you sure you want to disconnect this calendar?')) return;

    try {
      await api.delete(`/api/calendars/${id}`);
      setConnections(connections.filter((c) => c.id !== id));
      toast({ title: 'Calendar disconnected' });
    } catch {
      toast({ title: 'Failed to disconnect', variant: 'destructive' });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  const hasGoogle = connections.some((c) => c.provider === 'google');

  return (
    <div className="space-y-4">
      {connections.length > 0 ? (
        <div className="space-y-2">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                  <span className="text-red-600 text-xs font-bold">G</span>
                </div>
                <div>
                  <p className="font-medium">{conn.calendarName}</p>
                  <p className="text-sm text-gray-500 capitalize">{conn.provider}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600"
                onClick={() => disconnect(conn.id)}
              >
                Disconnect
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">No calendars connected</p>
      )}

      {!hasGoogle && googleConfigured && (
        <Button variant="outline" onClick={connectGoogle}>
          Connect Google Calendar
        </Button>
      )}

      {!googleConfigured && (
        <p className="text-sm text-gray-500">
          Google Calendar integration is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the backend.
        </p>
      )}
    </div>
  );
}

function BriefSettings() {
  const { user, fetchUser } = useAuthStore();
  const { toast } = useToast();
  const [briefsEnabled, setBriefsEnabled] = useState(user?.briefsEnabled ?? true);
  const [briefEmailsEnabled, setBriefEmailsEnabled] = useState(user?.briefEmailsEnabled ?? true);
  const [briefGenerationHours, setBriefGenerationHours] = useState(user?.briefGenerationHours ?? 24);
  const [isSaving, setIsSaving] = useState(false);

  async function handleToggleBriefs(enabled: boolean) {
    setBriefsEnabled(enabled);
    await saveBriefSetting({ briefsEnabled: enabled });
  }

  async function handleToggleEmails(enabled: boolean) {
    setBriefEmailsEnabled(enabled);
    await saveBriefSetting({ briefEmailsEnabled: enabled });
  }

  async function handleHoursChange(hours: number) {
    setBriefGenerationHours(hours);
    await saveBriefSetting({ briefGenerationHours: hours });
  }

  async function saveBriefSetting(update: Record<string, boolean | number>) {
    setIsSaving(true);
    try {
      await api.patch('/api/auth/me', update);
      await fetchUser();
      toast({ title: 'Brief settings updated' });
    } catch {
      toast({ title: 'Failed to update settings', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Enable/disable briefs */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Enable meeting briefs</p>
          <p className="text-sm text-gray-500">Automatically generate preparation notes before meetings</p>
        </div>
        <Switch
          checked={briefsEnabled}
          onCheckedChange={handleToggleBriefs}
          disabled={isSaving}
        />
      </div>

      {/* Email toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Email briefs to me</p>
          <p className="text-sm text-gray-500">Receive meeting briefs via email when they&apos;re ready</p>
        </div>
        <Switch
          checked={briefEmailsEnabled && briefsEnabled}
          onCheckedChange={handleToggleEmails}
          disabled={isSaving || !briefsEnabled}
        />
      </div>

      {/* Generation timing */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Generate briefs</p>
          <p className="text-sm text-gray-500">How far in advance to generate briefs</p>
        </div>
        <select
          value={briefGenerationHours}
          disabled={isSaving || !briefsEnabled}
          onChange={(e) => handleHoursChange(Number(e.target.value))}
          className={`h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ${
            !briefsEnabled ? 'opacity-50' : ''
          }`}
        >
          <option value={12}>12 hours before</option>
          <option value={24}>24 hours before</option>
          <option value={48}>48 hours before</option>
        </select>
      </div>
    </div>
  );
}

function FollowupSettings() {
  const { user, fetchUser } = useAuthStore();
  const { toast } = useToast();
  const [followupsEnabled, setFollowupsEnabled] = useState(user?.followupsEnabled ?? true);
  const [followupTone, setFollowupTone] = useState(user?.followupTone ?? 'friendly');
  const [isSaving, setIsSaving] = useState(false);

  async function handleToggleFollowups(enabled: boolean) {
    setFollowupsEnabled(enabled);
    await saveFollowupSetting({ followupsEnabled: enabled });
  }

  async function handleToneChange(tone: string) {
    setFollowupTone(tone as 'formal' | 'friendly' | 'casual');
    await saveFollowupSetting({ followupTone: tone });
  }

  async function saveFollowupSetting(update: Record<string, boolean | string>) {
    setIsSaving(true);
    try {
      await api.patch('/api/auth/me', update);
      await fetchUser();
      toast({ title: 'Follow-up settings updated' });
    } catch {
      toast({ title: 'Failed to update settings', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Enable/disable followups */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Auto-generate follow-ups</p>
          <p className="text-sm text-gray-500">Automatically create follow-up email drafts after meetings</p>
        </div>
        <Switch
          checked={followupsEnabled}
          onCheckedChange={handleToggleFollowups}
          disabled={isSaving}
        />
      </div>

      {/* Tone selector */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Follow-up tone</p>
          <p className="text-sm text-gray-500">Set the writing style for generated follow-ups</p>
        </div>
        <select
          value={followupTone}
          disabled={isSaving || !followupsEnabled}
          onChange={(e) => handleToneChange(e.target.value)}
          className={`h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ${
            !followupsEnabled ? 'opacity-50' : ''
          }`}
        >
          <option value="formal">Formal</option>
          <option value="friendly">Friendly</option>
          <option value="casual">Casual</option>
        </select>
      </div>
    </div>
  );
}
