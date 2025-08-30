import { Router } from 'express';
import { uploader, uploadSingle, modelUploader, upload3DModel, serve3DModel } from '../controllers/upload.controller.js';

const router = Router();

// Image upload route
router.post('/', uploader.single('file'), uploadSingle);

// 3D model upload route
router.post('/3d-model', modelUploader.single('file'), upload3DModel);

// Serve 3D model files
router.get('/3d-model/:filename', serve3DModel);

export default router;
