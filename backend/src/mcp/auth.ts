import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';
import type { McpContext } from './types.js';

const API_KEY_PREFIX = 'fxm_';

/**
 * Authenticate an MCP request using a JWT access token.
 * Synchronous — used by stdio transport (token from env var).
 *
 * @param token - JWT access token string
 * @returns Authenticated user context
 * @throws UnauthorizedError if token is missing or invalid
 */
export function authenticateMcp(token: string | undefined): McpContext {
  if (!token) {
    throw new UnauthorizedError('MCP authentication token is required');
  }

  try {
    const payload = verifyAccessToken(token);
    return {
      userId: payload.userId,
      email: payload.email,
    };
  } catch {
    throw new UnauthorizedError('Invalid or expired MCP authentication token');
  }
}

/**
 * Authenticate an MCP HTTP request using either a JWT or API key.
 * Async — used by HTTP transport (token from Authorization header).
 *
 * Detection: tokens starting with `fxm_` are API keys, otherwise JWT.
 */
export async function authenticateMcpRequest(
  token: string | undefined,
): Promise<McpContext> {
  if (!token) {
    throw new UnauthorizedError('MCP authentication token is required');
  }

  if (token.startsWith(API_KEY_PREFIX)) {
    const { validateApiKey } = await import('./api-keys.service.js');
    return validateApiKey(token);
  }

  // Fall back to JWT
  return authenticateMcp(token);
}
