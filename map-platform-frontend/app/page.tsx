'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import classNames from 'classnames';
import { create } from 'zustand';
import { useDroppable, DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDropzone } from 'react-dropzone';

// MapLibre needs window -> use dynamic import to avoid SSR issues
const MapLibreGL = dynamic(() => import('maplibre-gl'), { ssr: false });

// Pannellum is browser-only; we lazy-load it
const ReactPannellum = dynamic(() => import('react-pannellum'), { ssr: false });

// ────────────────────────────────────────────────────────────────────────────────
// Types

/** @typedef {{
 *  _id?: string,
 *  name: string,
 *  latitude: number,
 *  longitude: number,
 *  virtualtour?: string,
 *  zoom?: number,
 *  bounds?: number[][],
 *  heading?: number,
 *  category: 'Principal' | 'Secondary' | 'Other',
 *  routesFromBase?: string[],
 *  footerInfo?: { location?: string, distance?: string, time?: string }
 * }} Place
 */

/** @typedef {{
 *  _id?: string,
 *  title: string,
 *  logoUrl?: string,
 *  description?: string,
 *  principal: Place,
 *  secondaries: Place[]
 * }} Project
 */

// ────────────────────────────────────────────────────────────────────────────────
// Simple store with Zustand

const useStudio = create((set, get) => ({
  backend: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000',
  mapStyle: process.env.NEXT_PUBLIC_MAP_STYLE || 'https://demotiles.maplibre.org/style.json',

  project: /** @type {Project} */ ({
    title: 'Untitled Project',
    description: 'Describe your project…',
    logoUrl: '',
    principal: {
      name: 'Residence',
      latitude: 28.555784441511065,
      longitude: 77.08697067257833,
      category: 'Principal',
      zoom: 16.4,
      heading: 0,
      footerInfo: { location: 'Oulfa' }
    },
    secondaries: []
  }),

  map: /** @type {import('maplibre-gl') | null} */ (null),
  mapInstance: /** @type {import('maplibre-gl').Map | null} */ (null),
  routeLayers: new Set(),

  setProject: (p) => set({ project: p }),
  updateProject: (patch) => set({ project: { ...get().project, ...patch } }),
  setMapLib: (lib) => set({ map: lib }),
  setMapInstance: (m) => set({ mapInstance: m }),
  addSecondary: (place) => set({ project: { ...get().project, secondaries: [...get().project.secondaries, place] } }),
  reorderSecondaries: (from, to) => {
    const s = [...get().project.secondaries];
    const newOrder = arrayMove(s, from, to);
    set({ project: { ...get().project, secondaries: newOrder } });
  },
  replaceSecondary: (idx, patch) => {
    const s = [...get().project.secondaries];
    s[idx] = { ...s[idx], ...patch };
    set({ project: { ...get().project, secondaries: s } });
  }
}));

// ────────────────────────────────────────────────────────────────────────────────
// Helpers

function prettyLatLng(lat, lng) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

async function uploadImage(file) {
  const backend = useStudio.getState().backend;
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${backend}/api/upload`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Upload failed');
  return res.json(); // {url, public_id, bytes}
}

async function saveProject(project) {
  const backend = useStudio.getState().backend;
  const res = await fetch(`${backend}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project)
  });
  if (!res.ok) throw new Error('Save failed');
  return res.json();
}

async function computeRoute(projectId, placeId) {
  const backend = useStudio.getState().backend;
  const res = await fetch(`${backend}/api/projects/${projectId}/places/${placeId}/route`, { method: 'POST' });
  if (!res.ok) throw new Error('Route failed');
  return res.json(); // {encoded, distance_m, duration_s, pretty}
}

