import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { configureCloudinary } from '../config/cloudinary.js';

const cloudinary = configureCloudinary();

// Storage for images (Cloudinary only)
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'map-platform/places',
    resource_type: 'image',
    public_id: `${Date.now()}_${file.originalname.replace(/\W+/g, '_')}`
  })
});

export const uploader = multer({ storage: imageStorage });

export const uploadSingle = (req, res) => {
  if (!req.file?.path) return res.status(400).json({ error: 'UploadFailed' });
  res.json({
    url: req.file.path,
    public_id: req.file.filename,
    bytes: req.file.size
  });
};
