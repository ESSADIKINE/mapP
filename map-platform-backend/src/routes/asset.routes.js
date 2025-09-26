import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { validate } from '../middlewares/validate.js';
import { createAsset, deleteAsset, listAssets, updateAsset } from '../controllers/asset.controller.js';
import { createAssetZ, listAssetsQueryZ, updateAssetZ } from '../schemas/asset.schema.js';

const router = Router();

router.get('/', validate(listAssetsQueryZ, 'query'), asyncHandler(listAssets));
router.post('/', validate(createAssetZ), asyncHandler(createAsset));
router.put('/:id', validate(updateAssetZ), asyncHandler(updateAsset));
router.delete('/:id', asyncHandler(deleteAsset));

export default router;
