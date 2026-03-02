import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpContext } from '../types.js';
import { registerHealthCheckTool } from './health-check.tool.js';
import { registerCheckAvailabilityTool } from './check-availability.tool.js';
import { registerListMeetingsTool } from './list-meetings.tool.js';
import { registerCreateBookingTool } from './create-booking.tool.js';
import { registerCancelMeetingTool } from './cancel-meeting.tool.js';

/**
 * Registers all MCP tools on the given server instance.
 * Auth context is passed to tools so they can access userId/email
 * without re-validating the token.
 */
export function registerAllTools(server: McpServer, context?: McpContext): void {
  // Health check — no auth needed
  registerHealthCheckTool(server);

  // Core scheduling tools — require auth context
  registerCheckAvailabilityTool(server, context);
  registerListMeetingsTool(server, context);
  registerCreateBookingTool(server, context);
  registerCancelMeetingTool(server, context);
}
