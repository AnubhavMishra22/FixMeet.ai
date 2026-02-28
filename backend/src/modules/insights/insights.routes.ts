import { Router } from 'express';
import * as insightsController from './insights.controller.js';

const router = Router();

router.get('/stats', insightsController.getStats);
router.get('/by-day', insightsController.getByDay);
router.get('/by-hour', insightsController.getByHour);
router.get('/by-type', insightsController.getByType);
router.get('/trends', insightsController.getTrends);
router.get('/no-shows', insightsController.getNoShows);
router.get('/ai', insightsController.getAI);

export default router;
