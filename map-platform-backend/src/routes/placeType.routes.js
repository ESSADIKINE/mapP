import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { validate } from '../middlewares/validate.js';
import {
  createPlaceType,
  deletePlaceType,
  listPlaceTypes,
  updatePlaceType,
} from '../controllers/placeType.controller.js';
import { createPlaceTypeZ, updatePlaceTypeZ } from '../schemas/placeType.schema.js';

const router = Router();

router.get('/', asyncHandler(listPlaceTypes));
router.post('/', validate(createPlaceTypeZ), asyncHandler(createPlaceType));
router.put('/:id', validate(updatePlaceTypeZ), asyncHandler(updatePlaceType));
router.delete('/:id', asyncHandler(deletePlaceType));

export default router;
