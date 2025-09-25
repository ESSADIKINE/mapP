import { Router } from 'express';
import { uploader, uploadSingle } from '../controllers/upload.controller.js';

const router = Router();

// Image upload route
router.post('/', uploader.single('file'), uploadSingle);


export default router;
