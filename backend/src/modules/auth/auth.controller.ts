import { Request, Response } from 'express';
import * as authService from './auth.service.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';
import { UnauthorizedError } from '../../utils/errors.js';
import { isProd } from '../../config/env.js';

const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' as const : 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

export async function register(
  req: Request<object, object, RegisterInput>,
  res: Response
): Promise<void> {
  const { authResponse, refreshToken } = await authService.register(req.body);

  res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

  res.status(201).json({
    success: true,
    data: authResponse,
  });
}

export async function login(
  req: Request<object, object, LoginInput>,
  res: Response
): Promise<void> {
  const { authResponse, refreshToken } = await authService.login(req.body);

  res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

  res.status(200).json({
    success: true,
    data: authResponse,
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const refreshTokenValue = req.cookies.refreshToken as string | undefined;

  if (!refreshTokenValue) {
    throw new UnauthorizedError('No refresh token provided');
  }

  const { tokenResponse, newRefreshToken } =
    await authService.refresh(refreshTokenValue);

  res.cookie('refreshToken', newRefreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

  res.status(200).json({
    success: true,
    data: tokenResponse,
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const refreshTokenValue = req.cookies.refreshToken as string | undefined;

  if (refreshTokenValue) {
    await authService.logout(refreshTokenValue);
  }

  res.clearCookie('refreshToken', { path: '/' });

  res.status(200).json({
    success: true,
    data: null,
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const user = await authService.getCurrentUser(req.user.userId);

  res.status(200).json({
    success: true,
    data: { user },
  });
}
