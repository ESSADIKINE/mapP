import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { validate } from '../middlewares/validate.js';
import { secondaryPlaceZ, secondaryPlacePartialZ } from '../schemas/place.schema.js';
import { addSecondaryPlace, updatePlace, deletePlace, updatePlaceModel3D } from '../controllers/place.controller.js';
import { computeAndAttachRouteToSecondary } from '../controllers/route.controller.js';

const router = Router({ mergeParams: true });

// POST /api/projects/:id/places (add secondary)
router.post('/', validate(secondaryPlaceZ), asyncHandler(addSecondaryPlace));

// PUT /api/projects/:projectId/places/:placeId
router.put('/:placeId', validate(secondaryPlacePartialZ), asyncHandler(updatePlace));

// DELETE /api/projects/:projectId/places/:placeId
router.delete('/:placeId', asyncHandler(deletePlace));

// POST /api/projects/:projectId/places/:placeId/route (compute & attach)
router.post('/:placeId/route', asyncHandler(computeAndAttachRouteToSecondary));

// PUT /api/projects/:projectId/places/:placeId/model3d (update 3D model)
router.put('/:placeId/model3d', asyncHandler(updatePlaceModel3D));

export default router;
