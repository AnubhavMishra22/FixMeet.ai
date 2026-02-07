import { sql } from '../../config/database.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../../utils/jwt.js';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../utils/errors.js';
import type {
  User,
  UserWithPassword,
  RefreshToken,
  AuthResponse,
  TokenResponse,
} from './auth.types.js';
import type { RegisterInput, LoginInput, UpdateProfileInput } from './auth.schema.js';

function generateUsername(email: string): string {
  const base = email.split('@')[0] ?? 'user';
  const sanitized = base.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${sanitized}${suffix}`;
}

function sanitizeUser(user: UserWithPassword): User {
  const { password_hash: _, ...sanitized } = user;
  return sanitized;
}

export async function register(
  input: RegisterInput
): Promise<{ authResponse: AuthResponse; refreshToken: string }> {
  // Check if email already exists
  const existingUsers = await sql<UserWithPassword[]>`
    SELECT * FROM users WHERE email = ${input.email}
  `;

  if (existingUsers.length > 0) {
    throw new ConflictError('Email already registered');
  }

  // Generate unique username
  let username = generateUsername(input.email);
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existingUsername = await sql<{ id: string }[]>`
      SELECT id FROM users WHERE username = ${username}
    `;

    if (existingUsername.length === 0) {
      break;
    }

    username = generateUsername(input.email);
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new ConflictError('Unable to generate unique username');
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Create user
  const newUsers = await sql<UserWithPassword[]>`
    INSERT INTO users (email, password_hash, name, username)
    VALUES (${input.email}, ${passwordHash}, ${input.name}, ${username})
    RETURNING *
  `;

  const newUser = newUsers[0];
  if (!newUser) {
    throw new Error('Failed to create user');
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: newUser.id,
    email: newUser.email,
  });

  const { token: refreshToken, hash, expiresAt } = generateRefreshToken();

  // Store refresh token
  await sql`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (${newUser.id}, ${hash}, ${expiresAt})
  `;

  return {
    authResponse: {
      user: sanitizeUser(newUser),
      accessToken,
    },
    refreshToken,
  };
}

export async function login(
  input: LoginInput
): Promise<{ authResponse: AuthResponse; refreshToken: string }> {
  // Find user by email
  const users = await sql<UserWithPassword[]>`
    SELECT * FROM users WHERE email = ${input.email}
  `;

  const user = users[0];
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Verify password
  const isValid = await comparePassword(input.password, user.password_hash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
  });

  const { token: refreshToken, hash, expiresAt } = generateRefreshToken();

  // Store refresh token
  await sql`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (${user.id}, ${hash}, ${expiresAt})
  `;

  return {
    authResponse: {
      user: sanitizeUser(user),
      accessToken,
    },
    refreshToken,
  };
}

export async function refresh(
  refreshTokenValue: string
): Promise<{ tokenResponse: TokenResponse; newRefreshToken: string }> {
  const tokenHash = hashRefreshToken(refreshTokenValue);

  // Find refresh token
  const tokens = await sql<RefreshToken[]>`
    SELECT * FROM refresh_tokens WHERE token_hash = ${tokenHash}
  `;

  const storedToken = tokens[0];
  if (!storedToken) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Check if expired
  if (new Date(storedToken.expires_at) < new Date()) {
    await sql`DELETE FROM refresh_tokens WHERE id = ${storedToken.id}`;
    throw new UnauthorizedError('Refresh token expired');
  }

  // Delete old refresh token (rotation)
  await sql`DELETE FROM refresh_tokens WHERE id = ${storedToken.id}`;

  // Get user
  const users = await sql<UserWithPassword[]>`
    SELECT * FROM users WHERE id = ${storedToken.user_id}
  `;

  const user = users[0];
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Generate new tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
  });

  const { token: newRefreshToken, hash, expiresAt } = generateRefreshToken();

  // Store new refresh token
  await sql`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (${user.id}, ${hash}, ${expiresAt})
  `;

  return {
    tokenResponse: { accessToken },
    newRefreshToken,
  };
}

export async function logout(refreshTokenValue: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshTokenValue);

  await sql`
    DELETE FROM refresh_tokens WHERE token_hash = ${tokenHash}
  `;
}

export async function getCurrentUser(userId: string): Promise<User> {
  const users = await sql<UserWithPassword[]>`
    SELECT * FROM users WHERE id = ${userId}
  `;

  const user = users[0];
  if (!user) {
    throw new NotFoundError('User not found');
  }

  return sanitizeUser(user);
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<User> {
  // Check username uniqueness if changing
  if (input.username) {
    const existing = await sql<{ id: string }[]>`
      SELECT id FROM users WHERE username = ${input.username} AND id != ${userId}
    `;
    if (existing.length > 0) {
      throw new ConflictError('Username already taken');
    }
  }

  const updates: string[] = [];
  const values: string[] = [];

  if (input.name !== undefined) {
    updates.push('name');
    values.push(input.name);
  }
  if (input.username !== undefined) {
    updates.push('username');
    values.push(input.username);
  }
  if (input.timezone !== undefined) {
    updates.push('timezone');
    values.push(input.timezone);
  }

  if (updates.length === 0) {
    return getCurrentUser(userId);
  }

  // Build SET clause dynamically
  const setClauses = updates.map((col, i) => `${col} = $${i + 2}`).join(', ');

  const result = await sql.unsafe<UserWithPassword[]>(
    `UPDATE users SET ${setClauses}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [userId, ...values]
  );

  const user = result[0];
  if (!user) {
    throw new NotFoundError('User not found');
  }

  return sanitizeUser(user);
}
