import { Router } from 'express';
import { validate, validateParams } from '../middleware/validate.middleware.js';
import { createApiKeySchema, revokeApiKeySchema } from './api-keys.schema.js';
import { listKeys, createKey, revokeKey } from './api-keys.controller.js';

const router = Router();

router.get('/', listKeys);
router.post('/', validate(createApiKeySchema), createKey);
router.delete('/:id', validateParams(revokeApiKeySchema), revokeKey);

export default router;
