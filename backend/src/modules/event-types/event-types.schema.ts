import { z } from 'zod';

const timeRangeSchema = z
  .object({
    start: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
    end: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  })
  .refine((data) => data.start < data.end, {
    message: 'End time must be after start time',
  });

const weeklyScheduleSchema = z.object({
  monday: z.array(timeRangeSchema),
  tuesday: z.array(timeRangeSchema),
  wednesday: z.array(timeRangeSchema),
  thursday: z.array(timeRangeSchema),
  friday: z.array(timeRangeSchema),
  saturday: z.array(timeRangeSchema),
  sunday: z.array(timeRangeSchema),
});

const customQuestionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['text', 'textarea', 'select', 'checkbox']),
  label: z.string().min(1).max(200),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export const createEventTypeSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug can only contain lowercase letters, numbers, and hyphens'
    )
    .optional(),
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  durationMinutes: z.number().int().min(5).max(480).default(30),
  locationType: z
    .enum(['google_meet', 'zoom', 'teams', 'phone', 'in_person', 'custom'])
    .default('google_meet'),
  locationValue: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#3B82F6'),
  schedule: weeklyScheduleSchema.optional(),
  bufferBefore: z.number().int().min(0).max(120).default(0),
  bufferAfter: z.number().int().min(0).max(120).default(0),
  minNoticeMinutes: z.number().int().min(0).max(43200).default(60),
  slotInterval: z.number().int().min(5).max(60).default(30),
  maxBookingsPerDay: z.number().int().min(1).max(100).optional(),
  rangeType: z.enum(['rolling', 'range', 'indefinite']).default('rolling'),
  rangeDays: z.number().int().min(1).max(365).default(60),
  rangeStart: z.string().date().optional(),
  rangeEnd: z.string().date().optional(),
  questions: z.array(customQuestionSchema).max(10).default([]),
  isActive: z.boolean().default(true),
});

export const updateEventTypeSchema = createEventTypeSchema.partial();

export const getSlotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  timezone: z.string().min(1),
});

export type CreateEventTypeInput = z.infer<typeof createEventTypeSchema>;
export type UpdateEventTypeInput = z.infer<typeof updateEventTypeSchema>;
export type GetSlotsQuery = z.infer<typeof getSlotsQuerySchema>;
