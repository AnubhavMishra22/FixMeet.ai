import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Clock, Video, MapPin, Phone, Globe, XCircle } from 'lucide-react';
import api, { getApiErrorMessage } from '../../lib/api';
import { useToast } from '../../stores/toast-store';

interface BookingData {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  inviteeName: string;
  inviteeEmail: string;
  meetingUrl: string | null;
  locationType: string;
}

interface EventTypeData {
  title: string;
  slug: string;
  durationMinutes: number;
  color: string;
}

interface HostData {
  name: string;
  username: string;
  email: string;
  timezone: string;
}

const PAGE_BG = 'bg-white';

function getLocationIcon(locationType: string) {
  switch (locationType) {
    case 'google_meet':
    case 'zoom':
    case 'teams':
      return <Video className="h-4 w-4" />;
    case 'phone':
      return <Phone className="h-4 w-4" />;
    case 'in_person':
      return <MapPin className="h-4 w-4" />;
    default:
      return <Globe className="h-4 w-4" />;
  }
}

export default function BookingManagePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [eventType, setEventType] = useState<EventTypeData | null>(null);
  const [host, setHost] = useState<HostData | null>(null);

  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelled, setCancelled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!id || !token) {
      setError('Invalid link. The cancel/reschedule link from your confirmation email is required.');
      setIsLoading(false);
      return;
    }

    async function fetchBooking() {
      try {
        const { data } = await api.get(`/api/public/bookings/${id}`, {
          params: { token },
        });
        setBooking(data.data.booking);
        setEventType(data.data.eventType);
        setHost(data.data.host);
      } catch (e: unknown) {
        setError(getApiErrorMessage(e, 'Booking not found or link has expired.'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchBooking();
  }, [id, token]);

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !token) return;

    setIsCancelling(true);
    try {
      await api.post(`/api/public/bookings/${id}/cancel`, { reason: cancelReason || 'Cancelled by invitee' }, {
        params: { token },
      });
      setCancelled(true);
      setBooking((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
    } catch (e: unknown) {
      toast({
        title: 'Failed to cancel booking',
        description: getApiErrorMessage(e, 'Unable to cancel. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen ${PAGE_BG} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !booking || !eventType || !host) {
    return (
      <div className={`min-h-screen ${PAGE_BG} flex items-center justify-center`}>
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Not Found</h2>
            <p className="text-gray-600">{error || 'This booking link is invalid or has expired.'}</p>
            <p className="text-sm text-gray-500 mt-4">
              Please use the link from your confirmation email, or contact {host?.name || 'the host'} to reschedule or cancel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (booking.status === 'cancelled' || cancelled) {
    return (
      <div className={`min-h-screen ${PAGE_BG} flex items-center justify-center py-8 px-4`}>
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Booking Cancelled</h2>
            <p className="text-gray-600 mb-4">
              Your meeting <strong>{eventType.title}</strong> with {host.name} has been cancelled.
            </p>
            <p className="text-sm text-gray-500">
              A confirmation email has been sent. You can book a new time with {host.name} if needed.
            </p>
            <Button asChild className="mt-6">
              <a href={`/${host.username}/${eventType.slug}`}>Book a New Time</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rescheduleUrl = `/${host.username}/${eventType.slug}`;

  return (
    <div className={`min-h-screen ${PAGE_BG} py-8 px-4`}>
      <div className="max-w-lg mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-6">
              <div
                className="w-3 h-8 rounded"
                style={{ backgroundColor: eventType.color || '#3B82F6' }}
              />
              <h1 className="text-xl font-bold">{eventType.title}</h1>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>
                  {format(new Date(booking.startTime), 'EEEE, MMMM d, yyyy')} at{' '}
                  {format(new Date(booking.startTime), 'h:mm a')} –{' '}
                  {format(new Date(booking.endTime), 'h:mm a')}
                </span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                {getLocationIcon(booking.locationType)}
                <span className="capitalize">{booking.locationType.replace('_', ' ')}</span>
              </div>

              {booking.meetingUrl && (
                <div>
                  <a
                    href={booking.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    Join Meeting
                  </a>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500 mb-1">With</p>
                <p className="font-medium">{host.name}</p>
              </div>
            </div>

            {!showCancelForm ? (
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline" className="flex-1">
                  <a href={rescheduleUrl}>Reschedule</a>
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setShowCancelForm(true)}
                >
                  Cancel Meeting
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCancel} className="mt-8 space-y-4">
                <div>
                  <Label htmlFor="reason">Reason for cancellation (optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Let the host know why you're cancelling..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCancelForm(false)}
                    disabled={isCancelling}
                  >
                    Back
                  </Button>
                  <Button type="submit" variant="destructive" disabled={isCancelling}>
                    {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-gray-400 text-sm mt-6">
          Powered by <span className="font-medium">MeetIA</span>
        </p>
      </div>
    </div>
  );
}