// Decode polyline to GeoJSON LineString
function decodePolylineToGeoJSON(maplibregl, encoded) {
  // dynamic import polyline to avoid SSR issues in this single file
  // For simplicity, use a lightweight decoder here (MapLibre doesn't ship one)
  function decode(str) {
    let index = 0, lat = 0, lng = 0, coordinates = [];
    while (index < str.length) {
      let b, shift = 0, result = 0;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      shift = 0; result = 0;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      coordinates.push([lng * 1e-5, lat * 1e-5]);
    }
    return coordinates;
  }

  const coords = decode(encoded);
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: {}
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// Drag & Drop building blocks

function SortableItem({ id, index, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={classNames('rounded-2xl border mb-2 p-3 bg-white shadow-sm cursor-grab active:cursor-grabbing', {
        'opacity-70 ring-2 ring-indigo-500': isDragging
      })}
    >
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Dropzone for images

function ImageDrop({ label, onUploaded, previewUrl }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: { 'image/*': [] },
    onDropAccepted: async (files) => {
      const file = files[0];
      const res = await uploadImage(file);
      onUploaded(res.url);
    }
  });

  return (
    <div {...getRootProps()} className={classNames('border-2 border-dashed rounded-2xl p-4 text-center', {
      'border-indigo-500 bg-indigo-50': isDragActive,
      'border-gray-300': !isDragActive
    })}>
      <input {...getInputProps()} />
      <p className="text-sm text-gray-600">{label} – drag & drop or click to select</p>
      {previewUrl && (
        <img src={previewUrl} alt="preview" className="mx-auto mt-3 max-h-36 rounded-xl shadow" />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// 360° Modal

function Modal({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-[90vw] h-[80vh] rounded-2xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="px-3 py-1 rounded-lg bg-gray-900 text-white" onClick={onClose}>Close</button>
        </div>
        <div className="w-full h-[calc(80vh-56px)]">{children}</div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Map Canvas

function MapCanvas() {
  const { mapStyle, map: maplibregl, setMapLib, mapInstance, setMapInstance, project, replaceSecondary } = useStudio();
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // load MapLibre GL class
    (async () => {
      const lib = (await import('maplibre-gl')).default;
      setMapLib(lib);
    })();
  }, [setMapLib]);

  useEffect(() => {
    if (!maplibregl || mapInstance) return;
    const m = new maplibregl.Map({
      container: mapRef.current,
      style: mapStyle,
      center: [project.principal.longitude, project.principal.latitude],
      zoom: project.principal.zoom || 14
    });
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));

    m.on('load', () => setReady(true));

    // Click to add secondary
    m.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      const name = `Place ${project.secondaries.length + 1}`;
      useStudio.getState().addSecondary({
        name,
        latitude: lat,
        longitude: lng,
        category: 'Secondary',
        footerInfo: { location: 'New' }
      });
    });

    setMapInstance(m);
    return () => m.remove();
  }, [maplibregl, mapInstance, mapStyle, project.principal, project.secondaries.length, setMapInstance]);

  // draw markers & routes on updates
  useEffect(() => {
    if (!ready || !mapInstance || !maplibregl) return;

    // Clean previous markers
    if (!mapInstance.__markers) mapInstance.__markers = [];
    mapInstance.__markers.forEach((mk) => mk.remove());
    mapInstance.__markers = [];

    // Principal marker
    const p = project.principal;
    const pm = new maplibregl.Marker({ color: '#111827' })
      .setLngLat([p.longitude, p.latitude])
      .setPopup(new maplibregl.Popup().setHTML(`<div class="text-sm"><b>${p.name}</b><br/>${prettyLatLng(p.latitude, p.longitude)}</div>`))
      .addTo(mapInstance);
    mapInstance.__markers.push(pm);

    // Secondary markers
    project.secondaries.forEach((s, idx) => {
      const mk = new maplibregl.Marker({ color: '#2563eb' })
        .setLngLat([s.longitude, s.latitude])
        .setPopup(new maplibregl.Popup().setHTML(`
          <div class="text-sm">
            <b>${s.name}</b><br/>${prettyLatLng(s.latitude, s.longitude)}<br/>
            ${s.footerInfo?.distance ? `Distance: ${s.footerInfo.distance}<br/>` : ''}
            ${s.footerInfo?.time ? `Time: ${s.footerInfo.time}` : ''}
          </div>`))
        .addTo(mapInstance);
      mapInstance.__markers.push(mk);
    });

    // Routes: remove existing layers
    const routeIds = (mapInstance.__routeIds || []);
    routeIds.forEach((id) => {
      if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
      if (mapInstance.getSource(id)) mapInstance.removeSource(id);
    });
    mapInstance.__routeIds = [];

    // Draw routes if present
    project.secondaries.forEach((s, idx) => {
      const encoded = s.routesFromBase?.[0];
      if (!encoded) return;
      const feature = decodePolylineToGeoJSON(maplibregl, encoded);
      const id = `route-${idx}`;
      if (!mapInstance.getSource(id)) {
        mapInstance.addSource(id, { type: 'geojson', data: feature });
        mapInstance.addLayer({
          id,
          type: 'line',
          source: id,
          paint: { 'line-width': 4, 'line-color': '#10b981' }
        });
        mapInstance.__routeIds.push(id);
      }
    });
  }, [project, mapInstance, maplibregl, ready]);

  return <div ref={mapRef} className="w-full h-full rounded-2xl overflow-hidden bg-gray-200" />;
}

// ────────────────────────────────────────────────────────────────────────────────
// Secondary Place Card (sortable)

function SecondaryCard({ place, index, projectId }) {
  const { replaceSecondary, project } = useStudio();
  const [open360, setOpen360] = useState(false);
  const id = `sec-${index}`;

  // When we "compute route", we must have IDs — in this demo we fake IDs by saving once
  async function onComputeRoute() {
    try {
      // If project has no _id yet, save it first
      let pid = project._id;
      if (!pid) {
        const saved = await saveProject(project);
        useStudio.getState().setProject(saved);
        pid = saved._id;
      }
      // Ensure secondary place has an _id (after a save)
      const updatedProject = useStudio.getState().project;
      const refreshedPlace = updatedProject.secondaries[index];
      const placeId = refreshedPlace._id;

      const r = await computeRoute(pid, placeId);
      // attach pretty metrics
      replaceSecondary(index, {
        routesFromBase: [r.encoded],
        footerInfo: { ...(refreshedPlace.footerInfo || {}), ...r.pretty }
      });
    } catch (e) {
      alert('Routing failed: ' + e.message);
    }
  }

  // upload 360
  async function onUpload360(file) {
    try {
      const res = await uploadImage(file);
      replaceSecondary(index, { virtualtour: res.url });
    } catch (e) {
      alert('Upload failed');
    }
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={classNames('p-3 bg-white rounded-2xl border shadow-sm', { 'opacity-70 ring-2 ring-indigo-500': isDragging })}
    >
      <div className="flex items-center justify-between">
        <input
          className="text-sm font-semibold bg-transparent outline-none"
          value={place.name}
          onChange={(e) => replaceSecondary(index, { name: e.target.value })}
        />
        <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">Secondary</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
        <label className="col-span-1">Lat
          <input type="number" className="w-full mt-1 rounded-lg border p-1"
                 value={place.latitude}
                 onChange={(e) => replaceSecondary(index, { latitude: parseFloat(e.target.value) })} />
        </label>
        <label className="col-span-1">Lng
          <input type="number" className="w-full mt-1 rounded-lg border p-1"
                 value={place.longitude}
                 onChange={(e) => replaceSecondary(index, { longitude: parseFloat(e.target.value) })} />
        </label>
      </div>

      <div className="mt-3">
        <ImageDrop
          label="Upload 360° image for this place"
          previewUrl={place.virtualtour}
          onUploaded={(url) => replaceSecondary(index, { virtualtour: url })}
        />
      </div>

      <div className="flex gap-2 mt-3">
        <button className="px-3 py-1 rounded-lg bg-emerald-600 text-white" onClick={() => setOpen360(true)} disabled={!place.virtualtour}>View 360°</button>
        <button className="px-3 py-1 rounded-lg bg-indigo-600 text-white" onClick={onComputeRoute}>Route</button>
      </div>

      {(place.footerInfo?.distance || place.footerInfo?.time) && (
        <div className="mt-2 text-xs text-gray-700">
          {place.footerInfo?.distance && <div>Distance: {place.footerInfo.distance}</div>}
          {place.footerInfo?.time && <div>Time: {place.footerInfo.time}</div>}
        </div>
      )}

      <Modal open={open360} onClose={() => setOpen360(false)} title={`${place.name} – 360°`}>
        {place.virtualtour ? (
          <ReactPannellum
            id={`pano-${index}`}
            sceneId={`scene-${index}`}
            imageSource={place.virtualtour}
            autoLoad
            width="100%"
            height="100%"
            hfov={100}
            showControls
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-gray-500">No 360 image yet</div>
        )}
      </Modal>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Page

export default function MappingStudio() {
  const { project, updateProject, reorderSecondaries } = useStudio();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  async function onSave() {
    try {
      const saved = await saveProject(project);
      useStudio.getState().setProject(saved);
      alert('Saved!');
    } catch (e) {
      alert('Save failed: ' + e.message);
    }
  }

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = parseInt(String(active.id).replace('sec-', ''), 10);
    const to = parseInt(String(over.id).replace('sec-', ''), 10);
    reorderSecondaries(from, to);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <LogoUploader />
          <div className="flex-1">
            <input
              className="text-xl font-semibold bg-transparent outline-none w-full"
              value={project.title}
              onChange={(e) => updateProject({ title: e.target.value })}
            />
            <input
              className="text-sm text-gray-600 bg-transparent outline-none w-full"
              placeholder="Description"
              value={project.description || ''}
              onChange={(e) => updateProject({ description: e.target.value })} />
          </div>
          <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white" onClick={onSave}>Save</button>
          <button className="px-4 py-2 rounded-xl bg-gray-900 text-white" onClick={() => alert('Export flow handled in Next.js build step')}>Export</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-1 space-y-4">
          <div className="p-4 bg-white rounded-2xl border shadow-sm">
            <h2 className="font-semibold">Principal Place</h2>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <label className="col-span-1">Name
                <input className="w-full mt-1 rounded-lg border p-1" value={project.principal.name}
                       onChange={(e) => updateProject({ principal: { ...project.principal, name: e.target.value } })} />
              </label>
              <span className="col-span-1 text-xs self-end justify-self-end px-2 py-1 rounded-full bg-zinc-100">Principal</span>
              <label className="col-span-1">Lat
                <input type="number" className="w-full mt-1 rounded-lg border p-1" value={project.principal.latitude}
                       onChange={(e) => updateProject({ principal: { ...project.principal, latitude: parseFloat(e.target.value) } })} />
              </label>
              <label className="col-span-1">Lng
                <input type="number" className="w-full mt-1 rounded-lg border p-1" value={project.principal.longitude}
                       onChange={(e) => updateProject({ principal: { ...project.principal, longitude: parseFloat(e.target.value) } })} />
              </label>
            </div>
            <div className="mt-3">
              <ImageDrop
                label="Upload principal 360° / hero image (optional)"
                previewUrl={project.principal.virtualtour}
                onUploaded={(url) => updateProject({ principal: { ...project.principal, virtualtour: url } })}
              />
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Secondary Places</h2>
              <button
                className="px-3 py-1 rounded-lg bg-emerald-600 text-white"
                onClick={() => useStudio.getState().addSecondary({ name: `Place ${project.secondaries.length + 1}`, latitude: project.principal.latitude, longitude: project.principal.longitude, category: 'Secondary', footerInfo: { location: 'Near' } })}
              >Add</button>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={project.secondaries.map((_, i) => `sec-${i}`)} strategy={verticalListSortingStrategy}>
                <div className="mt-3">
                  {project.secondaries.map((s, i) => (
                    <SortableItem id={`sec-${i}`} key={`sec-${i}`} index={i}>
                      <SecondaryCard place={s} index={i} projectId={project._id} />
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </section>

        <section className="lg:col-span-2">
          <div className="p-2 bg-white rounded-2xl border shadow-sm h-[75vh]">
            <MapCanvas />
          </div>
          <p className="text-xs text-gray-500 mt-2">Tip: Click on the map to add a new secondary marker at that location.</p>
        </section>
      </main>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Logo uploader

function LogoUploader() {
  const { project, updateProject } = useStudio();
  const onDrop = useDropzone({
    multiple: false,
    accept: { 'image/*': [] },
    onDropAccepted: async (files) => {
      const res = await uploadImage(files[0]);
      updateProject({ logoUrl: res.url });
    }
  });

  return (
    <div {...onDrop.getRootProps()} className="w-12 h-12 rounded-xl border-2 border-dashed overflow-hidden grid place-items-center cursor-pointer">
      <input {...onDrop.getInputProps()} />
      {project.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={project.logoUrl} alt="logo" className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs text-gray-500">Logo</span>
      )}
    </div>
  );
} 