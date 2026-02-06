import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Calendar, Clock, Users, Plus, Copy } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useToast } from '../../stores/toast-store';
import api from '../../lib/api';
import type { EventType, BookingWithDetails } from '../../types';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [eventTypesRes, bookingsRes] = await Promise.all([
          api.get('/api/event-types'),
          api.get('/api/bookings?upcoming=true'),
        ]);
        setEventTypes(eventTypesRes.data.data.eventTypes);
        setUpcomingBookings(bookingsRes.data.data.bookings.slice(0, 5));
      } catch (e) {
        console.error('Failed to fetch dashboard data:', e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const bookingLink = `${import.meta.env.VITE_APP_URL}/${user?.username}`;

  const copyLink = () => {
    navigator.clipboard.writeText(bookingLink);
    toast({ title: 'Link copied to clipboard!' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]}!</h1>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-gray-600">Your booking link:</p>
          <code className="bg-gray-100 px-2 py-1 rounded text-sm">{bookingLink}</code>
          <Button variant="ghost" size="sm" onClick={copyLink}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Event Types
            </CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventTypes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Upcoming Bookings
            </CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingBookings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              This Week
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingBookings.filter((b) => {
                const bookingDate = new Date(b.startTime);
                const weekFromNow = new Date();
                weekFromNow.setDate(weekFromNow.getDate() + 7);
                return bookingDate <= weekFromNow;
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Types */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Event Types</CardTitle>
            <Link to="/dashboard/event-types/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {eventTypes.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No event types yet.{' '}
                <Link to="/dashboard/event-types/new" className="text-primary hover:underline">
                  Create your first one
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {eventTypes.slice(0, 3).map((et) => (
                  <Link
                    key={et.id}
                    to={`/dashboard/event-types/${et.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: et.color }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{et.title}</p>
                      <p className="text-sm text-gray-500">{et.durationMinutes} min</p>
                    </div>
                  </Link>
                ))}
                {eventTypes.length > 3 && (
                  <Link to="/dashboard/event-types" className="text-sm text-primary hover:underline block">
                    View all →
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Bookings</CardTitle>
            <Link to="/dashboard/bookings">
              <Button size="sm" variant="outline">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming bookings</p>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    to={`/dashboard/bookings/${booking.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{booking.inviteeName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(booking.startTime).toLocaleDateString()} at{' '}
                        {new Date(booking.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
