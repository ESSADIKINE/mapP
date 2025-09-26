import { Asset } from '../models/Asset.js';

export async function listAssets(req, res) {
  const { type } = req.query;
  const query = {};
  if (type) {
    query.type = type;
  }

  const docs = await Asset.find(query).sort({ label: 1 }).lean();
  const items = docs.map((doc) => ({
    ...doc,
    _id: doc._id.toString(),
    id: doc._id.toString(),
  }));
  res.json({ items });
}

export async function createAsset(req, res) {
  const { type, label, url, publicId } = req.body;
  try {
    const item = await Asset.create({
      type,
      label: label.trim(),
      url: url.trim(),
      publicId: publicId?.trim() || undefined,
    });
    res.status(201).json({ item: item.toJSON() });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'DuplicateAsset', message: 'An asset with the same label or URL already exists.' });
    }
    throw error;
  }
}

export async function updateAsset(req, res) {
  const { id } = req.params;
  const { label, url, publicId } = req.body;

  const patch = {};
  if (typeof label === 'string') {
    patch.label = label.trim();
  }
  if (typeof url === 'string') {
    patch.url = url.trim();
  }
  if (typeof publicId === 'string') {
    patch.publicId = publicId.trim();
  }

  if (!Object.keys(patch).length) {
    return res.status(400).json({ error: 'NoUpdatesProvided', message: 'Provide at least one field to update.' });
  }

  try {
    const doc = await Asset.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return res.status(404).json({ error: 'AssetNotFound', message: 'Asset not found.' });
    }

    res.json({ item: doc.toJSON() });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'DuplicateAsset', message: 'An asset with the same label or URL already exists.' });
    }
    throw error;
  }
}

export async function deleteAsset(req, res) {
  const { id } = req.params;
  const item = await Asset.findByIdAndDelete(id);
  if (!item) {
    return res.status(404).json({ error: 'AssetNotFound', message: 'Asset not found.' });
  }
  res.json({ ok: true });
}
