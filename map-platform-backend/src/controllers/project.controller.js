import { Project } from '../models/Project.js';
import { exportProject as exportSrv } from '../services/export.service.js';

export const createProject = async (req, res) => {
  const project = await Project.create(req.body);
  res.status(201).json(project);
};

export const listProjects = async (req, res) => {
  const items = await Project.find({}, { title: 1, createdAt: 1, updatedAt: 1 }).sort({ createdAt: -1 });
  res.json(items);
};

export const getProject = async (req, res) => {
  const item = await Project.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'NotFound' });
  res.json(item);
};

export const updateProject = async (req, res) => {
  const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ error: 'NotFound' });
  res.json(updated);
};

export const deleteProject = async (req, res) => {
  const deleted = await Project.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'NotFound' });
  res.json({ ok: true });
};

export const exportProject = async (req, res) => {
  await exportSrv(req.params.id, req.body || {}, res);
};
