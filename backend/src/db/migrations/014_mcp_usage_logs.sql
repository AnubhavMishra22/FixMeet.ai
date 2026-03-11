-- MCP tool usage logging for analytics
CREATE TABLE IF NOT EXISTS mcp_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    transport VARCHAR(10) NOT NULL DEFAULT 'http',
    duration_ms INTEGER,
    is_error BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_usage_user ON mcp_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_usage_tool ON mcp_usage_logs(tool_name);
CREATE INDEX IF NOT EXISTS idx_mcp_usage_created ON mcp_usage_logs(created_at);
