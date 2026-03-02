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
