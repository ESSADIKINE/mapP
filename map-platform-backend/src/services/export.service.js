// src/services/export.service.js
import fs from 'fs';
import path from 'path';
import os from 'os';
import archiver from 'archiver';

import { Project } from '../models/Project.js';
import { decodePolyline } from '../utils/polyline.js';
import { slugify } from '../utils/slug.js';
import { download } from '../utils/download.js';

/**
 * Normalize the DB doc into the export JSON consumed by the static bundle.
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
      s.routesFromBase.forEach((poly, idx) => {
        const coords = decodePolyline(poly);
        routes.push({
          profile: profiles[idx] || profiles[0] || 'driving',
          distance_m: s.footerInfo?.distance ? parseInt(s.footerInfo.distance.replace(/\D/g, '')) : null,
          duration_s: s.footerInfo?.time ? parseInt(s.footerInfo.time.replace(/\D/g, '')) * 60 : null,
          geometry: { type: 'LineString', coordinates: coords }
        });
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
      styleURL: styleURL || 'satellite',
      logo: doc.logoUrl ? { src: doc.logoUrl, alt: 'Logo' } : null,
      units: 'metric'
    },
    principal,
    secondaries,
    generatedAt: new Date().toISOString(),
    generator: { name: 'ExportService', version: '1.0.0' }
  };
}

/**
 * Export a project as a static bundle and stream it as a ZIP file.
 * @param {string} projectId
 * @param {{ inlineData?: boolean, includeLocalLibs?: boolean, mirrorImagesLocally?: boolean, styleURL?: string, profiles?: string[] }} options
 * @param {import('express').Response} res
 */
export async function exportProject(projectId, options, res) {
  const { inlineData = false, includeLocalLibs = true, mirrorImagesLocally = true } = options || {};

  const doc = await Project.findById(projectId).lean();
  const data = buildExportData(doc, options);

  // temp dir
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'export-'));
  const assetsDir = path.join(tmpDir, 'assets');
  await fs.promises.mkdir(path.join(assetsDir, 'js'), { recursive: true });
  await fs.promises.mkdir(path.join(assetsDir, 'css'), { recursive: true });
  await fs.promises.mkdir(path.join(assetsDir, 'img'), { recursive: true });

  // logo asset handling
  if (data.project.logo?.src) {
    if (mirrorImagesLocally) {
      try {
        const url = data.project.logo.src;
        const ext = path.extname(new URL(url).pathname) || '.png';
        const dest = path.join(assetsDir, 'img', `logo${ext}`);
        await download(url, dest);
        data.project.logo.src = `./assets/img/logo${ext}`;
      } catch {
        // keep remote URL on failure
      }
    }
  }

  // data/project.json unless we inline
  if (!inlineData) {
    const dataDir = path.join(tmpDir, 'data');
    await fs.promises.mkdir(dataDir, { recursive: true });
    await fs.promises.writeFile(path.join(dataDir, 'project.json'), JSON.stringify(data, null, 2));
  }

  // local libs (MapLibre + Pannellum) when available; else we’ll fall back to CDN
  let libsAvailable = false;
  let libsDir = path.join(tmpDir, 'libs');
  if (includeLocalLibs) {
    try {
      const mljs = path.resolve('node_modules/maplibre-gl/dist/maplibre-gl.js');
      const mlcss = path.resolve('node_modules/maplibre-gl/dist/maplibre-gl.css');
      const pjs = path.resolve('node_modules/pannellum/build/pannellum.js');
      const pcss = path.resolve('node_modules/pannellum/build/pannellum.css');

      const hasAll =
        [mljs, mlcss, pjs, pcss].every((p) => fs.existsSync(p));
      if (hasAll) {
        await fs.promises.mkdir(libsDir, { recursive: true });
        await fs.promises.copyFile(mljs, path.join(libsDir, 'maplibre-gl.js'));
        await fs.promises.copyFile(mlcss, path.join(libsDir, 'maplibre-gl.css'));
        await fs.promises.copyFile(pjs, path.join(libsDir, 'pannellum.js'));
        await fs.promises.copyFile(pcss, path.join(libsDir, 'pannellum.css'));
        libsAvailable = true;
      }
    } catch {
      libsAvailable = false;
    }
  }

  // templates
  const mapTpl = await fs.promises.readFile(path.resolve('src/templates/map.html'), 'utf8');
  const appJs = await fs.promises.readFile(path.resolve('src/templates/app.js'), 'utf8');
  const stylesCss = await fs.promises.readFile(path.resolve('src/templates/styles.css'), 'utf8');

  const libStyles = libsAvailable
    ? `<link rel="stylesheet" href="./libs/maplibre-gl.css" />
  <link rel="stylesheet" href="./libs/pannellum.css" />`
    : `<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css" />`;

  const libScripts = libsAvailable
    ? `<script src="./libs/maplibre-gl.js"></script>
  <script src="./libs/pannellum.js"></script>`
    : `<script src="https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"></script>`;

  const inlineDataStr = inlineData
    ? `<script>window.__PROJECT__ = ${JSON.stringify(data)};</script>`
    : '';

  const logoHtml = data.project.logo?.src
    ? `<img src="${data.project.logo.src}" alt="${data.project.title}" class="logo-img" /> <span class="logo-text">${data.project.title}</span>`
    : `<span class="logo-text">${data.project.title}</span>`;

  const html = mapTpl
    .replace('{{TITLE}}', data.project.title)
    .replace('{{LIB_STYLES}}', libStyles)
    .replace('{{LIB_SCRIPTS}}', libScripts)
    .replace('{{INLINE_DATA}}', inlineDataStr)
    .replace('{{HEADER_LOGO}}', logoHtml);

  await fs.promises.writeFile(path.join(tmpDir, 'map.html'), html, 'utf8');
  await fs.promises.writeFile(path.join(assetsDir, 'js', 'app.js'), appJs, 'utf8');
  await fs.promises.writeFile(path.join(assetsDir, 'css', 'styles.css'), stylesCss, 'utf8');

  // stream ZIP
  const slug = slugify(data.project.title || 'project');
  const ts = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];

  res.status(200);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${slug}-${projectId}-${ts}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('warning', (err) => {
    // non-fatal warnings
    console.warn('archiver warning:', err);
  });

  archive.on('error', (err) => {
    console.error('archiver error:', err);
    try { res.status(500).end('Export failed'); } catch {}
  });

  // cleanup after the response ends
  res.on('close', () => {
    fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });
  res.on('finish', () => {
    fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  archive.pipe(res);
  archive.directory(tmpDir, false);
  archive.finalize();
}
