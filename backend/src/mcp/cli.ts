#!/usr/bin/env node

/**
 * FixMeet MCP CLI — standalone entry point for MCP clients.
 *
 * Can be run as: npx fixmeet-mcp
 *
 * Supports two modes:
 *   1. Remote (HTTP) — connects to a running FixMeet backend via API key
 *   2. Local (stdio) — connects directly to the database (for local dev)
 *
 * Environment variables:
 *   FIXMEET_API_KEY  — MCP API key (fxm_...) for remote mode
 *   FIXMEET_API_URL  — Backend URL (default: http://localhost:3001)
 *
 * For local/stdio mode (used by mcp-config.example.json):
 *   DATABASE_URL     — PostgreSQL connection string
 *   JWT_SECRET       — JWT signing secret
 *   FIXMEET_API_TOKEN — JWT access token
 *
 * stdout is reserved for JSON-RPC — all logging goes to stderr.
 */

import dotenv from 'dotenv';
dotenv.config();

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from './types.js';

const apiKey = process.env.FIXMEET_API_KEY;
const apiUrl = process.env.FIXMEET_API_URL || 'http://localhost:3001';

async function main(): Promise<void> {
  if (apiKey) {
    console.error(`[${MCP_SERVER_NAME}] Starting in remote mode → ${apiUrl}`);
    await startRemoteMode();
  } else if (process.env.DATABASE_URL) {
    console.error(`[${MCP_SERVER_NAME}] Starting in local/stdio mode`);
    await startLocalMode();
  } else {
    console.error(`[${MCP_SERVER_NAME}] Error: No configuration found.`);
    console.error('');
    console.error('Set one of the following:');
    console.error('  FIXMEET_API_KEY  — Connect to a remote FixMeet backend');
    console.error('  DATABASE_URL     — Connect directly to the database (local dev)');
    console.error('');
    console.error('See: https://github.com/AnubhavMishra22/FixMeet.ai/blob/main/backend/src/mcp/README.md');
    process.exit(1);
  }
}

async function startRemoteMode(): Promise<void> {
  const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');

  const server = new McpServer(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    { capabilities: { logging: {} } },
  );

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };

  async function mcpCall(method: string, params: unknown = {}): Promise<unknown> {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
    const res = await fetch(`${apiUrl}/mcp`, { method: 'POST', headers, body });
    if (!res.ok) {
      throw new Error(`MCP HTTP error ${res.status}: ${await res.text()}`);
    }
    const json = await res.json() as { result?: unknown; error?: { message: string } };
    if (json.error) throw new Error(json.error.message);
    return json.result;
  }

  // Verify connection on startup
  try {
    const initResult = await mcpCall('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'fixmeet-cli', version: MCP_SERVER_VERSION },
    }) as { serverInfo?: { name: string } };
    console.error(`[${MCP_SERVER_NAME}] Connected to ${initResult?.serverInfo?.name ?? 'server'}`);
  } catch (err) {
    console.error(`[${MCP_SERVER_NAME}] Failed to connect to ${apiUrl}:`, err instanceof Error ? err.message : err);
    process.exit(1);
  }

  // Fetch available tools from remote and register them as proxies
  try {
    const toolsResult = await mcpCall('tools/list') as { tools: Array<{ name: string; description?: string; inputSchema?: unknown }> };
    for (const tool of toolsResult.tools) {
      server.tool(
        tool.name,
        tool.description ?? '',
        {},
        async (args) => {
          try {
            const result = await mcpCall('tools/call', { name: tool.name, arguments: args });
            const callResult = result as { content?: Array<{ type: 'text'; text: string }> };
            return { content: callResult?.content ?? [{ type: 'text' as const, text: JSON.stringify(result) }] };
          } catch (err) {
            return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
          }
        },
      );
    }
    console.error(`[${MCP_SERVER_NAME}] Registered ${toolsResult.tools.length} tools (proxy mode)`);
  } catch (err) {
    console.error(`[${MCP_SERVER_NAME}] Warning: Could not fetch tools:`, err instanceof Error ? err.message : err);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[${MCP_SERVER_NAME}] v${MCP_SERVER_VERSION} running on stdio (remote → ${apiUrl})`);
}

async function startLocalMode(): Promise<void> {
  // Delegate to the existing stdio server
  const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const { registerAllTools } = await import('./tools/index.js');
  const { registerAllResources } = await import('./resources/index.js');
  const { authenticateMcp } = await import('./auth.js');

  let context: import('./types.js').McpContext | undefined;
  const token = process.env.FIXMEET_API_TOKEN;
  if (token) {
    try {
      context = authenticateMcp(token);
      console.error(`[${MCP_SERVER_NAME}] Authenticated as user: ${context.email}`);
    } catch (err) {
      console.error(`[${MCP_SERVER_NAME}] Warning: FIXMEET_API_TOKEN is invalid:`, err instanceof Error ? err.message : err);
    }
  } else {
    console.error(`[${MCP_SERVER_NAME}] No FIXMEET_API_TOKEN set — tools requiring auth will fail.`);
  }

  const server = new McpServer(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    { capabilities: { logging: {} } },
  );

  registerAllTools(server, context);
  registerAllResources(server, context);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[${MCP_SERVER_NAME}] v${MCP_SERVER_VERSION} running on stdio (local)`);
}

main().catch((err) => {
  console.error(`[${MCP_SERVER_NAME}] Fatal error:`, err);
  process.exit(1);
});
