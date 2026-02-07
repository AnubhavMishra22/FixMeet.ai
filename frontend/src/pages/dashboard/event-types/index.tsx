import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Plus, Copy, ExternalLink, Pencil, Trash } from 'lucide-react';
import api from '../../../lib/api';
import { EventType } from '../../../types';
import { useAuthStore } from '../../../stores/auth-store';
import { useToast } from '../../../stores/toast-store';

export default function EventTypesPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEventTypes();
  }, []);

  async function fetchEventTypes() {
    try {
      const { data } = await api.get('/api/event-types');
      setEventTypes(data.data.eventTypes);
    } catch {
      toast({ title: 'Failed to load event types', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteEventType(id: string) {
    if (!confirm('Are you sure you want to delete this event type?')) return;

    try {
      await api.delete(`/api/event-types/${id}`);
      setEventTypes(eventTypes.filter((et) => et.id !== id));
      toast({ title: 'Event type deleted' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  }

  function copyLink(slug: string) {
    const link = `${import.meta.env.VITE_APP_URL}/${user?.username}/${slug}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copied to clipboard' });
  }

  async function toggleActive(id: string, currentState: boolean) {
    try {
      await api.patch(`/api/event-types/${id}`, { isActive: !currentState });
      setEventTypes(
        eventTypes.map((et) =>
          et.id === id ? { ...et, isActive: !currentState } : et
        )
      );
      toast({ title: `Event type ${!currentState ? 'activated' : 'deactivated'}` });
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Event Types</h1>
          <p className="text-gray-600">Create and manage your booking pages</p>
        </div>
        <Link to="/dashboard/event-types/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Event Type
          </Button>
        </Link>
      </div>

      {eventTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="font-medium mb-2">No event types yet</h3>
            <p className="text-gray-500 mb-4">Create your first event type to start accepting bookings</p>
            <Link to="/dashboard/event-types/new">
              <Button>Create Event Type</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {eventTypes.map((eventType) => (
            <Card key={eventType.id} className={!eventType.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-2 h-16 rounded-full"
                      style={{ backgroundColor: eventType.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{eventType.title}</h3>
                        {!eventType.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mt-1">
                        {eventType.durationMinutes} min &middot;{' '}
                        {eventType.locationType.replace('_', ' ')}
                      </p>
                      <p className="text-gray-500 text-sm mt-2 font-mono">
                        /{user?.username}/{eventType.slug}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink(eventType.slug)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>

                    <a
                      href={`/${user?.username}/${eventType.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>

                    <Link to={`/dashboard/event-types/${eventType.id}`}>
                      <Button variant="outline" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(eventType.id, eventType.isActive)}
                    >
                      {eventType.isActive ? 'Disable' : 'Enable'}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEventType(eventType.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
