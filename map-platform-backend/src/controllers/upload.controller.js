import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { configureCloudinary } from '../config/cloudinary.js';
import path from 'path';
import fs from 'fs';

const cloudinary = configureCloudinary();

// Create uploads_3D directory if it doesn't exist
const uploads3DDir = path.join(process.cwd(), 'uploads_3D');
if (!fs.existsSync(uploads3DDir)) {
  fs.mkdirSync(uploads3DDir, { recursive: true });
}

// Storage for 3D models (local filesystem)
const modelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploads3DDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname.replace(/\W+/g, '_')}`;
    cb(null, uniqueName);
  }
});

// Storage for images (Cloudinary)
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'map-platform',
    resource_type: 'image',
    public_id: `${Date.now()}_${file.originalname.replace(/\W+/g, '_')}`
  })
});

export const uploader = multer({ storage: imageStorage });

// 3D model uploader
export const modelUploader = multer({ 
  storage: modelStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.glb', '.gltf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only GLB and GLTF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

export const uploadSingle = (req, res) => {
  if (!req.file?.path) return res.status(400).json({ error: 'UploadFailed' });
  res.json({
    url: req.file.path,
    public_id: req.file.filename,
    bytes: req.file.size
  });
};

// Upload 3D model
export const upload3DModel = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Create a URL that can be accessed by the frontend
    const modelUrl = `/uploads_3D/${req.file.filename}`;
    
    res.json({
      url: modelUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path
    });
  } catch (error) {
    console.error('3D model upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
};

// Serve 3D model files
export const serve3DModel = (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploads3DDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Model not found' });
  }
  
  res.sendFile(filePath);
};
