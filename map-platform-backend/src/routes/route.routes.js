import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { getRoute } from '../controllers/route.controller.js';

const router = Router();
// GET /api/route?from=lat,lng&to=lat,lng
router.get('/', asyncHandler(getRoute));

export default router;
