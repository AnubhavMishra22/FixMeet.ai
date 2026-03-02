import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpContext } from '../types.js';
import { registerHealthCheckTool } from './health-check.tool.js';

/**
 * Registers all MCP tools on the given server instance.
 * Auth context is passed to tools so they can access userId/email
 * without re-validating the token.
 *
 * New tools should be added here as they are implemented.
 */
export function registerAllTools(server: McpServer, _context?: McpContext): void {
  registerHealthCheckTool(server);

  // Future tools will receive context:
  // registerListEventTypesTool(server, context);
  // registerCheckAvailabilityTool(server, context);
  // registerCreateBookingTool(server, context);
  // registerListBookingsTool(server, context);
}
