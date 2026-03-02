import type { Express, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerAllTools } from './tools/index.js';
import { authenticateMcp } from './auth.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from './types.js';
import type { McpContext } from './types.js';

/**
 * Creates a fresh MCP server instance with all tools registered.
 * Each HTTP request gets its own server (stateless mode).
 * Auth context is passed through so tools can access userId/email.
 */
function createMcpServer(context?: McpContext): McpServer {
  const server = new McpServer(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    { capabilities: { logging: {} } },
  );
  registerAllTools(server, context);
  return server;
}

/**
 * Extract and validate Bearer token from request.
 * MCP HTTP requests should include an Authorization header.
 */
function extractAuthToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return undefined;
}

/**
 * Mount MCP Streamable HTTP endpoints on the Express app.
 *
 * Endpoints:
 *   POST /mcp   — Client-to-server requests (tool calls, initialize)
 *   GET  /mcp   — Server-to-client notifications (SSE stream)
 *   DELETE /mcp — Session termination
 *
 * Uses stateless mode (no session persistence) for simplicity.
 */
export function mountMcpRoutes(app: Express): void {
  // POST /mcp — handle MCP requests (stateless: new server per request)
  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      // Authenticate once at transport layer and pass context to tools
      let context: McpContext | undefined;
      const token = extractAuthToken(req);
      if (token) {
        try {
          context = authenticateMcp(token);
        } catch {
          res.status(401).json({ error: 'Invalid authentication token' });
          return;
        }
      }

      const server = createMcpServer(context);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless — no session persistence
        enableJsonResponse: true,      // return JSON instead of SSE stream
      });

      res.on('close', () => {
        transport.close().catch(() => { /* ignore cleanup errors */ });
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error('[mcp-http] Error handling POST /mcp:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal MCP server error' });
      }
    }
  });

  // GET /mcp — SSE stream for server-to-client notifications
  app.get('/mcp', async (_req: Request, res: Response) => {
    // Stateless mode doesn't support GET (no sessions to reconnect to)
    res.status(405).json({
      error: 'Method not allowed — this MCP server runs in stateless mode',
    });
  });

  // DELETE /mcp — session termination
  app.delete('/mcp', async (_req: Request, res: Response) => {
    // Stateless mode — no sessions to terminate
    res.status(405).json({
      error: 'Method not allowed — this MCP server runs in stateless mode',
    });
  });

  console.log('[mcp-http] MCP HTTP endpoints mounted at /mcp');
}
