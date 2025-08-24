import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { validate } from '../middlewares/validate.js';
import { createProjectZ, updateProjectZ } from '../schemas/project.schema.js';
import { createProject, listProjects, getProject, updateProject, deleteProject, exportProject } from '../controllers/project.controller.js';

const router = Router();

router.post('/', validate(createProjectZ), asyncHandler(createProject));
router.get('/', asyncHandler(listProjects));
router.get('/:id', asyncHandler(getProject));
router.put('/:id', validate(updateProjectZ), asyncHandler(updateProject));
router.delete('/:id', asyncHandler(deleteProject));
router.post('/:id/export', asyncHandler(exportProject));

export default router;
