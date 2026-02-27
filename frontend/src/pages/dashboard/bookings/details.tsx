import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import {
  Calendar, User, Globe, Video,
  MapPin, Phone, ArrowLeft, X, FileText,
  Loader2, Sparkles, MailCheck,
} from 'lucide-react';
import api, { getBrief, generateBriefForBooking, generateFollowupForBooking } from '../../../lib/api';
import { useToast } from '../../../stores/toast-store';
import type { BookingWithDetails } from '../../../types';

export default function BookingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [hasBrief, setHasBrief] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Follow-up state
  const [followupInfo, setFollowupInfo] = useState<{ id: string; status: string } | null>(null);
  const [isGeneratingFollowup, setIsGeneratingFollowup] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState('');

  useEffect(() => {
    fetchBooking();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);

  async function fetchBooking() {
    try {
      const { data } = await api.get(`/api/bookings/${id}`);
      setBooking(data.data.booking);
      setHasBrief(data.data.hasBrief ?? false);
      setFollowupInfo(data.data.followup ?? null);
    } catch {
      toast({ title: 'Failed to load booking', variant: 'destructive' });
      navigate('/dashboard/bookings');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    setIsCancelling(true);
    try {
      await api.post(`/api/bookings/${id}/cancel`, {
        reason: 'Cancelled by host',
      });
      toast({ title: 'Booking cancelled' });
      fetchBooking();
    } catch {
      toast({ title: 'Failed to cancel booking', variant: 'destructive' });
    } finally {
      setIsCancelling(false);
    }
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const brief = await getBrief(id!);
        if (brief.status === 'completed') {
          setHasBrief(true);
          setIsGenerating(false);
          if (pollRef.current) clearInterval(pollRef.current);
          toast({ title: 'Meeting brief is ready!' });
        } else if (brief.status === 'failed') {
          setIsGenerating(false);
          if (pollRef.current) clearInterval(pollRef.current);
          toast({ title: 'Brief generation failed', variant: 'destructive' });
        }
      } catch {
        // Brief may not exist yet, keep polling
      }
    }, 3000);
  }

  async function handleGenerateBrief() {
    setIsGenerating(true);
    try {
      const brief = await generateBriefForBooking(id!);
      if (brief.status === 'completed') {
        setHasBrief(true);
        setIsGenerating(false);
        toast({ title: 'Meeting brief is ready!' });
      } else {
        // Generation kicked off in background — poll for completion
        startPolling();
      }
    } catch {
      toast({ title: 'Failed to generate brief', variant: 'destructive' });
      setIsGenerating(false);
    }
  }

  async function handleGenerateFollowup() {
    setIsGeneratingFollowup(true);
    setShowNotesModal(false);
    try {
      const followup = await generateFollowupForBooking(id!, meetingNotes || undefined);
      setFollowupInfo({ id: followup.id, status: followup.status });
      toast({ title: 'Follow-up generated!' });
      navigate(`/dashboard/followups/${followup.id}`);
    } catch {
      toast({ title: 'Failed to generate follow-up', variant: 'destructive' });
    } finally {
      setIsGeneratingFollowup(false);
    }
  }

  function getLocationIcon() {
    switch (booking?.locationType) {
      case 'google_meet':
      case 'zoom':
      case 'teams':
        return <Video className="h-5 w-5 text-primary" />;
      case 'phone':
        return <Phone className="h-5 w-5 text-primary" />;
      case 'in_person':
        return <MapPin className="h-5 w-5 text-primary" />;
      default:
        return <Globe className="h-5 w-5 text-primary" />;
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  const isPast = new Date(booking.startTime) < new Date();
  const canCancel = booking.status === 'confirmed' && !isPast;
  const canGenerateFollowup = isPast && booking.status === 'confirmed' && !followupInfo;
  const hasFollowupWithContent = followupInfo && followupInfo.status !== null;

  return (
    <div className="max-w-2xl">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate('/dashboard/bookings')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to bookings
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{booking.eventType?.title}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                {booking.status === 'confirmed' && (
                  <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
                )}
                {booking.status === 'cancelled' && (
                  <Badge variant="destructive">Cancelled</Badge>
                )}
                {isPast && booking.status === 'confirmed' && (
                  <Badge variant="secondary">Past</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {hasBrief ? (
                <Link to={`/dashboard/briefs/${booking.id}`}>
                  <Button variant="outline" size="sm" className="text-purple-600 hover:bg-purple-50">
                    <FileText className="h-4 w-4 mr-1" />
                    View Brief
                  </Button>
                </Link>
              ) : booking.status === 'confirmed' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-purple-600 hover:bg-purple-50"
                  onClick={handleGenerateBrief}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      Generate Brief
                    </>
                  )}
                </Button>
              ) : null}
              {hasFollowupWithContent ? (
                <Link to={`/dashboard/followups/${followupInfo.id}`}>
                  <Button variant="outline" size="sm" className="text-purple-600 hover:bg-purple-50">
                    <MailCheck className="h-4 w-4 mr-1" />
                    View Follow-up
                  </Button>
                </Link>
              ) : canGenerateFollowup ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-purple-600 hover:bg-purple-50"
                  onClick={() => setShowNotesModal(true)}
                  disabled={isGeneratingFollowup}
                >
                  {isGeneratingFollowup ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <MailCheck className="h-4 w-4 mr-1" />
                      Generate Follow-up
                    </>
                  )}
                </Button>
              ) : null}
              {canCancel && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={handleCancel}
                  disabled={isCancelling}
                >
                  <X className="h-4 w-4 mr-1" />
                  {isCancelling ? 'Cancelling...' : 'Cancel'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Meeting notes modal */}
          {showNotesModal && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
              <div>
                <Label htmlFor="meetingNotes" className="text-purple-800 font-medium">
                  What happened in this meeting? (optional)
                </Label>
                <p className="text-sm text-purple-600 mt-1">
                  Adding notes helps generate a more accurate follow-up email.
                </p>
              </div>
              <Textarea
                id="meetingNotes"
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                placeholder="e.g., Discussed project timeline, agreed on Q2 deliverables..."
                className="min-h-[100px] bg-white"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotesModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleGenerateFollowup}
                  disabled={isGeneratingFollowup}
                >
                  {isGeneratingFollowup ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {format(new Date(booking.startTime), 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-gray-600">
                {format(new Date(booking.startTime), 'h:mm a')} -{' '}
                {format(new Date(booking.endTime), 'h:mm a')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{booking.inviteeName}</p>
              <p className="text-gray-600">{booking.inviteeEmail}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              {getLocationIcon()}
            </div>
            <div>
              <p className="font-medium capitalize">
                {booking.locationType?.replace('_', ' ')}
              </p>
              {booking.meetingUrl && (
                <a
                  href={booking.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Join Meeting
                </a>
              )}
              {booking.locationValue && (
                <p className="text-gray-600">{booking.locationValue}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Invitee Timezone</p>
              <p className="text-gray-600">{booking.inviteeTimezone}</p>
            </div>
          </div>

          {booking.inviteeNotes && (
            <div className="border-t pt-6">
              <h4 className="font-medium mb-2">Notes from invitee</h4>
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                {booking.inviteeNotes}
              </p>
            </div>
          )}

          {booking.responses && Object.keys(booking.responses).length > 0 && (
            <div className="border-t pt-6">
              <h4 className="font-medium mb-2">Additional Information</h4>
              <div className="space-y-2">
                {Object.entries(booking.responses).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">{key}</p>
                    <p>{value as string}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {booking.status === 'cancelled' && (
            <div className="border-t pt-6">
              <h4 className="font-medium mb-2 text-red-600">Cancellation Details</h4>
              <div className="bg-red-50 p-4 rounded-lg text-red-800">
                <p>Cancelled by {booking.cancelledBy === 'host' ? 'you' : 'invitee'}</p>
                {booking.cancellationReason && (
                  <p className="mt-1">Reason: {booking.cancellationReason}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
