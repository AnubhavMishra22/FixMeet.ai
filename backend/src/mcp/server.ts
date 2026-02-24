#!/usr/bin/env node

/**
 * FixMeet MCP Server — stdio transport entry point.
 *
 * This runs as a standalone process, launched by MCP clients (Claude Desktop,
 * Claude Code, etc.) via stdin/stdout JSON-RPC.
 *
 * IMPORTANT: Never use console.log() in this file — stdout is reserved for
 * JSON-RPC messages. Use console.error() for all logging.
 *
 * Required env vars:
 *   DATABASE_URL  — PostgreSQL connection string
 *   JWT_SECRET    — JWT signing secret (min 32 chars)
 *
 * Optional env vars:
 *   FIXMEET_API_TOKEN — JWT access token for authentication
 */

import dotenv from 'dotenv';
dotenv.config();

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from './tools/index.js';
import { registerAllResources } from './resources/index.js';
import { authenticateMcp } from './auth.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from './types.js';
import type { McpContext } from './types.js';

async function main(): Promise<void> {
  // Authenticate from env var and capture context for tools
  let context: McpContext | undefined;
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

  // Create MCP server
  const server = new McpServer(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    { capabilities: { logging: {} } },
  );

  // Register all tools and resources with authenticated context
  registerAllTools(server, context);
  registerAllResources(server, context);

  // Connect stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[${MCP_SERVER_NAME}] v${MCP_SERVER_VERSION} running on stdio`);
}

main().catch((err) => {
  console.error(`[${MCP_SERVER_NAME}] Fatal error:`, err);
  process.exit(1);
});
