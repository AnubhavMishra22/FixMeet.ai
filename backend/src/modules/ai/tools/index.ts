import type { DynamicStructuredTool } from '@langchain/core/tools';
import { createCheckAvailabilityTool } from './check-availability.tool.js';
import { createCreateBookingTool } from './create-booking.tool.js';
import { createListMeetingsTool } from './list-meetings.tool.js';
import { createCancelMeetingTool } from './cancel-meeting.tool.js';
import { createGenerateFollowupTool } from './generate-followup.tool.js';

/**
 * Returns all AI tools configured with the given user's context.
 * Each tool has access to userId and timezone for personalized queries.
 */
export function getToolsForUser(
  userId: string,
  userTimezone: string,
): DynamicStructuredTool[] {
  return [
    createCheckAvailabilityTool(userId, userTimezone),
    createCreateBookingTool(userId, userTimezone),
    createListMeetingsTool(userId, userTimezone),
    createCancelMeetingTool(userId, userTimezone),
    createGenerateFollowupTool(userId, userTimezone),
  ];
}
