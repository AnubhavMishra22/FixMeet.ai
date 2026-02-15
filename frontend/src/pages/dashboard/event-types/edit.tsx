import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  durationMinutes: z.number().int().min(5).max(480),
  locationType: z.enum(['google_meet', 'zoom', 'teams', 'phone', 'in_person', 'custom']),
  locationValue: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  bufferBefore: z.number().int().min(0).max(120),
  bufferAfter: z.number().int().min(0).max(120),
  minNoticeMinutes: z.number().int().min(0).max(43200),
  isActive: z.boolean(),
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

export default function EditEventTypePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EventTypeForm>({
    resolver: zodResolver(eventTypeSchema),
  });

  const selectedColor = watch('color');
  const locationType = watch('locationType');

  useEffect(() => {
    async function fetchEventType() {
      try {
        const { data } = await api.get(`/api/event-types/${id}`);
        const et = data.data.eventType;
        reset({
          title: et.title,
          slug: et.slug,
          description: et.description || '',
          durationMinutes: et.durationMinutes,
          locationType: et.locationType,
          locationValue: et.locationValue || '',
          color: et.color,
          bufferBefore: et.bufferBefore,
          bufferAfter: et.bufferAfter,
          minNoticeMinutes: et.minNoticeMinutes,
          isActive: et.isActive,
        });
      } catch {
        toast({ title: 'Failed to load event type', variant: 'destructive' });
        navigate('/dashboard/event-types');
      } finally {
        setIsLoading(false);
      }
    }
    fetchEventType();
  }, [id, reset, navigate, toast]);

  const onSubmit = async (data: EventTypeForm) => {
    setIsSubmitting(true);
    try {
      await api.patch(`/api/event-types/${id}`, data);
      toast({ title: 'Event type updated!' });
      navigate('/dashboard/event-types');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast({
        title: err.response?.data?.error?.message || 'Failed to update',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Event Type</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input id="title" {...register('title')} />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="slug">URL Slug *</Label>
              <Input id="slug" {...register('slug')} />
              {errors.slug && (
                <p className="text-sm text-red-500 mt-1">{errors.slug.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} />
            </div>

            <div>
              <Label htmlFor="durationMinutes">Duration (minutes) *</Label>
              <Input id="durationMinutes" type="number" {...register('durationMinutes', { valueAsNumber: true })} />
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

            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" {...register('isActive')} className="h-4 w-4" />
              <Label htmlFor="isActive">Active (accepting bookings)</Label>
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
                  <option key={lt.value} value={lt.value}>{lt.label}</option>
                ))}
              </select>
            </div>

            {(locationType === 'phone' || locationType === 'in_person' || locationType === 'custom') && (
              <div>
                <Label htmlFor="locationValue">Location Details</Label>
                <Input id="locationValue" {...register('locationValue')} />
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
                <Label htmlFor="bufferBefore">Buffer Before (min)</Label>
                <Input id="bufferBefore" type="number" {...register('bufferBefore', { valueAsNumber: true })} />
              </div>
              <div>
                <Label htmlFor="bufferAfter">Buffer After (min)</Label>
                <Input id="bufferAfter" type="number" {...register('bufferAfter', { valueAsNumber: true })} />
              </div>
            </div>
            <div>
              <Label htmlFor="minNoticeMinutes">Minimum Notice (min)</Label>
              <Input id="minNoticeMinutes" type="number" {...register('minNoticeMinutes', { valueAsNumber: true })} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/dashboard/event-types')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
