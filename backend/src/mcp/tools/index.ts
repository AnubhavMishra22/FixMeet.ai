import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerHealthCheckTool } from './health-check.tool.js';

/**
 * Registers all MCP tools on the given server instance.
 * New tools should be added here as they are implemented.
 */
export function registerAllTools(server: McpServer): void {
  registerHealthCheckTool(server);

  // Future tools will be registered here:
  // registerListEventTypesTool(server);
  // registerCheckAvailabilityTool(server);
  // registerCreateBookingTool(server);
  // registerListBookingsTool(server);
}
