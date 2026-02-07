import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Calendar, Clock, User, Mail, Globe, Video,
  MapPin, Phone, ArrowLeft, X
} from 'lucide-react';
import api from '../../../lib/api';
import { useToast } from '../../../stores/toast-store';
import { BookingWithDetails } from '../../../types';

export default function BookingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  async function fetchBooking() {
    try {
      const { data } = await api.get(`/api/bookings/${id}`);
      setBooking(data.data.booking);
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
        </CardHeader>
        <CardContent className="space-y-6">
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
