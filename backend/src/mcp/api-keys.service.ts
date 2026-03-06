import crypto from 'node:crypto';
import { sql } from '../config/database.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import type { McpContext } from './types.js';

interface ApiKeyRow {
  id: string;
  user_id: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
  is_active: boolean;
}

interface ApiKeyLookupRow {
  user_id: string;
  is_active: boolean;
}

interface UserEmailRow {
  email: string;
}

const API_KEY_PREFIX = 'fxm_';

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Create a new MCP API key for a user.
 * Returns the plaintext key once — it cannot be retrieved again.
 */
export async function createApiKey(
  userId: string,
  name: string,
): Promise<{ id: string; key: string; name: string; createdAt: string }> {
  const plaintext = API_KEY_PREFIX + crypto.randomBytes(32).toString('hex');
  const keyHash = hashKey(plaintext);

  try {
    const rows = await sql<{ id: string; created_at: string }[]>`
      INSERT INTO mcp_api_keys (user_id, key_hash, name)
      VALUES (${userId}, ${keyHash}, ${name})
      RETURNING id, created_at
    `;
    const row = rows[0]!;
    return {
      id: row.id,
      key: plaintext,
      name,
      createdAt: row.created_at,
    };
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      throw new ConflictError(`An API key named "${name}" already exists`);
    }
    throw err;
  }
}

/**
 * Validate an MCP API key and return the authenticated context.
 * Updates last_used_at in the background (fire-and-forget).
 */
export async function validateApiKey(key: string): Promise<McpContext> {
  const keyHash = hashKey(key);

  const rows = await sql<ApiKeyLookupRow[]>`
    SELECT user_id, is_active FROM mcp_api_keys WHERE key_hash = ${keyHash}
  `;

  const row = rows[0];
  if (!row) {
    throw new UnauthorizedError('Invalid API key');
  }

  if (!row.is_active) {
    throw new UnauthorizedError('API key has been revoked');
  }

  const userId = row.user_id;

  // Fire-and-forget: update last_used_at
  sql`UPDATE mcp_api_keys SET last_used_at = NOW() WHERE key_hash = ${keyHash}`.catch(() => {});

  // Look up user email for context
  const userRows = await sql<UserEmailRow[]>`
    SELECT email FROM users WHERE id = ${userId}
  `;

  const userRow = userRows[0];
  if (!userRow) {
    throw new UnauthorizedError('User not found');
  }

  return { userId, email: userRow.email };
}

/**
 * List all API keys for a user (without hashes).
 */
export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  return sql<ApiKeyRow[]>`
    SELECT id, user_id, name, last_used_at, created_at, is_active
    FROM mcp_api_keys
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
}

/**
 * Revoke (soft-delete) an API key.
 */
export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const rows = await sql<{ id: string }[]>`
    UPDATE mcp_api_keys
    SET is_active = false
    WHERE id = ${keyId} AND user_id = ${userId} AND is_active = true
    RETURNING id
  `;

  if (rows.length === 0) {
    throw new NotFoundError('API key not found or already revoked');
  }
}
