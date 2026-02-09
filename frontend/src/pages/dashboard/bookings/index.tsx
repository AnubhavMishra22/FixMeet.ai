import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Calendar, Clock, User, Video } from 'lucide-react';
import api from '../../../lib/api';
import type { BookingWithDetails } from '../../../types';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  async function fetchBookings() {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter === 'upcoming') {
        params.upcoming = 'true';
        params.status = 'confirmed';
      } else if (filter === 'past') {
        params.upcoming = 'false';
        params.status = 'confirmed';
      } else {
        params.status = 'cancelled';
      }

      const { data } = await api.get('/api/bookings', { params });
      setBookings(data.data.bookings);
    } catch {
      console.error('Failed to fetch bookings');
    } finally {
      setIsLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'no_show':
        return <Badge className="bg-yellow-100 text-yellow-800">No Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-gray-600">View and manage your scheduled meetings</p>
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
        <Button
          variant={filter === 'cancelled' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('cancelled')}
        >
          Cancelled
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-medium mb-2">No bookings found</h3>
            <p className="text-gray-500">
              {filter === 'upcoming'
                ? "You don't have any upcoming bookings"
                : filter === 'past'
                ? "You don't have any past bookings"
                : "You don't have any cancelled bookings"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div
                      className="w-2 rounded-full min-h-[80px]"
                      style={{ backgroundColor: booking.eventType?.color || '#3B82F6' }}
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{booking.eventType?.title}</h3>
                        {getStatusBadge(booking.status)}
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{booking.inviteeName} ({booking.inviteeEmail})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(booking.startTime), 'EEEE, MMMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {format(new Date(booking.startTime), 'h:mm a')} -{' '}
                            {format(new Date(booking.endTime), 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {booking.meetingUrl && booking.status === 'confirmed' && (
                      <a href={booking.meetingUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Video className="h-4 w-4 mr-1" />
                          Join
                        </Button>
                      </a>
                    )}
                    <Link to={`/dashboard/bookings/${booking.id}`}>
                      <Button variant="outline" size="sm">Details</Button>
                    </Link>
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
