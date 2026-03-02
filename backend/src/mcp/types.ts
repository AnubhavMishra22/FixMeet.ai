/** Shared MCP server constants — single source of truth */
export const MCP_SERVER_NAME = 'fixmeet-mcp';
export const MCP_SERVER_VERSION = '1.0.0';

/** Authenticated MCP user context extracted from JWT */
export interface McpContext {
  userId: string;
  email: string;
}

/** Standard MCP tool content item */
export interface McpTextContent {
  type: 'text';
  text: string;
}

/** Standard MCP tool result shape */
export interface McpToolResult {
  content: McpTextContent[];
  isError?: boolean;
}

/** Helper to create a successful text result */
export function mcpResult(data: unknown): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data) }],
  };
}

/** Helper to create an error result */
export function mcpError(message: string): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}
