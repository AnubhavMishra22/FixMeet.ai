import { Request, Response } from 'express';
import * as followupsService from './followups.service.js';
import { AppError, UnauthorizedError } from '../../utils/errors.js';
import { sendFollowupEmail } from '../email/notification.service.js';
import { generateFollowup } from './followup-generator.service.js';
import { sql } from '../../config/database.js';

/** GET /api/followups - List all followups for the authenticated user */
export async function listFollowups(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedError();

  const followups = await followupsService.listFollowups(userId);

  res.json({ success: true, data: followups });
}

/** GET /api/followups/:id - Get a single followup */
export async function getFollowup(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedError();

  const { id } = req.params;
  if (!id) throw new AppError('Followup ID is required', 400, 'VALIDATION_ERROR');

  const followup = await followupsService.getFollowupById(id, userId);

  res.json({ success: true, data: followup });
}

/** PATCH /api/followups/:id - Update a draft followup */
export async function updateFollowup(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedError();

  const { id } = req.params;
  if (!id) throw new AppError('Followup ID is required', 400, 'VALIDATION_ERROR');

  const { subject, body, actionItems } = req.body;
  const followup = await followupsService.updateFollowup(id, userId, {
    subject,
    body,
    actionItems,
  });

  res.json({ success: true, data: followup });
}

/** POST /api/followups/:id/send - Send the followup email */
export async function sendFollowup(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedError();

  const { id } = req.params;
  if (!id) throw new AppError('Followup ID is required', 400, 'VALIDATION_ERROR');

  // Get the full followup with booking info for the email
  const fullFollowup = await followupsService.getFollowupById(id, userId);

  // Get host details for the email
  const userRows = await sql<{ name: string; timezone: string }[]>`
    SELECT name, timezone FROM users WHERE id = ${userId}
  `;
  const user = userRows[0];
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  // Send the actual email
  await sendFollowupEmail(fullFollowup, user.name, user.timezone);

  // Mark as sent in database
  const followup = await followupsService.markSent(id, userId);

  res.json({ success: true, data: followup });
}

/** POST /api/followups/:id/skip - Skip the followup */
export async function skipFollowup(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedError();

  const { id } = req.params;
  if (!id) throw new AppError('Followup ID is required', 400, 'VALIDATION_ERROR');

  const followup = await followupsService.skipFollowup(id, userId);

  res.json({ success: true, data: followup });
}

/** GET /api/followups/by-booking/:bookingId - Get followup by booking ID */
export async function getFollowupByBooking(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedError();

  const { bookingId } = req.params;
  if (!bookingId) throw new AppError('Booking ID is required', 400, 'VALIDATION_ERROR');

  const followup = await followupsService.getFollowupByBookingId(bookingId, userId);

  res.json({ success: true, data: followup });
}

/** POST /api/followups/generate/:bookingId - Generate a followup for a booking */
export async function generateFollowupForBooking(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedError();

  const { bookingId } = req.params;
  if (!bookingId) throw new AppError('Booking ID is required', 400, 'VALIDATION_ERROR');

  const { meetingNotes } = req.body as { meetingNotes?: string };

  // Validate booking exists and belongs to user
  interface BookingRow {
    id: string;
    invitee_name: string;
    invitee_email: string;
    invitee_notes: string | null;
    start_time: Date;
    end_time: Date;
    status: string;
    event_type_title: string;
  }

  const bookingRows = await sql<BookingRow[]>`
    SELECT b.id, b.invitee_name, b.invitee_email, b.invitee_notes,
           b.start_time, b.end_time, b.status, et.title AS event_type_title
    FROM bookings b
    JOIN event_types et ON b.event_type_id = et.id
    WHERE b.id = ${bookingId} AND b.host_id = ${userId}
  `;
  const booking = bookingRows[0];
  if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');

  if (new Date(booking.end_time) > new Date()) {
    throw new AppError('Can only generate follow-ups for past meetings', 400, 'VALIDATION_ERROR');
  }

  // Check if followup already exists with content
  const existing = await followupsService.getFollowupByBookingId(bookingId, userId);
  if (existing?.subject) {
    res.json({ success: true, data: existing });
    return;
  }

  // Create draft record
  await followupsService.createDraftFollowup(bookingId, userId);

  // Get user preferences
  const userRows = await sql<{ timezone: string; followup_tone: string }[]>`
    SELECT timezone, followup_tone FROM users WHERE id = ${userId}
  `;
  const user = userRows[0];
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  // Fetch meeting brief for context
  let meetingBrief: string | null = null;
  const briefRows = await sql<{ invitee_summary: string | null; company_summary: string | null; talking_points: string[] }[]>`
    SELECT invitee_summary, company_summary, talking_points
    FROM meeting_briefs
    WHERE booking_id = ${bookingId} AND user_id = ${userId} AND status = 'completed'
    LIMIT 1
  `;
  const brief = briefRows[0];
  if (brief) {
    const parts: string[] = [];
    if (brief.invitee_summary) parts.push(`About attendee: ${brief.invitee_summary}`);
    if (brief.company_summary) parts.push(`About company: ${brief.company_summary}`);
    if (brief.talking_points?.length > 0) {
      parts.push(`Talking points: ${brief.talking_points.join(', ')}`);
    }
    if (parts.length > 0) meetingBrief = parts.join('\n');
  }

  // Combine invitee notes with user-provided meeting notes
  const combinedNotes = [booking.invitee_notes, meetingNotes].filter(Boolean).join('\n\n');

  // Generate AI content
  const result = await generateFollowup({
    eventTitle: booking.event_type_title,
    inviteeName: booking.invitee_name,
    startTime: booking.start_time,
    endTime: booking.end_time,
    timezone: user.timezone,
    meetingBrief,
    inviteeNotes: combinedNotes || null,
    tone: user.followup_tone as 'formal' | 'friendly' | 'casual',
  });

  // Save generated content
  const draftRows = await sql<{ id: string }[]>`
    SELECT id FROM meeting_followups
    WHERE booking_id = ${bookingId} AND user_id = ${userId}
  `;
  const draftId = draftRows[0]?.id;
  if (!draftId) throw new AppError('Failed to find draft followup', 500, 'INTERNAL_ERROR');

  await sql`
    UPDATE meeting_followups
    SET subject = ${result.subject}, body = ${result.body},
        action_items = ${sql.json(result.actionItems)}
    WHERE id = ${draftId}
  `;

  // Return the full followup with booking info
  const followup = await followupsService.getFollowupById(draftId, userId);

  res.json({ success: true, data: followup });
}
