import { Router } from 'express';
import * as eventTypesController from './event-types.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createEventTypeSchema,
  updateEventTypeSchema,
} from './event-types.schema.js';

const router = Router();

// All routes require authentication (applied in app.ts)

router.get('/', eventTypesController.getEventTypes);
router.post('/', validate(createEventTypeSchema), eventTypesController.createEventType);
router.get('/:id', eventTypesController.getEventType);
router.patch(
  '/:id',
  validate(updateEventTypeSchema),
  eventTypesController.updateEventType
);
router.delete('/:id', eventTypesController.deleteEventType);

export default router;
