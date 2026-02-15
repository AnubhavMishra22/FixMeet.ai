import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import api from '../../../lib/api';
import { useToast } from '../../../stores/toast-store';

const eventTypeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  description: z.string().max(1000).optional(),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  locationType: z.enum(['google_meet', 'zoom', 'teams', 'phone', 'in_person', 'custom']),
  locationValue: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  bufferBefore: z.coerce.number().int().min(0).max(120),
  bufferAfter: z.coerce.number().int().min(0).max(120),
  minNoticeMinutes: z.coerce.number().int().min(0).max(43200),
});

type EventTypeForm = z.infer<typeof eventTypeSchema>;

const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

const locationTypes = [
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'in_person', label: 'In Person' },
  { value: 'custom', label: 'Custom Location' },
];

export default function NewEventTypePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventTypeForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(eventTypeSchema) as any,
    defaultValues: {
      durationMinutes: 30,
      locationType: 'google_meet',
      color: '#3B82F6',
      bufferBefore: 0,
      bufferAfter: 0,
      minNoticeMinutes: 60,
    },
  });

  const selectedColor = watch('color');
  const locationType = watch('locationType');

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);
    setValue('slug', slug);
  };

  const onSubmit = async (data: EventTypeForm) => {
    setIsSubmitting(true);
    try {
      await api.post('/api/event-types', data);
      toast({ title: 'Event type created!' });
      navigate('/dashboard/event-types');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast({
        title: err.response?.data?.error?.message || 'Failed to create event type',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create Event Type</h1>
        <p className="text-gray-600">Set up a new booking page</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="30 Minute Meeting"
                {...register('title')}
                onChange={(e) => {
                  register('title').onChange(e);
                  handleTitleChange(e);
                }}
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="slug">URL Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">/username/</span>
                <Input id="slug" placeholder="30-minute-meeting" {...register('slug')} />
              </div>
              {errors.slug && (
                <p className="text-sm text-red-500 mt-1">{errors.slug.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="A quick chat to discuss..."
                {...register('description')}
              />
            </div>

            <div>
              <Label htmlFor="durationMinutes">Duration (minutes) *</Label>
              <Input
                id="durationMinutes"
                type="number"
                min={5}
                max={480}
                {...register('durationMinutes')}
              />
              {errors.durationMinutes && (
                <p className="text-sm text-red-500 mt-1">{errors.durationMinutes.message}</p>
              )}
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-all ${
                      selectedColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setValue('color', color)}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="locationType">Meeting Type *</Label>
              <select
                id="locationType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('locationType')}
              >
                {locationTypes.map((lt) => (
                  <option key={lt.value} value={lt.value}>
                    {lt.label}
                  </option>
                ))}
              </select>
            </div>

            {(locationType === 'phone' ||
              locationType === 'in_person' ||
              locationType === 'custom') && (
              <div>
                <Label htmlFor="locationValue">
                  {locationType === 'phone'
                    ? 'Phone Number'
                    : locationType === 'in_person'
                    ? 'Address'
                    : 'Custom Location'}
                </Label>
                <Input
                  id="locationValue"
                  placeholder={
                    locationType === 'phone'
                      ? '+1 (555) 123-4567'
                      : locationType === 'in_person'
                      ? '123 Main St, City'
                      : 'Enter location details'
                  }
                  {...register('locationValue')}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bufferBefore">Buffer Before (minutes)</Label>
                <Input
                  id="bufferBefore"
                  type="number"
                  min={0}
                  max={120}
                  {...register('bufferBefore')}
                />
                <p className="text-xs text-gray-500 mt-1">Time blocked before each meeting</p>
              </div>
              <div>
                <Label htmlFor="bufferAfter">Buffer After (minutes)</Label>
                <Input
                  id="bufferAfter"
                  type="number"
                  min={0}
                  max={120}
                  {...register('bufferAfter')}
                />
                <p className="text-xs text-gray-500 mt-1">Time blocked after each meeting</p>
              </div>
            </div>

            <div>
              <Label htmlFor="minNoticeMinutes">Minimum Notice (minutes)</Label>
              <Input
                id="minNoticeMinutes"
                type="number"
                min={0}
                {...register('minNoticeMinutes')}
              />
              <p className="text-xs text-gray-500 mt-1">How far in advance must bookings be made (60 = 1 hour)</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Event Type'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/dashboard/event-types')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
