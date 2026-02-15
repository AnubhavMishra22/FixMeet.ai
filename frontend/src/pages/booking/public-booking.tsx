import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format, startOfDay } from 'date-fns';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Clock, Globe, Video, MapPin, Phone, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../lib/api';

interface EventTypeData {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  locationType: string;
  color: string;
  questions: Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
  }>;
}

interface HostData {
  name: string;
  username: string;
  timezone: string;
}

interface TimeSlot {
  start: string;
  end: string;
}

interface BookingResponse {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  meetingUrl: string | null;
}

type Step = 'calendar' | 'time' | 'form' | 'confirmed';

const PAGE_BG = 'bg-sky-50';

// Convert "HH:mm" (24h) to "h:mm AM/PM" (12h)
function formatTime12h(time: string): string {
  const [hourStr, minute] = time.split(':');
  let hour = parseInt(hourStr ?? '0', 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${minute} ${ampm}`;
}

export default function PublicBookingPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventType, setEventType] = useState<EventTypeData | null>(null);
  const [host, setHost] = useState<HostData | null>(null);

  const [step, setStep] = useState<Step>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [booking, setBooking] = useState<BookingResponse | null>(null);

  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    notes: '',
    responses: {} as Record<string, string>,
  });

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Get short timezone abbreviation (e.g., PST, IST, EST)
  const timezoneAbbr = new Date().toLocaleTimeString('en-US', {
    timeZoneName: 'short',
    timeZone: timezone,
  }).split(' ').pop() || timezone;

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await api.get(`/api/public/${username}/${slug}`);
        setEventType(data.data.eventType);
        setHost(data.data.host);
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: { message?: string } } } };
        setError(err.response?.data?.error?.message || 'Event type not found');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [username, slug]);

  async function handleDateSelect(date: Date) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setIsLoadingSlots(true);

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const { data } = await api.get(
        `/api/public/${username}/${slug}/slots`,
        { params: { date: dateStr, timezone } }
      );
      setSlots(data.data.slots);
      setStep('time');
    } catch {
      setSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }

  function handleSlotSelect(slot: string) {
    setSelectedSlot(slot);
    setStep('form');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) return;

    setIsSubmitting(true);

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const startTime = new Date(`${dateStr}T${selectedSlot}:00`);

      const { data } = await api.post(`/api/public/${username}/${slug}/book`, {
        inviteeName: formData.name,
        inviteeEmail: formData.email,
        inviteeTimezone: timezone,
        inviteeNotes: formData.notes || undefined,
        startTime: startTime.toISOString(),
        responses: formData.responses,
      });

      setBooking(data.data.booking);
      setStep('confirmed');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      alert(err.response?.data?.error?.message || 'Booking failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  function generateCalendarDays() {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }

  function isDateDisabled(date: Date) {
    const today = startOfDay(new Date());
    return date < today;
  }

  function getLocationIcon() {
    switch (eventType?.locationType) {
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

  if (isLoading) {
    return (
      <div className={`min-h-screen ${PAGE_BG} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !eventType || !host) {
    return (
      <div className={`min-h-screen ${PAGE_BG} flex items-center justify-center`}>
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-bold mb-2">Not Found</h2>
            <p className="text-gray-600">{error || 'This booking page does not exist'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${PAGE_BG} py-8 px-4`}>
      <div className="max-w-4xl mx-auto">
        <Card className="overflow-hidden">
          <div className="md:flex">
            {/* Left side - Event info */}
            <div className="md:w-1/3 p-6 bg-gray-50 border-b md:border-b-0 md:border-r">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">{host.name}</p>
                  <h1 className="text-xl font-bold mt-1">{eventType.title}</h1>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{eventType.durationMinutes} min</span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  {getLocationIcon()}
                  <span className="capitalize">{eventType.locationType.replace('_', ' ')}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">{timezone} ({timezoneAbbr})</span>
                </div>

                {eventType.description && (
                  <p className="text-sm text-gray-600 pt-4 border-t">{eventType.description}</p>
                )}
              </div>
            </div>

            {/* Right side - Booking flow */}
            <div className="md:w-2/3 p-6">
              {step === 'calendar' && (
                <div>
                  <h2 className="font-semibold mb-4">Select a Date</h2>

                  <div className="flex items-center justify-between mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium">{format(calendarMonth, 'MMMM yyyy')}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-xs font-medium text-gray-500 py-2">{day}</div>
                    ))}
                    {generateCalendarDays().map((date, i) => (
                      <div key={i} className="aspect-square">
                        {date && (
                          <button
                            type="button"
                            disabled={isDateDisabled(date)}
                            onClick={() => handleDateSelect(date)}
                            className={`w-full h-full rounded-full flex items-center justify-center text-sm transition-colors
                              ${isDateDisabled(date)
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'hover:bg-primary hover:text-white cursor-pointer'
                              }
                              ${selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                                ? 'bg-primary text-white'
                                : ''
                              }
                            `}
                          >
                            {date.getDate()}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 'time' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-semibold">
                        {selectedDate && format(selectedDate, 'EEEE, MMMM d')}
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">Times shown in {timezoneAbbr}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setStep('calendar')}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  </div>

                  {isLoadingSlots ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-gray-500 py-12 text-center">No available times on this date</p>
                  ) : (
                    <div className="max-h-96 overflow-y-auto pr-1 space-y-2">
                      {slots.map((slot) => (
                        <Button
                          key={slot.start}
                          variant={selectedSlot === slot.start ? 'default' : 'outline'}
                          className="w-full justify-center"
                          onClick={() => handleSlotSelect(slot.start)}
                        >
                          {formatTime12h(slot.start)} ({timezoneAbbr})
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 'form' && (
                <form onSubmit={handleSubmit}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold">Enter Details</h2>
                    <Button variant="ghost" size="sm" onClick={() => setStep('time')}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  </div>

                  <p className="text-sm text-gray-600 mb-6 p-3 bg-gray-50 rounded-lg">
                    {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')} at{' '}
                    <strong>{selectedSlot ? formatTime12h(selectedSlot) : ''} ({timezoneAbbr})</strong>
                  </p>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Additional notes (optional)</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Please share anything that will help prepare for our meeting"
                      />
                    </div>

                    {eventType.questions.map((q) => (
                      <div key={q.id}>
                        <Label htmlFor={q.id}>
                          {q.label} {q.required && '*'}
                        </Label>
                        <Input
                          id={q.id}
                          required={q.required}
                          value={formData.responses[q.id] || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              responses: { ...formData.responses, [q.id]: e.target.value },
                            })
                          }
                        />
                      </div>
                    ))}

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? 'Scheduling...' : 'Schedule Meeting'}
                    </Button>
                  </div>
                </form>
              )}

              {step === 'confirmed' && booking && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">You're Scheduled!</h2>
                  <p className="text-gray-600 mb-4">
                    A confirmation email has been sent to <strong>{formData.email}</strong>
                  </p>

                  <div className="bg-gray-50 rounded-lg p-6 text-left space-y-3">
                    <div>
                      <span className="text-gray-500 text-sm">What</span>
                      <p className="font-medium">{eventType.title}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm">When</span>
                      <p className="font-medium">
                        {new Date(booking.startTime).toLocaleDateString(undefined, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(booking.startTime).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm">Who</span>
                      <p className="font-medium">{host.name}</p>
                    </div>
                    {booking.meetingUrl && (
                      <div>
                        <span className="text-gray-500 text-sm">Where</span>
                        <p>
                          <a
                            href={booking.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-medium"
                          >
                            Join Meeting
                          </a>
                        </p>
                      </div>
                    )}
                  </div>

                  <div role="status" className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                    <p className="mb-1">You can safely close this window.</p>
                    <p>
                      Need to make changes? Check your confirmation email or contact{' '}
                      <strong>{host.name}</strong> to reschedule or cancel.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <p className="text-center text-gray-400 text-sm mt-6">
          Powered by <span className="font-medium">FixMeet</span>
        </p>
      </div>
    </div>
  );
}
