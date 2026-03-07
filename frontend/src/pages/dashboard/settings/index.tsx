import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { FileText, MailCheck, Key, Copy, Plus, Trash2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Switch } from '../../../components/ui/switch';
import { useAuthStore } from '../../../stores/auth-store';
import { useToast } from '../../../stores/toast-store';
import api, { getMcpApiKeys, createMcpApiKey, revokeMcpApiKey } from '../../../lib/api';
import type { CalendarConnection, McpApiKey } from '../../../types';

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-purple-600" />
            MCP API Keys
          </CardTitle>
          <CardDescription>
            Manage API keys for MCP clients (Claude Desktop, Cursor, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <McpApiKeys />
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

function McpApiKeys() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<McpApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      const data = await getMcpApiKeys();
      setKeys(data);
    } catch (err) {
      console.error('Failed to fetch API keys', err);
      toast({ title: 'Failed to fetch API keys', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    if (!newKeyName.trim()) return;
    setIsCreating(true);
    try {
      const result = await createMcpApiKey(newKeyName.trim());
      setNewlyCreatedKey(result.key);
      setNewKeyName('');
      await fetchKeys();
      toast({ title: 'API key created' });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast({
        title: err.response?.data?.error?.message || 'Failed to create API key',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;
    try {
      await revokeMcpApiKey(id);
      await fetchKeys();
      toast({ title: 'API key revoked' });
    } catch {
      toast({ title: 'Failed to revoke API key', variant: 'destructive' });
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  const activeKeys = keys.filter((k) => k.isActive);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowSetup(!showSetup)}
        className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium"
      >
        {showSetup ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        How to connect Claude Desktop, Cursor, or other AI tools
      </button>

      {showSetup && (
        <div className="bg-gray-50 border rounded-lg p-4 text-sm space-y-3">
          <div>
            <p className="font-medium mb-1">1. Create an API key below</p>
            <p className="text-gray-600">Give it a name like &quot;Claude Desktop&quot; and copy the key.</p>
          </div>
          <div>
            <p className="font-medium mb-1">2. Add to your MCP client config</p>
            <p className="text-gray-600 mb-2">
              For Claude Desktop: Settings &rarr; Developer &rarr; Edit Config
            </p>
            <pre className="bg-gray-900 text-gray-100 rounded-md p-3 text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "fixmeet": {
      "command": "npx",
      "args": ["fixmeet-mcp"],
      "env": {
        "FIXMEET_API_KEY": "fxm_your-key-here",
        "FIXMEET_API_URL": "${import.meta.env.VITE_API_URL || 'http://localhost:3001'}"
      }
    }
  }
}`}
            </pre>
          </div>
          <div>
            <p className="font-medium mb-1">3. Restart your AI client</p>
            <p className="text-gray-600">
              Claude Desktop (or Cursor) can now check your availability, book meetings, and more.
            </p>
          </div>
          <a
            href="https://github.com/AnubhavMishra22/FixMeet.ai/blob/main/backend/src/mcp/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800"
          >
            Full documentation <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {newlyCreatedKey && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800">
                API key created! Copy it now — you won&apos;t see it again.
              </p>
              <code className="block mt-2 text-xs bg-green-100 rounded px-2 py-1.5 break-all font-mono text-green-900">
                {newlyCreatedKey}
              </code>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(newlyCreatedKey)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNewlyCreatedKey(null)}
                className="text-green-700"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeKeys.length > 0 ? (
        <div className="space-y-2">
          {activeKeys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <p className="font-medium">{key.name}</p>
                <p className="text-xs text-gray-500">
                  Created {new Date(key.createdAt).toLocaleDateString()}
                  {key.lastUsedAt && (
                    <> &middot; Last used {new Date(key.lastUsedAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600"
                onClick={() => handleRevoke(key.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Revoke
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">No API keys created yet</p>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Key name (e.g. Claude Desktop)"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="flex-1"
        />
        <Button
          variant="outline"
          onClick={handleCreate}
          disabled={isCreating || !newKeyName.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          {isCreating ? 'Creating...' : 'Create Key'}
        </Button>
      </div>
    </div>
  );
}
