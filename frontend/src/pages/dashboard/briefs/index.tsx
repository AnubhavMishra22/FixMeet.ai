import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isPast } from 'date-fns';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { FileText, Calendar, Clock, User, Loader2, RefreshCw } from 'lucide-react';
import { getBriefs, regenerateBrief } from '../../../lib/api';
import { useToast } from '../../../stores/toast-store';
import type { MeetingBriefWithBooking } from '../../../types';

type Filter = 'upcoming' | 'past';

export default function BriefsPage() {
  const { toast } = useToast();
  const [briefs, setBriefs] = useState<MeetingBriefWithBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('upcoming');

  useEffect(() => {
    fetchBriefs();
  }, []);

  async function fetchBriefs() {
    setIsLoading(true);
    try {
      const data = await getBriefs();
      setBriefs(data);
    } catch {
      console.error('Failed to fetch briefs');
    } finally {
      setIsLoading(false);
    }
  }

  const filtered = briefs.filter((brief) => {
    const meetingInPast = isPast(new Date(brief.booking.startTime));
    return filter === 'upcoming' ? !meetingInPast : meetingInPast;
  });

  async function handleRetry(bookingId: string) {
    setRetryingId(bookingId);
    try {
      await regenerateBrief(bookingId);
      toast({ title: 'Brief regenerated!' });
      await fetchBriefs();
    } catch {
      toast({ title: 'Failed to regenerate brief', variant: 'destructive' });
    } finally {
      setRetryingId(null);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Ready</Badge>;
      case 'generating':
        return <Badge className="bg-blue-100 text-blue-800">Generating</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meeting Briefs</h1>
        <p className="text-gray-600">AI-generated preparation notes for your meetings</p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === 'upcoming' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('upcoming')}
        >
          Upcoming
        </Button>
        <Button
          variant={filter === 'past' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('past')}
        >
          Past
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex gap-4 animate-pulse">
                  <div className="w-2 rounded-full min-h-[80px] bg-gray-200" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                    <div className="h-4 bg-gray-100 rounded w-2/5" />
                    <div className="h-4 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-medium mb-2">No briefs found</h3>
            <p className="text-gray-500">
              {filter === 'upcoming'
                ? 'No briefs for upcoming meetings yet. Briefs are generated automatically before confirmed meetings.'
                : 'No briefs for past meetings.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((brief) => (
            <Card key={brief.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="w-2 rounded-full min-h-[80px] bg-purple-500" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{brief.booking.eventTypeTitle}</h3>
                        {getStatusBadge(brief.status)}
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{brief.booking.inviteeName} ({brief.booking.inviteeEmail})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(brief.booking.startTime), 'EEEE, MMMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {format(new Date(brief.booking.startTime), 'h:mm a')} -{' '}
                            {format(new Date(brief.booking.endTime), 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {brief.status === 'completed' ? (
                      <Link to={`/dashboard/briefs/${brief.bookingId}`}>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-1" />
                          View Brief
                        </Button>
                      </Link>
                    ) : brief.status === 'generating' ? (
                      <Button variant="outline" size="sm" disabled>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Generating...
                      </Button>
                    ) : brief.status === 'failed' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleRetry(brief.bookingId)}
                        disabled={retryingId === brief.bookingId}
                      >
                        {retryingId === brief.bookingId ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Retry
                          </>
                        )}
                      </Button>
                    ) : null}
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
