import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { validate } from '../middlewares/validate.js';
import { createProjectZ, updateProjectZ } from '../schemas/project.schema.js';
import { createProject, listProjects, getProject, updateProject, deleteProject, exportProject } from '../controllers/project.controller.js';
import { Project } from '../models/Project.js';

const router = Router();

router.post('/', validate(createProjectZ), asyncHandler(createProject));
router.get('/', asyncHandler(listProjects));
router.get('/:id', asyncHandler(getProject));
router.put('/:id', validate(updateProjectZ), asyncHandler(updateProject));
router.delete('/:id', asyncHandler(deleteProject));
router.post('/:id/export', asyncHandler(exportProject));
router.put('/:id/principal/model3d', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { model3d } = req.body;
  
  const project = await Project.findById(id);
  if (!project) return res.status(404).json({ error: 'NotFound' });
  
  project.principal.model3d = model3d;
  await project.save();
  res.json(project.principal);
}));

export default router;
