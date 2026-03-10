# FixMeet MCP Server

FixMeet exposes a [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that lets AI clients — Claude Desktop, Claude Code, Cursor, and any MCP-compatible tool — interact with your scheduling platform.

## Available Tools (8)

| Tool | Description |
|------|-------------|
| `health_check` | Server status, version, and uptime |
| `check_availability` | Free time slots across active event types for a given date |
| `list_meetings` | Meetings for a timeframe (today, tomorrow, this_week, next_week) |
| `create_booking` | Schedule a meeting with an invitee |
| `cancel_meeting` | Cancel a meeting by booking ID |
| `get_meeting_brief` | AI-generated prep brief for an upcoming meeting |
| `generate_followup` | AI follow-up email draft for a past meeting |
| `get_insights` | Meeting analytics and AI insights (stats, trends, comparisons) |

## Available Resources (3)

| Resource | URI | Description |
|----------|-----|-------------|
| User Profile | `fixmeet://user/profile` | Name, email, timezone, preferences |
| Event Types | `fixmeet://user/event-types` | List of event types with scheduling details |
| Calendar Status | `fixmeet://user/calendar-status` | Connected calendar integrations |

## Quick Start

The fastest way to get started:

1. Generate an API key from **Settings → MCP API Keys** in the dashboard
2. Install the CLI: `npx fixmeet-mcp` (or configure your MCP client)
3. Set `FIXMEET_API_KEY` and `FIXMEET_API_URL` environment variables

## Authentication

### API Key (recommended)

Generate an API key from **Settings → MCP API Keys** in the dashboard. Keys use the `fxm_` prefix.

```
Authorization: Bearer fxm_abc123...
```

### JWT Access Token

Use a JWT access token from the auth system. Useful for stdio transport where you set `FIXMEET_API_TOKEN` env var.

```
Authorization: Bearer eyJhbG...
```

## Setup: Claude Desktop (recommended)

### Option A: Remote mode via CLI (simplest)

1. Generate an API key from Settings → MCP API Keys
2. Open Claude Desktop → Settings → Developer → Edit Config
3. Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fixmeet": {
      "command": "npx",
      "args": ["fixmeet-mcp"],
      "env": {
        "FIXMEET_API_KEY": "fxm_your-api-key-here",
        "FIXMEET_API_URL": "https://your-backend-url"
      }
    }
  }
}
```

4. Restart Claude Desktop
5. FixMeet tools appear in the tools menu

See `backend/claude-desktop-config.example.json` for a ready-to-use template.

### Option B: Local mode (direct database access)

For local development, the MCP server can connect directly to the database:

```json
{
  "mcpServers": {
    "fixmeet": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/path/to/FixMeet.ai/backend",
      "env": {
        "DATABASE_URL": "postgres://fixmeet:fixmeet@localhost:5432/fixmeet",
        "JWT_SECRET": "<your-jwt-secret>",
        "FIXMEET_API_TOKEN": "<your-jwt-access-token>"
      }
    }
  }
}
```

See `backend/mcp-config.example.json` for this template.

## Setup: Claude Code

```bash
claude mcp add fixmeet \
  --command "npx fixmeet-mcp" \
  --env FIXMEET_API_KEY=fxm_your-api-key \
  --env FIXMEET_API_URL=http://localhost:3001
```

## Setup: Cursor / HTTP Clients

The MCP server is also available over HTTP at `POST /mcp` (Streamable HTTP transport).

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer fxm_your-api-key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

For Cursor, add to your MCP settings:

```json
{
  "mcpServers": {
    "fixmeet": {
      "url": "http://localhost:3001/mcp",
      "headers": {
        "Authorization": "Bearer fxm_your-api-key"
      }
    }
  }
}
```

## Standalone CLI

The `fixmeet-mcp` CLI can run in two modes:

| Mode | Trigger | Use case |
|------|---------|----------|
| **Remote** | `FIXMEET_API_KEY` is set | Connects to a running backend via HTTP |
| **Local** | `DATABASE_URL` is set | Connects directly to the database |

```bash
# Remote mode
FIXMEET_API_KEY=fxm_... FIXMEET_API_URL=http://localhost:3001 npx fixmeet-mcp

# Local mode
DATABASE_URL=postgres://... JWT_SECRET=... FIXMEET_API_TOKEN=... npx fixmeet-mcp
```

## Generating API Keys

1. Log in to the FixMeet dashboard
2. Go to **Settings**
3. Scroll to **MCP API Keys**
4. Enter a name (e.g. "Claude Desktop") and click **Create Key**
5. Copy the key immediately — it is only shown once
6. Use the key as a Bearer token in your MCP client config

## Rate Limiting

MCP HTTP requests are rate-limited per user. Default: 30 requests per minute.
Configure via the `MCP_RATE_LIMIT` environment variable.

## Usage Logging

Tool calls via the HTTP transport are logged to the `mcp_usage_logs` table for analytics.
Each log entry records the tool name, transport type, duration, and error status.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | JWT signing secret (min 32 chars) |
| `FIXMEET_API_TOKEN` | No | — | JWT access token for stdio auth |
| `FIXMEET_API_KEY` | No | — | API key for remote CLI mode |
| `FIXMEET_API_URL` | No | `http://localhost:3001` | Backend URL for remote CLI mode |
| `MCP_ENABLED` | No | `true` | Set to `false` to disable HTTP transport |
| `MCP_RATE_LIMIT` | No | `30` | Max requests per minute per user |
