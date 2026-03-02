import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from '../types.js';

/**
 * Registers the health_check tool on the MCP server.
 * Returns server status, uptime, and version — useful for verifying connectivity.
 */
export function registerHealthCheckTool(server: McpServer): void {
  server.tool(
    'health_check',
    'Check if the FixMeet MCP server is running and responsive',
    {},
    async () => {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              status: 'healthy',
              server: MCP_SERVER_NAME,
              version: MCP_SERVER_VERSION,
              timestamp: new Date().toISOString(),
              uptime: Math.round(process.uptime()),
            }),
          },
        ],
      };
    },
  );
}
