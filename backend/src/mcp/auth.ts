import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';
import type { McpContext } from './types.js';

/**
 * Authenticate an MCP request using a JWT access token.
 * Works for both stdio (token from env var) and HTTP (token from header).
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
