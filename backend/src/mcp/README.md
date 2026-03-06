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

## Authentication

The MCP server supports two authentication methods:

### API Key (recommended for external clients)

Generate an API key from **Settings → MCP API Keys** in the dashboard. Keys use the `fxm_` prefix.

```
Authorization: Bearer fxm_abc123...
```

### JWT Access Token

Use a JWT access token from the auth system. Useful for stdio transport where you set `FIXMEET_API_TOKEN` env var.

```
Authorization: Bearer eyJhbG...
```

## Setup: Claude Desktop (stdio)

1. Generate an API key or get a JWT access token
2. Open Claude Desktop settings → Developer → Edit Config
3. Add the following to `claude_desktop_config.json`:

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

4. Restart Claude Desktop
5. You should see FixMeet tools available in the tools menu

## Setup: Claude Code (stdio)

```bash
claude mcp add fixmeet \
  --command "npx tsx src/mcp/server.ts" \
  --cwd /path/to/FixMeet.ai/backend \
  --env DATABASE_URL=postgres://fixmeet:fixmeet@localhost:5432/fixmeet \
  --env JWT_SECRET=<your-jwt-secret> \
  --env FIXMEET_API_TOKEN=<your-jwt-access-token>
```

## Setup: Cursor / HTTP Clients

The MCP server is also available over HTTP at `POST /mcp` (Streamable HTTP transport).

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
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

## Generating API Keys

1. Log in to the FixMeet dashboard
2. Go to **Settings**
3. Scroll to **MCP API Keys**
4. Enter a name (e.g. "Claude Desktop") and click **Create Key**
5. Copy the key immediately — it is only shown once
6. Use the key as a Bearer token in your MCP client config

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `FIXMEET_API_TOKEN` | No | JWT access token for stdio auth |
| `MCP_ENABLED` | No | Set to `false` to disable HTTP transport (default: `true`) |

## Example Config File

See `backend/mcp-config.example.json` for a ready-to-use Claude Desktop config template.
