import { Router } from 'express';
import * as aiController from './ai.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { chatSchema } from './ai.schema.js';

const router = Router();

router.post('/chat', validate(chatSchema), aiController.chat);

export default router;
