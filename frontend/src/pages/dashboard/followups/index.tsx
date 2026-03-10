import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { MailCheck, Calendar, Clock, User, Send, SkipForward, Loader2 } from 'lucide-react';
import { getFollowups, sendFollowup as sendFollowupApi } from '../../../lib/api';
import { useToast } from '../../../stores/toast-store';
import type { MeetingFollowupWithBooking, FollowupStatus } from '../../../types';

type Filter = 'all' | 'draft' | 'sent' | 'skipped';

export default function FollowupsPage() {
  const { toast } = useToast();
  const [followups, setFollowups] = useState<MeetingFollowupWithBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkSendProgress, setBulkSendProgress] = useState({ current: 0, total: 0 });

  const fetchFollowups = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getFollowups();
      setFollowups(data);
    } catch {
      toast({ title: 'Failed to load follow-ups', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast, setIsLoading, setFollowups]);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const filtered = filter === 'all'
    ? followups
    : followups.filter((f) => f.status === filter);

  function getStatusBadge(status: FollowupStatus) {
    switch (status) {
      case 'draft':
        return <Badge className="bg-blue-100 text-blue-800">Draft</Badge>;
      case 'sent':
        return <Badge className="bg-green-100 text-green-800">Sent</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getActionButton(followup: MeetingFollowupWithBooking) {
    switch (followup.status) {
      case 'draft':
        return (
          <Link to={`/dashboard/followups/${followup.id}`}>
            <Button variant="outline" size="sm">
              <Send className="h-4 w-4 mr-1" />
              Review & Send
            </Button>
          </Link>
        );
      case 'sent':
        return (
          <Link to={`/dashboard/followups/${followup.id}`}>
            <Button variant="ghost" size="sm">
              View
            </Button>
          </Link>
        );
      case 'skipped':
        return (
          <Link to={`/dashboard/followups/${followup.id}`}>
            <Button variant="ghost" size="sm">
              <SkipForward className="h-4 w-4 mr-1" />
              View
            </Button>
          </Link>
        );
      default:
        return null;
    }
  }

  const draftCount = followups.filter((f) => f.status === 'draft').length;
  const sendableDrafts = followups.filter(
    (f) => f.status === 'draft' && f.subject && f.body,
  );

  const handleBulkSend = useCallback(async () => {
    if (sendableDrafts.length === 0) return;
    setIsBulkSending(true);
    setBulkSendProgress({ current: 0, total: sendableDrafts.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < sendableDrafts.length; i++) {
      setBulkSendProgress({ current: i + 1, total: sendableDrafts.length });
      try {
        await sendFollowupApi(sendableDrafts[i].id);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setIsBulkSending(false);
    setBulkSendProgress({ current: 0, total: 0 });

    if (failCount === 0) {
      toast({ title: `${successCount} follow-up${successCount > 1 ? 's' : ''} sent!` });
    } else {
      toast({
        title: `Sent ${successCount}, failed ${failCount}`,
        variant: 'destructive',
      });
    }

    fetchFollowups();
  }, [sendableDrafts, toast, fetchFollowups]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Follow-ups</h1>
          <p className="text-gray-600">
            AI-generated follow-up emails after your meetings
            {draftCount > 0 && (
              <span className="ml-2 text-primary font-medium">
                ({draftCount} draft{draftCount > 1 ? 's' : ''} to review)
              </span>
            )}
          </p>
        </div>
        {sendableDrafts.length > 1 && (
          <Button
            onClick={handleBulkSend}
            disabled={isBulkSending}
            size="sm"
          >
            {isBulkSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Sending {bulkSendProgress.current}/{bulkSendProgress.total}...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                Send All Drafts ({sendableDrafts.length})
              </>
            )}
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {(['all', 'draft', 'sent', 'skipped'] as Filter[]).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
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
            <MailCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            {filter === 'all' && (
              <>
                <h3 className="font-medium mb-2">No follow-ups yet</h3>
                <p className="text-gray-500">
                  Follow-ups are generated automatically after your meetings end.
                  You can also generate them manually from a booking&apos;s detail page.
                </p>
              </>
            )}
            {filter === 'draft' && (
              <>
                <h3 className="font-medium mb-2">No drafts pending</h3>
                <p className="text-gray-500">
                  All caught up! You have no follow-up drafts waiting to be reviewed.
                </p>
              </>
            )}
            {filter === 'sent' && (
              <>
                <h3 className="font-medium mb-2">No sent follow-ups</h3>
                <p className="text-gray-500">
                  Follow-ups you send will appear here. Review your drafts and hit send!
                </p>
              </>
            )}
            {filter === 'skipped' && (
              <>
                <h3 className="font-medium mb-2">No skipped follow-ups</h3>
                <p className="text-gray-500">
                  Follow-ups you skip will appear here for reference.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((followup) => (
            <Card key={followup.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div
                      className={`w-2 rounded-full min-h-[80px] ${
                        followup.status === 'draft'
                          ? 'bg-violet-500'
                          : followup.status === 'sent'
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{followup.booking.eventTypeTitle}</h3>
                        {getStatusBadge(followup.status)}
                      </div>

                      {followup.subject && (
                        <p className="text-sm text-gray-700 mb-1 italic">
                          &ldquo;{followup.subject}&rdquo;
                        </p>
                      )}

                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>
                            {followup.booking.inviteeName} ({followup.booking.inviteeEmail})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(followup.booking.startTime), 'EEEE, MMMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {format(new Date(followup.booking.startTime), 'h:mm a')} –{' '}
                            {format(new Date(followup.booking.endTime), 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getActionButton(followup)}
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
