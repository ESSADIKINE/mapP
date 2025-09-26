import { PlaceType } from '../models/PlaceType.js';

export async function listPlaceTypes(_req, res) {
  const docs = await PlaceType.find().sort({ name: 1 }).lean();
  const items = docs.map((doc) => ({
    ...doc,
    _id: doc._id.toString(),
    id: doc._id.toString(),
  }));
  res.json({ items });
}

export async function createPlaceType(req, res) {
  const { name, description } = req.body;
  try {
    const item = await PlaceType.create({
      name: name.trim(),
      description: description?.trim() || undefined,
    });
    res.status(201).json({ item: item.toJSON() });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'DuplicatePlaceType', message: 'A place type with this name already exists.' });
    }
    throw error;
  }
}

export async function updatePlaceType(req, res) {
  const { id } = req.params;
  const { name, description } = req.body;

  const patch = {};
  if (typeof name === 'string') {
    patch.name = name.trim();
  }
  if (typeof description === 'string') {
    patch.description = description.trim();
  }

  if (!Object.keys(patch).length) {
    return res.status(400).json({ error: 'NoUpdatesProvided', message: 'Provide at least one field to update.' });
  }

  try {
    const doc = await PlaceType.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
    if (!doc) {
      return res.status(404).json({ error: 'PlaceTypeNotFound', message: 'Place type not found.' });
    }
    res.json({ item: doc.toJSON() });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'DuplicatePlaceType', message: 'A place type with this name already exists.' });
    }
    throw error;
  }
}

export async function deletePlaceType(req, res) {
  const { id } = req.params;
  const doc = await PlaceType.findByIdAndDelete(id);
  if (!doc) {
    return res.status(404).json({ error: 'PlaceTypeNotFound', message: 'Place type not found.' });
  }
  res.json({ ok: true });
}
