import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getBriefByBookingId, startBriefGeneration, runBriefPipeline } from '../../modules/briefs/briefs.service.js';
import { NotFoundError } from '../../utils/errors.js';
import type { McpContext } from '../types.js';
import { mcpResult, mcpError } from '../types.js';

/**
 * Registers the get_meeting_brief tool on the MCP server.
 *
 * Fetches an existing AI-generated meeting prep brief, or triggers
 * generation if one doesn't exist yet. Returns invitee summary,
 * company info, previous meetings, and talking points.
 */
export function registerGetMeetingBriefTool(
  server: McpServer,
  context?: McpContext,
): void {
  server.tool(
    'get_meeting_brief',
    'Get an AI-generated prep brief for an upcoming meeting. Returns invitee summary, company info, and suggested talking points. Will generate a new brief if one does not exist yet.',
    {
      bookingId: z.string().describe('The booking ID to get the prep brief for'),
    },
    async ({ bookingId }) => {
      if (!context) {
        return mcpError('Authentication required. Please provide a valid API token.');
      }

      try {
        // Try to fetch existing brief
        let brief;
        try {
          brief = await getBriefByBookingId(bookingId, context.userId);
        } catch (err) {
          if (err instanceof NotFoundError) {
            // No brief exists — trigger generation
            await startBriefGeneration(bookingId, context.userId);

            // Run pipeline synchronously so we can return the result
            try {
              await runBriefPipeline(bookingId, context.userId);
            } catch {
              // Pipeline may fail (no AI key, scraping issues), still return what we have
            }

            // Re-fetch after generation attempt
            try {
              brief = await getBriefByBookingId(bookingId, context.userId);
            } catch {
              return mcpError('Brief generation started but not yet complete. Try again in a moment.');
            }
          } else {
            throw err;
          }
        }

        if (brief.status === 'pending' || brief.status === 'generating') {
          return mcpResult({
            bookingId,
            status: brief.status,
            message: 'Brief is still being generated. Try again in a moment.',
          });
        }

        if (brief.status === 'failed') {
          return mcpResult({
            bookingId,
            status: 'failed',
            message: 'Brief generation failed. The AI service may be unavailable.',
          });
        }

        return mcpResult({
          bookingId,
          status: brief.status,
          booking: {
            inviteeName: brief.booking.inviteeName,
            inviteeEmail: brief.booking.inviteeEmail,
            startTime: brief.booking.startTime,
            endTime: brief.booking.endTime,
            eventTypeTitle: brief.booking.eventTypeTitle,
          },
          brief: {
            inviteeSummary: brief.inviteeSummary,
            companySummary: brief.companySummary,
            talkingPoints: brief.talkingPoints,
            previousMeetings: brief.previousMeetings,
          },
          generatedAt: brief.generatedAt,
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          return mcpError('Booking not found. Please check the booking ID.');
        }

        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('MCP get_meeting_brief error:', message);
        return mcpError(`Failed to get meeting brief: ${message}`);
      }
    },
  );
}
