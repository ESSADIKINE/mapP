import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import projectRoutes from './routes/project.routes.js';
import placeRoutes from './routes/place.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import routeRoutes from './routes/route.routes.js';

const app = express();

// Security & basics
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*'
  })
);
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 200
  })
);

// Health
app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Static file serving for 3D models
app.use('/uploads_3D', express.static(path.join(__dirname, '../uploads_3D')));

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/places', placeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/route', routeRoutes);

// Serve uploaded 3D models
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));
// backward compatibility for previous `/uploads_3D` paths
app.use('/uploads_3D', express.static(uploadsDir));

// Errors
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('💥', err);
  res.status(500).json({ error: 'ServerError', message: err.message });
});

// Boot
const PORT = process.env.PORT || 4000;

connectDB(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 API on http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error('DB connection failed:', e.message);
    process.exit(1);
  });
