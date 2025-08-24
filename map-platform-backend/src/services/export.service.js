import fs from 'fs';
import path from 'path';
import os from 'os';
import { Project } from '../models/Project.js';
import { decodePolyline } from '../utils/polyline.js';
import { slugify } from '../utils/slug.js';

/**
 * Export a project as a static bundle and stream as ZIP.
 * @param {string} projectId
 * @param {any} options
 * @param {import('express').Response} res
 */
export function buildExportData(doc, { styleURL, profiles = ['driving'] } = {}) {
  if (!doc) throw new Error('NotFound');
  if (!doc.principal) throw new Error('NoPrincipal');

  const principal = {
    id: String(doc.principal._id || 'principal'),
    name: doc.principal.name,
    lat: Number(doc.principal.latitude),
    lon: Number(doc.principal.longitude),
    heading: doc.principal.heading != null ? Number(doc.principal.heading) : null,
    zoom: doc.principal.zoom != null ? Number(doc.principal.zoom) : null,
    bounds: doc.principal.bounds || null,
    category: 'Principal',
    virtualtour: doc.principal.virtualtour || '',
    gallery: [],
    footerInfo: { location: doc.principal.footerInfo?.location || null }
  };

  const secondaries = (doc.secondaries || []).map((s) => {
    const routes = [];
    if (s.routesFromBase && s.routesFromBase.length) {
      const coords = decodePolyline(s.routesFromBase[0]);
      routes.push({
        profile: profiles[0] || 'driving',
        distance_m: null,
        duration_s: null,
        geometry: { type: 'LineString', coordinates: coords }
      });
    }
    return {
      id: String(s._id),
      name: s.name,
      category: s.category,
      lat: Number(s.latitude),
      lon: Number(s.longitude),
      virtualtour: s.virtualtour || null,
      gallery: [],
      footerInfo: {
        location: s.footerInfo?.location || null,
        distanceText: s.footerInfo?.distance || null,
        timeText: s.footerInfo?.time || null
      },
      routes
    };
  });

  return {
    project: {
      id: String(doc._id),
      title: doc.title,
      description: doc.description || '',
      styleURL: styleURL || doc.styleURL || 'https://demotiles.maplibre.org/style.json',
      logo: doc.logoUrl ? { src: doc.logoUrl, alt: 'Logo' } : null,
      units: 'metric'
    },
    principal,
    secondaries,
    generatedAt: new Date().toISOString(),
    generator: { name: 'ExportService', version: '1.0.0' }
  };
}

export async function exportProject(projectId, options, res) {
  const archiver = (await import('archiver')).default;
  const { inlineData = false, includeLocalLibs = true } = options || {};
  const doc = await Project.findById(projectId).lean();
  const data = buildExportData(doc, options);

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'export-'));
  const assetsDir = path.join(tmpDir, 'assets');
  await fs.promises.mkdir(path.join(assetsDir, 'js'), { recursive: true });
  await fs.promises.mkdir(path.join(assetsDir, 'css'), { recursive: true });

  if (!inlineData) {
    const dataDir = path.join(tmpDir, 'data');
    await fs.promises.mkdir(dataDir, { recursive: true });
    await fs.promises.writeFile(path.join(dataDir, 'project.json'), JSON.stringify(data, null, 2));
  }

  if (includeLocalLibs) {
    const libsDir = path.join(tmpDir, 'libs');
    await fs.promises.mkdir(libsDir, { recursive: true });
    const mljs = path.resolve('node_modules/maplibre-gl/dist/maplibre-gl.js');
    const mlcss = path.resolve('node_modules/maplibre-gl/dist/maplibre-gl.css');
    const pjs = path.resolve('node_modules/pannellum/build/pannellum.js');
    const pcss = path.resolve('node_modules/pannellum/build/pannellum.css');
    await fs.promises.copyFile(mljs, path.join(libsDir, 'maplibre-gl.js')).catch(()=>{});
    await fs.promises.copyFile(mlcss, path.join(libsDir, 'maplibre-gl.css')).catch(()=>{});
    await fs.promises.copyFile(pjs, path.join(libsDir, 'pannellum.js')).catch(()=>{});
    await fs.promises.copyFile(pcss, path.join(libsDir, 'pannellum.css')).catch(()=>{});
  }

  const mapTpl = await fs.promises.readFile(path.resolve('src/templates/map.html'), 'utf8');
  const libStyles = includeLocalLibs
    ? '<link rel="stylesheet" href="./libs/maplibre-gl.css" />\n  <link rel="stylesheet" href="./libs/pannellum.css" />'
    : '<link rel="stylesheet" href="https://unpkg.com/maplibre-gl/dist/maplibre-gl.css" />\n  <link rel="stylesheet" href="https://unpkg.com/pannellum/build/pannellum.css" />';
  const libScripts = includeLocalLibs
    ? '<script src="./libs/maplibre-gl.js"></script>\n  <script src="./libs/pannellum.js"></script>'
    : '<script src="https://unpkg.com/maplibre-gl/dist/maplibre-gl.js"></script>\n  <script src="https://unpkg.com/pannellum/build/pannellum.js"></script>';
  const inlineDataStr = inlineData ? `<script>window.__PROJECT__ = ${JSON.stringify(data)};</script>` : '';
  const html = mapTpl
    .replace('{{TITLE}}', data.project.title)
    .replace('{{LIB_STYLES}}', libStyles)
    .replace('{{LIB_SCRIPTS}}', libScripts)
    .replace('{{INLINE_DATA}}', inlineDataStr);
  await fs.promises.writeFile(path.join(tmpDir, 'map.html'), html, 'utf8');

  const appJs = await fs.promises.readFile(path.resolve('src/templates/app.js'), 'utf8');
  await fs.promises.writeFile(path.join(assetsDir, 'js', 'app.js'), appJs, 'utf8');
  const stylesCss = await fs.promises.readFile(path.resolve('src/templates/styles.css'), 'utf8');
  await fs.promises.writeFile(path.join(assetsDir, 'css', 'styles.css'), stylesCss, 'utf8');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => { throw err; });

  const slug = slugify(data.project.title || 'project');
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${slug}-${projectId}-${timestamp}.zip"`);

  archive.pipe(res);
  archive.directory(tmpDir, false);
  archive.finalize();

  archive.on('end', () => {
    fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(()=>{});
  });
}
