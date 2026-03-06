import { Router } from 'express';
import { validate } from '../middleware/validate.middleware.js';
import { createApiKeySchema } from './api-keys.schema.js';
import { listKeys, createKey, revokeKey } from './api-keys.controller.js';

const router = Router();

router.get('/', listKeys);
router.post('/', validate(createApiKeySchema), createKey);
router.delete('/:id', revokeKey);

export default router;
