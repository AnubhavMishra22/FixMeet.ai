import type { Request, Response } from 'express';
import { createApiKey, listApiKeys, revokeApiKey } from './api-keys.service.js';

export async function listKeys(req: Request, res: Response) {
  const keys = await listApiKeys(req.user!.userId);
  res.json({ data: keys });
}

export async function createKey(req: Request, res: Response) {
  const { name } = req.body as { name: string };
  const result = await createApiKey(req.user!.userId, name);
  res.status(201).json({ data: result });
}

export async function revokeKey(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  await revokeApiKey(req.user!.userId, id);
  res.json({ message: 'API key revoked' });
}
