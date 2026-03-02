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
import { authenticateMcp } from './auth.js';

const SERVER_NAME = 'fixmeet-mcp';
const SERVER_VERSION = '1.0.0';

async function main(): Promise<void> {
  // Validate auth token if provided
  const token = process.env.FIXMEET_API_TOKEN;
  if (token) {
    try {
      const ctx = authenticateMcp(token);
      console.error(`[${SERVER_NAME}] Authenticated as user: ${ctx.email}`);
    } catch (err) {
      console.error(`[${SERVER_NAME}] Warning: FIXMEET_API_TOKEN is invalid:`, err instanceof Error ? err.message : err);
    }
  } else {
    console.error(`[${SERVER_NAME}] No FIXMEET_API_TOKEN set — tools requiring auth will fail.`);
  }

  // Create MCP server
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { logging: {} } },
  );

  // Register all tools
  registerAllTools(server);

  // Connect stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[${SERVER_NAME}] v${SERVER_VERSION} running on stdio`);
}

main().catch((err) => {
  console.error(`[${SERVER_NAME}] Fatal error:`, err);
  process.exit(1);
});
