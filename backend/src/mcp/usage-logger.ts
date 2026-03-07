import { sql } from '../config/database.js';

/**
 * Log an MCP tool call for analytics (fire-and-forget).
 */
export function logMcpToolCall(
  userId: string,
  toolName: string,
  transport: 'http' | 'stdio',
  durationMs: number,
  isError: boolean,
): void {
  sql`
    INSERT INTO mcp_usage_logs (user_id, tool_name, transport, duration_ms, is_error)
    VALUES (${userId}, ${toolName}, ${transport}, ${durationMs}, ${isError})
  `.catch((err) => {
    console.error('[mcp] Failed to log tool usage:', err);
  });
}
