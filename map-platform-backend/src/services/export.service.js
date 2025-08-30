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
    media: doc.principal.virtualtour
      ? { type: 'panorama', panoramaUrl: doc.principal.virtualtour }
      : { type: 'tour', tourUrl: doc.principal.tourUrl },
    model3d: doc.principal.model3d
      ? {
          url: doc.principal.model3d.url,
          useAsMarker: !!doc.principal.model3d.useAsMarker,
          scale: doc.principal.model3d.scale ?? 1,
          rotation: doc.principal.model3d.rotation || [0, 0, 0],
          altitude: doc.principal.model3d.altitude ?? 0
        }
      : null,
    gallery: [],
    footerInfo: { location: doc.principal.footerInfo?.location || null }
  };

  const secondaries = (doc.secondaries || []).map((s) => {
    const routes = [];
    if (s.routesFromBase && s.routesFromBase.length) {
      s.routesFromBase.forEach((poly, idx) => {
        const coords = decodePolyline(poly);
        if (coords.length < 2) return;
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
      media: s.virtualtour
        ? { type: 'panorama', panoramaUrl: s.virtualtour }
        : { type: 'tour', tourUrl: s.tourUrl },
      model3d: s.model3d
        ? {
            url: s.model3d.url,
            useAsMarker: !!s.model3d.useAsMarker,
            scale: s.model3d.scale ?? 1,
            rotation: s.model3d.rotation || [0, 0, 0],
            altitude: s.model3d.altitude ?? 0
          }
        : null,
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
      styleURL: doc.styleURL || styleURL || 'satellite',
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
 * @param {{ inlineData?: boolean, includeLocalLibs?: boolean, inlineAssets?: boolean, styleURL?: string, profiles?: string[] }} options
 *  inlineData defaults to true to embed project data and avoid file:// CORS issues.
 * @param {import('express').Response} res
 */
export async function exportProject(projectId, options, res) {
  const { inlineData = true, includeLocalLibs = true, inlineAssets = true } = options || {};

  const doc = await Project.findById(projectId).lean();
  const data = buildExportData(doc, options);
  const hasModels =
    !!data.principal.model3d || data.secondaries.some((s) => s.model3d);

  // temp dir
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'export-'));
  const assetsDir = path.join(tmpDir, 'assets');
  const imagesDir = path.join(tmpDir, 'images');
  await fs.promises.mkdir(path.join(assetsDir, 'js'), { recursive: true });
  await fs.promises.mkdir(path.join(assetsDir, 'css'), { recursive: true });
  await fs.promises.mkdir(imagesDir, { recursive: true });
  const modelsDir = path.join(assetsDir, 'models');
  if (hasModels) await fs.promises.mkdir(modelsDir, { recursive: true });

  // logo asset handling with optional retina variant
  if (data.project.logo?.src) {
    if (inlineAssets) {
      try {
        const url = data.project.logo.src;
        const ext = path.extname(new URL(url).pathname) || '.png';
        const dest = path.join(imagesDir, `logo${ext}`);
        await download(url, dest);
        data.project.logo.src = `./images/logo${ext}`;
        try {
          const retinaUrl = url.replace(ext, `@2x${ext}`);
          const retinaDest = path.join(imagesDir, `logo@2x${ext}`);
          await download(retinaUrl, retinaDest);
          data.project.logo.srcset = `${data.project.logo.src} 1x, ./images/logo@2x${ext} 2x`;
        } catch {
          data.project.logo.srcset = `${data.project.logo.src} 1x`;
        }
      } catch {
        // keep remote URL on failure
        data.project.logo.srcset = `${data.project.logo.src} 1x`;
      }
    } else {
      data.project.logo.srcset = `${data.project.logo.src} 1x`;
    }
  }

  // model asset handling
  if (hasModels && inlineAssets) {
    const processPlace = async (p) => {
      if (p.model3d?.url) {
        try {
          const url = p.model3d.url;
          const ext = path.extname(new URL(url).pathname) || '.glb';
          const destName = `${slugify(p.id || p.name)}${ext}`;
          const dest = path.join(modelsDir, destName);
          await download(url, dest);
          p.model3d.url = `./assets/models/${destName}`;
        } catch {
          // keep remote URL if download fails
        }
      }
    };
    await processPlace(data.principal);
    for (const s of data.secondaries) await processPlace(s);
  }

  // panorama asset handling - keep Cloudinary URLs for 360° images
  // Only download and localize logo, keep 360° images on Cloudinary
  // This prevents CORS issues when opening the exported file locally
  // The 360° images will be loaded directly from Cloudinary URLs
  // which are accessible from any origin and don't require local file access

  // data/project.json unless we inline
  if (!inlineData) {
    const dataDir = path.join(tmpDir, 'data');
    await fs.promises.mkdir(dataDir, { recursive: true });
    await fs.promises.writeFile(path.join(dataDir, 'project.json'), JSON.stringify(data, null, 2));
  }

  // local libs (MapLibre + Pannellum) when available; else we’ll fall back to CDN
  let libsAvailable = false;
  let libsDir = path.join(tmpDir, 'libs');
  if (inlineAssets && includeLocalLibs) {
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
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css" />
  <style>
    .pannellum-container { width: 100% !important; height: 100% !important; }
    .pannellum-container canvas { border-radius: 10px !important; }
    .pannellum-container .pnlm-controls-container { border-radius: 10px; }
    .pannellum-container .pnlm-controls { z-index: 1000; }
  </style>`;

  let libScripts = libsAvailable
    ? `<script src="./libs/maplibre-gl.js"></script>
  <script>window.PANNELLUM_SRC='./libs/pannellum.js';</script>`
    : `<script src="https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.js"></script>
  <script>window.PANNELLUM_SRC='https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';</script>`;

  if (hasModels) {
    if (inlineAssets && includeLocalLibs) {
      try {
        const threeJs = path.resolve('node_modules/three/build/three.min.js');
        const gltfLoader = path.resolve('node_modules/three/examples/js/loaders/GLTFLoader.js');
        const dracoLoader = path.resolve('node_modules/three/examples/js/loaders/DRACOLoader.js');
        const dracoDirSrc = path.resolve('node_modules/three/examples/js/libs/draco');
        const hasAll = [threeJs, gltfLoader, dracoLoader].every((p) => fs.existsSync(p));
        if (hasAll && fs.existsSync(dracoDirSrc)) {
          await fs.promises.copyFile(threeJs, path.join(libsDir, 'three.min.js'));
          await fs.promises.copyFile(gltfLoader, path.join(libsDir, 'GLTFLoader.js'));
          await fs.promises.copyFile(dracoLoader, path.join(libsDir, 'DRACOLoader.js'));
          const dracoDest = path.join(libsDir, 'draco');
          await fs.promises.mkdir(dracoDest, { recursive: true });
          for (const f of await fs.promises.readdir(dracoDirSrc)) {
            await fs.promises.copyFile(path.join(dracoDirSrc, f), path.join(dracoDest, f));
          }
          libScripts += `\n<script>window.THREE_SRC='./libs'; window.DRACO_DECODER_PATH='./libs/draco/';</script>`;
        } else {
          libScripts += `\n<script>window.THREE_SRC='https://unpkg.com/three@0.155.0'; window.DRACO_DECODER_PATH='https://unpkg.com/three@0.155.0/examples/js/libs/draco/';</script>`;
        }
      } catch {
        libScripts += `\n<script>window.THREE_SRC='https://unpkg.com/three@0.155.0'; window.DRACO_DECODER_PATH='https://unpkg.com/three@0.155.0/examples/js/libs/draco/';</script>`;
      }
    } else {
      libScripts += `\n<script>window.THREE_SRC='https://unpkg.com/three@0.155.0'; window.DRACO_DECODER_PATH='https://unpkg.com/three@0.155.0/examples/js/libs/draco/';</script>`;
    }
  }

  const inlineDataStr = inlineData
    ? `<script>window.__PROJECT__ = ${JSON.stringify(data)};</script>`
    : '';

  const srcsetAttr = data.project.logo?.srcset
    ? ` srcset="${data.project.logo.srcset}"`
    : '';
  const logoHtml = data.project.logo?.src
    ? `<img src="${data.project.logo.src}"${srcsetAttr} alt="${data.project.title}" class="logo-img" />`
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
