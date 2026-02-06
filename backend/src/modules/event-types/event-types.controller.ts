import { Request, Response } from 'express';
import * as eventTypesService from './event-types.service.js';
import type {
  CreateEventTypeInput,
  UpdateEventTypeInput,
} from './event-types.schema.js';
import { UnauthorizedError } from '../../utils/errors.js';

export async function createEventType(
  req: Request<object, object, CreateEventTypeInput>,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const eventType = await eventTypesService.createEventType(
    req.user.userId,
    req.body
  );

  res.status(201).json({
    success: true,
    data: { eventType },
  });
}

export async function getEventTypes(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const eventTypes = await eventTypesService.getEventTypesByUserId(req.user.userId);

  res.status(200).json({
    success: true,
    data: { eventTypes },
  });
}

export async function getEventType(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const eventType = await eventTypesService.getEventTypeById(
    req.user.userId,
    req.params.id
  );

  res.status(200).json({
    success: true,
    data: { eventType },
  });
}

export async function updateEventType(
  req: Request<{ id: string }, object, UpdateEventTypeInput>,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const eventType = await eventTypesService.updateEventType(
    req.user.userId,
    req.params.id,
    req.body
  );

  res.status(200).json({
    success: true,
    data: { eventType },
  });
}

export async function deleteEventType(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  await eventTypesService.deleteEventType(req.user.userId, req.params.id);

  res.status(200).json({
    success: true,
    data: null,
  });
}
