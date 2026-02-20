import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building2,
  Lightbulb,
  History,
  Mail,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { getBrief, regenerateBrief } from '../../../lib/api';
import { useToast } from '../../../stores/toast-store';
import type { MeetingBriefWithBooking } from '../../../types';

export default function BriefDetailsPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [brief, setBrief] = useState<MeetingBriefWithBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [checkedPoints, setCheckedPoints] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchBrief();
  }, [bookingId]);

  async function fetchBrief() {
    try {
      const data = await getBrief(bookingId!);
      setBrief(data);
    } catch {
      toast({ title: 'Failed to load meeting brief', variant: 'destructive' });
      navigate('/dashboard/briefs');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegenerate() {
    setIsRegenerating(true);
    try {
      await regenerateBrief(bookingId!);
      setCheckedPoints(new Set());
      await fetchBrief();
      toast({ title: 'Brief regenerated successfully!' });
    } catch {
      toast({ title: 'Failed to regenerate brief', variant: 'destructive' });
    } finally {
      setIsRegenerating(false);
    }
  }

  function togglePoint(index: number) {
    setCheckedPoints((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!brief) {
    return null;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Button
        variant="ghost"
        className="mb-2"
        onClick={() => navigate('/dashboard/briefs')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to briefs
      </Button>

      {/* Meeting Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">
                {brief.booking.eventTypeTitle || 'Meeting Brief'}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-purple-100 text-purple-800">Meeting Brief</Badge>
                {brief.status === 'completed' && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Ready
                  </Badge>
                )}
                {brief.status === 'failed' && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Failed
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="text-purple-600 hover:bg-purple-50"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Regenerate
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Attendee</p>
                <p className="font-medium">{brief.booking.inviteeName}</p>
                <p className="text-xs text-gray-500">{brief.booking.inviteeEmail}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Date & Time</p>
                <p className="font-medium">
                  {format(new Date(brief.booking.startTime), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(brief.booking.startTime), 'h:mm a')} –{' '}
                  {format(new Date(brief.booking.endTime), 'h:mm a')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Failed state */}
      {brief.status === 'failed' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
            <h3 className="font-medium text-red-800 mb-1">Brief generation failed</h3>
            <p className="text-sm text-red-600 mb-4">
              We couldn&apos;t generate a brief for this meeting. This can happen if limited information is available about the attendee.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="text-red-600 hover:bg-red-100"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry Generation
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No info available message */}
      {brief.status === 'completed' && !brief.inviteeSummary && !brief.companySummary && brief.talkingPoints.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
            <h3 className="font-medium mb-1">Limited information available</h3>
            <p className="text-sm text-gray-500">
              We couldn&apos;t find much information about this attendee. Try regenerating the brief later.
            </p>
          </CardContent>
        </Card>
      )}

      {/* About the Person */}
      {brief.inviteeSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-purple-600" />
              About {brief.booking.inviteeName || 'the Attendee'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {brief.inviteeSummary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* About the Company */}
      {brief.companySummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-purple-600" />
              Company Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {brief.companySummary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Talking Points */}
      {brief.talkingPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-purple-600" />
              Talking Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {brief.talkingPoints.map((point, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 cursor-pointer group"
                  onClick={() => togglePoint(index)}
                >
                  <div
                    className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      checkedPoints.has(index)
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'border-gray-300 group-hover:border-purple-400'
                    }`}
                  >
                    {checkedPoints.has(index) && (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-gray-700 leading-relaxed transition-colors ${
                      checkedPoints.has(index) ? 'line-through text-gray-400' : ''
                    }`}
                  >
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Previous Meetings */}
      {brief.previousMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-purple-600" />
              Previous Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {brief.previousMeetings.map((meeting, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{meeting.title}</p>
                    <p className="text-xs text-gray-500">{meeting.date}</p>
                    {meeting.notes && (
                      <p className="text-sm text-gray-600 mt-1">{meeting.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brief metadata footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 px-1">
        <span>
          Generated{' '}
          {brief.generatedAt
            ? format(new Date(brief.generatedAt), "MMM d, yyyy 'at' h:mm a")
            : 'N/A'}
        </span>
        {brief.sentAt && (
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            Emailed {format(new Date(brief.sentAt), "MMM d 'at' h:mm a")}
          </span>
        )}
      </div>
    </div>
  );
}
