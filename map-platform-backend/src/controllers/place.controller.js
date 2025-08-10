import { Project } from '../models/Project.js';

export const addSecondaryPlace = async (req, res) => {
  const { id } = req.params;
  const project = await Project.findById(id);
  if (!project) return res.status(404).json({ error: 'NotFound' });

  project.secondaries.push({ ...req.body, category: 'Secondary' });
  await project.save();
  res.status(201).json(project);
};

export const updatePlace = async (req, res) => {
  const { projectId, placeId } = req.params;
  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ error: 'NotFound' });

  const idx = project.secondaries.findIndex(p => p._id.toString() === placeId);
  if (idx === -1) return res.status(404).json({ error: 'PlaceNotFound' });

  project.secondaries[idx] = { ...project.secondaries[idx].toObject(), ...req.body };
  await project.save();
  res.json(project.secondaries[idx]);
};

export const deletePlace = async (req, res) => {
  const { projectId, placeId } = req.params;
  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ error: 'NotFound' });

  const before = project.secondaries.length;
  project.secondaries = project.secondaries.filter(p => p._id.toString() !== placeId);
  if (project.secondaries.length === before) return res.status(404).json({ error: 'PlaceNotFound' });

  await project.save();
  res.json({ ok: true });
};
