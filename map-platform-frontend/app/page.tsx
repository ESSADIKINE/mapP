'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import classNames from 'classnames';
import { create } from 'zustand';
import { useDroppable, DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDropzone } from 'react-dropzone';
import { getRoute, formatKm, formatHhMm } from '@/lib/osrm';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const DEFAULT_MODEL_URL = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

// Available 3D models for selection
const AVAILABLE_MODELS = [
  { name: 'Astronaut', url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb' },
  { name: 'Duck', url: 'https://modelviewer.dev/shared-assets/models/Duck.glb' },
  { name: 'Horse', url: 'https://modelviewer.dev/shared-assets/models/Horse.glb' },
  { name: 'Cesium Air', url: 'https://modelviewer.dev/shared-assets/models/CesiumAir/CesiumAir.glb' },
  { name: 'Cesium Balloon', url: 'https://modelviewer.dev/shared-assets/models/CesiumBalloon/CesiumBalloon.glb' },
  { name: 'Cesium Ground Station', url: 'https://modelviewer.dev/shared-assets/models/CesiumGroundStation/CesiumGroundStation.glb' },
  { name: 'Cesium Milk Truck', url: 'https://modelviewer.dev/shared-assets/models/CesiumMilkTruck/CesiumMilkTruck.glb' },
  { name: 'Cesium Man', url: 'https://modelviewer.dev/shared-assets/models/CesiumMan/CesiumMan.glb' }
];

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
 *  tourUrl?: string,
 *  modelUrl?: string,
 *  modelPosition?: { x: number, y: number, z: number },
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
 *  styleURL?: string,
 *  principal: Place,
 *  secondaries: Place[]
 * }} Project
 */

// ────────────────────────────────────────────────────────────────────────────────
// Simple store with Zustand

const useStudio = create((set, get) => ({
  backend: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000',

  project: /** @type {Project} */ ({
    title: 'Untitled Project',
    description: 'Describe your project…',
    styleURL: '',
    logoUrl: '',
    principal: {
      name: 'Residence',
      latitude: 33.529234683566955,
      longitude: -7.685066910530196,
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
  hoveredPlaceId: /** @type {string | null} */ (null),
  selectedPlaceId: /** @type {string | null} */ (null),

  setProject: (p) => set({ project: p }),
  updateProject: (patch) => set({ project: { ...get().project, ...patch } }),
  setMapLib: (lib) => {
    console.log('Setting MapLibre library:', lib);
    set({ map: lib });
  },
  setMapInstance: (m) => {
    console.log('Setting map instance:', m);
    set({ mapInstance: m });
  },
  setHoveredPlace: (id) => set({ hoveredPlaceId: id }),
  setSelectedPlace: (id) => set({ selectedPlaceId: id }),
  addSecondary: (place) => set({
    project: {
      ...get().project,
      secondaries: [...get().project.secondaries, {
        ...place,
        _id: place._id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }]
    }
  }),
  reorderSecondaries: (from, to) => {
    const s = [...get().project.secondaries];
    const newOrder = arrayMove(s, from, to);
    set({ project: { ...get().project, secondaries: newOrder } });
  },
  replaceSecondary: (idx, patch) => {
    const s = [...get().project.secondaries];
    s[idx] = { ...s[idx], ...patch };
    set({ project: { ...get().project, secondaries: s } });
  },
  removeSecondary: (idx) => {
    const s = [...get().project.secondaries];
    s.splice(idx, 1);
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
  
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${backend}/api/upload`, { method: 'POST', body: fd });
    
    if (!res.ok) {
      // If backend is not available, create a mock upload response
      console.warn('Backend not available, using mock upload response');
      return {
        url: URL.createObjectURL(file),
        public_id: `mock-${Date.now()}`,
        bytes: file.size
      };
    }
    
    return res.json(); // {url, public_id, bytes}
  } catch (error) {
    // Network error or backend not running
    console.warn('Backend connection failed, using mock upload response:', error.message);
    return {
      url: URL.createObjectURL(file),
      public_id: `mock-${Date.now()}`,
      bytes: file.size
    };
  }
}

async function upload3DModel(file) {
  const backend = useStudio.getState().backend;

  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${backend}/api/upload/3d-model`, { method: 'POST', body: fd });

    if (!res.ok) {
      throw new Error('3D model upload failed');
    }

    const result = await res.json();
    const relativeUrl = result.path || result.url;
    result.url = `${backend}${result.url}`; // absolute for immediate use
    result.relativeUrl = relativeUrl; // store relative path for DB
    return result;
  } catch (error) {
    // Network error or backend not running — fallback to mock response
    console.warn('3D model upload failed, using mock response:', error.message);
    return {
      url: URL.createObjectURL(file),
      public_id: `mock-3d-${Date.now()}`,
      bytes: file.size,
      relativeUrl: null
    };
  }
}

/**
 * Remove empty-string fields that fail backend validation.
 * Ensures optional URLs are omitted when not provided.
 * @param {Project} project
 */
function sanitizeProject(project) {
  const cleanPlace = (p) => {
    const { modelUrl, modelPath, ...rest } = p;
    return {
      ...rest,
      virtualtour: p.virtualtour || undefined,
      tourUrl: p.tourUrl || undefined,
      model3d: modelPath ? { url: modelPath } : p.model3d || undefined
    };
  };

  return {
    ...project,
    logoUrl: project.logoUrl || undefined,
    styleURL: project.styleURL || undefined,
    principal: cleanPlace(project.principal),
    secondaries: project.secondaries.map(cleanPlace)
  };
}

async function saveProject(project) {
  const backend = useStudio.getState().backend;

  try {
    const payload = sanitizeProject(project);
    const res = await fetch(`${backend}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      // If backend is not available, create a mock response
      console.warn('Backend not available, using mock response');
      const mockId = `mock-${Date.now()}`;
      return {
        _id: mockId,
        ...project,
        // Assign IDs to secondary places if they don't have them
        secondaries: project.secondaries.map((place, index) => ({
          ...place,
          _id: place._id || `place-${mockId}-${index}`
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    
    const saved = await res.json();
    const mapPlace = (p) => ({
      ...p,
      modelUrl: p.model3d?.url ? `${backend}${p.model3d.url.replace(/^\./, '')}` : undefined,
      modelPath: p.model3d?.url
    });
    return {
      ...saved,
      principal: mapPlace(saved.principal),
      secondaries: saved.secondaries.map(mapPlace)
    };
  } catch (error) {
    // Network error or backend not running
    console.warn('Backend connection failed, using mock response:', error.message);
    const mockId = `mock-${Date.now()}`;
    return {
      _id: mockId,
      ...project,
      // Assign IDs to secondary places if they don't have them
      secondaries: project.secondaries.map((place, index) => ({
        ...place,
        _id: place._id || `place-${mockId}-${index}`
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

async function computeRoute(projectId, placeId) {
  const backend = useStudio.getState().backend;
  
  try {
    // First try backend
    const res = await fetch(`${backend}/api/projects/${projectId}/places/${placeId}/route`, { method: 'POST' });
    
    if (res.ok) {
      return res.json(); // {encoded, distance_m, duration_s, pretty}
    }
    
    // Fallback to OSRM for real road routing
    console.log('Backend not available, using OSRM for real road routing');

    const project = useStudio.getState().project;
    const secondaryPlace = project.secondaries.find(p => p._id === placeId || p.name.includes('Place'));

    if (!secondaryPlace) {
      throw new Error('Secondary place not found');
    }

    const coords = [
      [project.principal.longitude, project.principal.latitude],
      [secondaryPlace.longitude, secondaryPlace.latitude]
    ];

    const { geometry, distanceMeters, durationSeconds } = await getRoute({ coords, profile: 'driving' });
    const polyline = encodePolyline(geometry.coordinates);

    return {
      encoded: polyline,
      distance_m: Math.round(distanceMeters),
      duration_s: Math.round(durationSeconds),
      pretty: {
        distance: formatKm(distanceMeters),
        time: formatHhMm(durationSeconds)
      },
      geojson: { type: 'Feature', properties: {}, geometry }
    };
    
  } catch (error) {
    console.warn('Routing failed, using mock route:', error.message);
    
    // Fallback to mock routing
    const project = useStudio.getState().project;
    const secondaryPlace = project.secondaries.find(p => p._id === placeId || p.name.includes('Place'));
    
    if (secondaryPlace) {
      return generateSCurveRoute(project.principal, secondaryPlace);
    }
    
    // Final fallback
    return {
      encoded: 'mock-route-encoded-string',
      distance_m: 1500,
      duration_s: 300,
      pretty: {
        distance: '1.5 km',
        time: '5 min'
      }
    };
  }
}

// Helper function to generate mock route with some curvature
function generateMockRoute(principal, secondary) {
  const startLat = principal.latitude;
  const startLng = principal.longitude;
  const endLat = secondary.latitude;
  const endLng = secondary.longitude;
  
  const distance = calculateDistance(startLat, startLng, endLat, endLng);
  
  // Create more realistic curved routes based on distance
  let routePoints = [];
  
  if (distance < 500) {
    // Very short distance - almost straight but with slight curve
    const midLat = (startLat + endLat) / 2;
    const midLng = (startLng + endLng) / 2;
    const offset = 0.002; // Increased offset for visible curve
    
    routePoints = [
      [startLng, startLat],
      [midLng + (Math.random() - 0.5) * offset, midLat + (Math.random() - 0.5) * offset],
      [endLng, endLat]
    ];
  } else if (distance < 2000) {
    // Short distance - add one curve point
    const midLat = (startLat + endLat) / 2;
    const midLng = (startLng + endLng) / 2;
    const offset = 0.005; // Increased offset for visible curve
    
    routePoints = [
      [startLng, startLat],
      [midLng + (Math.random() - 0.5) * offset, midLat + (Math.random() - 0.5) * offset],
      [endLng, endLat]
    ];
  } else {
    // Longer distance - create multiple curve points to simulate road routing
    const numPoints = Math.min(Math.floor(distance / 1000), 4);
    routePoints = [[startLng, startLat]];
    
    for (let i = 1; i <= numPoints; i++) {
      const ratio = i / (numPoints + 1);
      const lng = startLng + (endLng - startLng) * ratio;
      const lat = startLat + (endLat - startLat) * ratio;
      
      // Add realistic offset to simulate road network curves
      const offset = 0.008; // Increased offset for visible curves
      routePoints.push([
        lng + (Math.random() - 0.5) * offset,
        lat + (Math.random() - 0.5) * offset
      ]);
    }
    
    routePoints.push([endLng, endLat]);
  }
  
  const mockPolyline = encodePolyline(routePoints);
  const timeMinutes = Math.round(distance / 1000 * 3); // Assume 3 min per km
  
  return {
    encoded: mockPolyline,
    distance_m: Math.round(distance),
    duration_s: timeMinutes * 60,
    pretty: {
      distance: `${(distance / 1000).toFixed(1)} km`,
      time: `${timeMinutes} min`
    }
  };
}

// Helper function to generate sophisticated S-curve routes
function generateSCurveRoute(principal, secondary) {
  const startLat = principal.latitude;
  const startLng = principal.longitude;
  const endLat = secondary.latitude;
  const endLng = secondary.longitude;
  
  const distance = calculateDistance(startLat, startLng, endLat, endLng);
  
  // Create S-curve pattern for more realistic road routing
  const midLat = (startLat + endLat) / 2;
  const midLng = (startLng + endLng) / 2;
  
  // Calculate perpendicular direction for S-curve
  const deltaLat = endLat - startLat;
  const deltaLng = endLng - startLng;
  const length = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);
  
  if (length === 0) return generateMockRoute(principal, secondary);
  
  // Normalize and create perpendicular vector
  const perpLat = -deltaLng / length;
  const perpLng = deltaLat / length;
  
  // Create S-curve with multiple control points
  const curveIntensity = Math.min(distance / 10000, 0.02); // Scale with distance
  
  const routePoints = [
    [startLng, startLat],
    // First curve point (left side)
    [
      startLng + deltaLng * 0.25 + perpLng * curveIntensity * (0.5 + Math.random() * 0.5),
      startLat + deltaLat * 0.25 + perpLat * curveIntensity * (0.5 + Math.random() * 0.5)
    ],
    // Middle point with opposite curve
    [
      midLng + perpLng * curveIntensity * (0.3 + Math.random() * 0.4),
      midLat + perpLat * curveIntensity * (0.3 + Math.random() * 0.4)
    ],
    // Second curve point (right side)
    [
      startLng + deltaLng * 0.75 + perpLng * curveIntensity * (0.5 + Math.random() * 0.5),
      startLat + deltaLat * 0.75 + perpLat * curveIntensity * (0.5 + Math.random() * 0.5)
    ],
    [endLng, endLat]
  ];
  
  const mockPolyline = encodePolyline(routePoints);
  const timeMinutes = Math.round(distance / 1000 * 3);
  
  return {
    encoded: mockPolyline,
    distance_m: Math.round(distance),
    duration_s: timeMinutes * 60,
    pretty: {
      distance: `${(distance / 1000).toFixed(1)} km`,
      time: `${timeMinutes} min`
    }
  };
}

// Helper function to calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Simple polyline encoder
function encodePolyline(coordinates) {
  let encoded = '';
  let lastLat = 0;
  let lastLng = 0;

  for (const [lng, lat] of coordinates) {
    const latDiff = Math.round((lat - lastLat) * 1e5);
    const lngDiff = Math.round((lng - lastLng) * 1e5);
    
    encoded += encodeNumber(latDiff) + encodeNumber(lngDiff);
    
    lastLat = lat;
    lastLng = lng;
  }
  
  return encoded;
}

function encodeNumber(num) {
  num = num << 1;
  if (num < 0) num = ~num;
  
  let encoded = '';
  while (num >= 0x20) {
    encoded += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
    num >>= 5;
  }
  encoded += String.fromCharCode(num + 63);
  return encoded;
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
      const lon = lng * 1e-5;
      const latVal = lat * 1e-5;
      // guard invalid numbers
      if (!isFinite(lon) || !isFinite(latVal)) continue;
      // ensure [lon, lat] order, flip if clearly swapped
      let pair = [lon, latVal];
      if (Math.abs(lon) <= 90 && Math.abs(latVal) > 90) {
        pair = [latVal, lon];
      }
      coordinates.push(pair);
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

function sanitizeLineCoords(coords) {
  const cleaned = [];
  coords.forEach((pt) => {
    if (!Array.isArray(pt) || pt.length < 2) return;
    let [lon, lat] = pt;
    if (!isFinite(lon) || !isFinite(lat)) return;
    // if values look flipped ([lat, lon]), swap
    if (Math.abs(lon) <= 90 && Math.abs(lat) > 90) {
      [lon, lat] = [lat, lon];
    }
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
    cleaned.push([lon, lat]);
  });
  return cleaned;
}

// Helper function to generate intermediate waypoints for realistic car routing
function generateIntermediateWaypoints(startLng, startLat, endLng, endLat) {
  const distance = calculateDistance(startLat, startLng, endLat, endLng);
  
  // For longer distances, add more intermediate points to follow roads
  if (distance < 1000) {
    // Short distance, no intermediate points needed
    return [];
  } else if (distance < 5000) {
    // Medium distance, add 1-2 intermediate points
    const midLng = startLng + (endLng - startLng) * 0.5;
    const midLat = startLat + (endLat - startLat) * 0.5;
    
    // Add slight offset to simulate road routing
    const offset = 0.005; // Increased offset for visible curves
    return [
      [midLng + (Math.random() - 0.5) * offset, midLat + (Math.random() - 0.5) * offset]
    ];
  } else {
    // Long distance, add 2-3 intermediate points
    const points = [];
    const numPoints = Math.min(Math.floor(distance / 2000), 3);
    
    for (let i = 1; i <= numPoints; i++) {
      const ratio = i / (numPoints + 1);
      const lng = startLng + (endLng - startLng) * ratio;
      const lat = startLat + (endLat - startLat) * ratio;
      
      // Add realistic offset to simulate road network
      const offset = 0.01; // Increased offset for visible curves
      points.push([
        lng + (Math.random() - 0.5) * offset,
        lat + (Math.random() - 0.5) * offset
      ]);
    }
    
    return points;
  }
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
  const { map: maplibregl, setMapLib, mapInstance, setMapInstance, project, replaceSecondary, setHoveredPlace, setSelectedPlace } = useStudio();
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [pendingModel, setPendingModel] = useState(null);
  const isMountedRef = useRef(true);
  const mapCreatedRef = useRef(false);

  // Check if container is properly mounted
  useEffect(() => {
    if (mapRef.current) {
      console.log('Map container mounted:', {
        element: mapRef.current,
        height: mapRef.current.offsetHeight,
        width: mapRef.current.offsetWidth,
        style: window.getComputedStyle(mapRef.current)
      });
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // load MapLibre GL class
    (async () => {
      try {
        console.log('Loading MapLibre GL...');
        const lib = (await import('maplibre-gl')).default;
        console.log('MapLibre GL loaded successfully:', lib);
        setMapLib(lib);
      } catch (error) {
        console.error('Failed to load MapLibre GL:', error);
      }
    })();
  }, [setMapLib]);

  useEffect(() => {
    if (!maplibregl || mapInstance) {
      console.log('Map initialization skipped:', {
        maplibregl: !!maplibregl,
        mapInstance: !!mapInstance
      });
      return;
    }
    
    console.log('Map container check:', {
      container: mapRef.current,
      offsetHeight: mapRef.current?.offsetHeight,
      offsetWidth: mapRef.current?.offsetWidth,
      clientHeight: mapRef.current?.clientHeight,
      clientWidth: mapRef.current?.clientWidth
    });
    
    // Ensure the container is properly sized
    if (!mapRef.current || mapRef.current.offsetHeight === 0) {
      console.log('Map container not ready, retrying...');
      setTimeout(() => {
        if (mapRef.current && mapRef.current.offsetHeight > 0) {
          console.log('Map container ready, initializing...');
          // Force re-render
          setMapInstance(null);
        }
      }, 100);
      return;
    }
    
    try {
      const style = project.styleURL
        ? project.styleURL
        : {
            version: 8,
            sources: {
              satellite: {
                type: 'raster',
                tiles: [
                  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                ],
                tileSize: 256,
                attribution: '© Esri'
              }
            },
            layers: [
              {
                id: 'satellite-layer',
                type: 'raster',
                source: 'satellite',
                minzoom: 0,
                maxzoom: 20
              }
            ]
          };

      const m = new maplibregl.Map({
        container: mapRef.current,
        style,
        center: [project.principal.longitude, project.principal.latitude],
        zoom: project.principal.zoom || 14
      });

      console.log('Map instance created:', m);

      m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));
      m.addControl(new maplibregl.AttributionControl({ compact: true }));

      // Set up event listeners before setting the instance
      m.on('load', () => {
        console.log('Map loaded successfully');
        setReady(true);
        // Trigger a resize to ensure proper rendering
        setTimeout(() => {
          if (!m._removed) {
            m.resize();
          }
        }, 100);
      });

      m.on('error', (error) => {
        console.error('Map error:', error);
        // Try fallback satellite source if main source fails
        if (
          !project.styleURL &&
          error.error &&
          error.error.message &&
          error.error.message.includes('tile')
        ) {
          console.log('Trying fallback satellite source...');
          if (!m._removed) {
            m.addSource('fallback-satellite', {
              type: 'raster',
              tiles: [
                'https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}.jpg'
              ],
              tileSize: 256,
              attribution: '© Stadia Maps'
            });
            m.addLayer({
              id: 'fallback-satellite-layer',
              type: 'raster',
              source: 'fallback-satellite',
              minzoom: 0,
              maxzoom: 20
            });
          }
        }
      });

      m.on('styledata', () => {
        console.log('Map style loaded');
      });

      m.on('idle', () => {
        console.log('Map is idle (fully loaded)');
        setReady(true);
      });

      // Add a timeout fallback in case the load event doesn't fire
      const timeoutId = setTimeout(() => {
        console.log('Map load timeout, forcing ready state');
        setReady(true);
      }, 2000); // Reduced to 2 seconds

      // Also force ready after a shorter delay to ensure UI doesn't get stuck
      const forceReadyId = setTimeout(() => {
        console.log('Forcing map ready state');
        setReady(true);
      }, 1000);

      // Add Three.js layer for 3D models
      const addThreeLayer = () => {
        if (m.__threeLayer) return;
        const layer = {
          id: 'three-models',
          type: 'custom',
          renderingMode: '3d',
                     onAdd(map, gl) {
             this.map = map;
             this.camera = new THREE.PerspectiveCamera();
             this.scene = new THREE.Scene();
             this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
             // disable WebXR to avoid "xr-spatial-tracking" permission warnings
             this.renderer.xr.enabled = false;
             this.renderer.autoClear = false;
             
             // Add lighting
             const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
             this.scene.add(ambientLight);
             
             const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
             directionalLight.position.set(10, 10, 5);
             this.scene.add(directionalLight);
           },
          render(gl, matrix) {
            const mtx = new THREE.Matrix4().fromArray(matrix);
            this.camera.projectionMatrix = mtx;
            this.renderer.state.reset();
            this.renderer.render(this.scene, this.camera);
            this.map.triggerRepaint();
          }
        };
        m.addLayer(layer);
        m.__threeLayer = layer;
      };

      m.on('style.load', addThreeLayer);

      // Click to place a 3D model marker
      m.on('click', (e) => {
        // Only place models if not clicking on existing models
        const canvas = m.getCanvas();
        const rect = canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((e.point.x - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.point.y - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, m.__threeLayer?.camera);
        const hits = raycaster.intersectObjects(m.__threeLayer?.scene.children || [], true);
        
        if (hits.length > 0) return; // Don't place if clicking on existing model
        
        const { lng, lat } = e.lngLat;
        const id = `place-${Date.now()}`;
        const layer = m.__threeLayer;
        if (!layer) return;
        
        const merc = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
        const scale = merc.meterInMercatorCoordinateUnits();
        
        const loader = new GLTFLoader();
        loader.load(DEFAULT_MODEL_URL, (gltf) => {
          const model = gltf.scene;
          model.userData.placeId = id;
          model.position.set(merc.x, merc.y, merc.z);
          model.scale.set(scale, scale, scale);
          
          // Add rotation to make it face the camera
          model.rotation.y = Math.PI;
          
          layer.scene.add(model);
          setPendingModel({ 
            id, 
            lng, 
            lat, 
            model, 
            base: merc, 
            offset: { x: 0, y: 0, z: 0 },
            scale: scale
          });
        }, undefined, (error) => {
          console.error('Error loading 3D model:', error);
        });
      });

      // Set the map instance after setting up all event listeners
      setMapInstance(m);
      mapCreatedRef.current = true;
      
      // Force ready state immediately to hide loading overlay
      console.log('Setting map ready immediately');
      setReady(true);
      
      // Immediately check if map canvas is created
      console.log('Checking map canvas immediately...');
      const canvas = mapRef.current?.querySelector('canvas');
      if (canvas) {
        console.log('Map canvas found immediately:', canvas);
        console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
        console.log('Canvas style:', canvas.style.cssText);
        console.log('Canvas display:', window.getComputedStyle(canvas).display);
        console.log('Canvas visibility:', window.getComputedStyle(canvas).visibility);
        console.log('Canvas opacity:', window.getComputedStyle(canvas).opacity);
      } else {
        console.log('No map canvas found immediately');
        console.log('Map container children:', mapRef.current?.children);
      }
      
      // Check if map canvas is created
      setTimeout(() => {
        const canvas = mapRef.current?.querySelector('canvas');
        if (canvas) {
          console.log('Map canvas found after timeout:', canvas);
          console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
        } else {
          console.log('No map canvas found after timeout');
        }
      }, 500);
      
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(forceReadyId);
        // Only remove the map if it wasn't successfully created
        if (m && !m._removed && !mapCreatedRef.current) {
          console.log('Removing map instance');
          m.remove();
        } else {
          console.log('Keeping map instance (successfully created)');
        }
      };
    } catch (error) {
      console.error('Failed to initialize map:', error);
      // Set ready to true even if there's an error so the UI doesn't get stuck
      setReady(true);
    }
  }, [maplibregl, mapInstance, project.styleURL, project.principal, project.secondaries.length, setMapInstance]);

  // Handle hover/click interactions on 3D models
  useEffect(() => {
    if (!mapInstance || !mapInstance.__threeLayer) return;
    const canvas = mapInstance.getCanvas();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

         const getIntersections = (e) => {
       const rect = canvas.getBoundingClientRect();
       mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
       mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
       
       // For now, skip raycasting to avoid camera issues
       return [];
     };

    const handleMove = (e) => {
      const hits = getIntersections(e);
      if (hits.length > 0) {
        const placeId = hits[0].object.userData.placeId;
        setHoveredPlace(placeId);
        window.dispatchEvent(new CustomEvent('place-event', { detail: { type: 'hover', placeId } }));
      } else {
        setHoveredPlace(null);
        window.dispatchEvent(new CustomEvent('place-event', { detail: { type: 'hover', placeId: null } }));
      }
    };

    const handleLeave = () => {
      setHoveredPlace(null);
      window.dispatchEvent(new CustomEvent('place-event', { detail: { type: 'hover', placeId: null } }));
    };

    const handleClick = (e) => {
      const hits = getIntersections(e);
      if (hits.length > 0) {
        const placeId = hits[0].object.userData.placeId;
        setSelectedPlace(placeId);
        window.dispatchEvent(new CustomEvent('place-event', { detail: { type: 'click', placeId } }));
      }
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseleave', handleLeave);
    canvas.addEventListener('click', handleClick);
    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseleave', handleLeave);
      canvas.removeEventListener('click', handleClick);
    };
  }, [mapInstance, setHoveredPlace, setSelectedPlace]);

  const updateOffset = (axis, val) => {
    setPendingModel((pm) => {
      if (!pm) return pm;
      const next = { ...pm, offset: { ...pm.offset, [axis]: val } };
      const scale = pm.base.meterInMercatorCoordinateUnits();
      pm.model.position.set(
        pm.base.x + next.offset.x * scale,
        pm.base.y + next.offset.y * scale,
        pm.base.z + next.offset.z * scale
      );
      return next;
    });
  };

  const cancelModel = () => {
    if (pendingModel && mapInstance?.__threeLayer) {
      mapInstance.__threeLayer.scene.remove(pendingModel.model);
    }
    setPendingModel(null);
  };

  const saveModel = () => {
    if (!pendingModel) return;
    const name = `Place ${useStudio.getState().project.secondaries.length + 1}`;
    
    useStudio.getState().addSecondary({
      _id: pendingModel.id,
      name,
      latitude: pendingModel.lat,
      longitude: pendingModel.lng,
      category: 'Secondary',
      footerInfo: { location: 'New' },
      modelUrl: pendingModel.modelUrl || DEFAULT_MODEL_URL,
      modelPath: pendingModel.modelPath,
      modelPosition: pendingModel.offset,
      customModel: !!pendingModel.customFile
    });
    setPendingModel(null);
  };

  // Load existing 3D models from saved places
  useEffect(() => {
    if (!mapInstance || !mapInstance.__threeLayer || !maplibregl) return;
    
    const layer = mapInstance.__threeLayer;
    
    // Clear existing models (but keep lights)
    const lights = layer.scene.children.filter(child => child.type === 'AmbientLight' || child.type === 'DirectionalLight');
    layer.scene.clear();
    lights.forEach(light => layer.scene.add(light));
    
    // Load models for places that have modelUrl
    const places = [project.principal, ...project.secondaries];
    places.forEach(place => {
      if (place.modelUrl && place._id) {
        console.log('Loading 3D model for place:', place.name, 'URL:', place.modelUrl);
        
        const merc = maplibregl.MercatorCoordinate.fromLngLat([place.longitude, place.latitude], 0);
        const scale = merc.meterInMercatorCoordinateUnits();
        
        const loader = new GLTFLoader();
        loader.load(
          place.modelUrl,
          (gltf) => {
            console.log('3D model loaded successfully for:', place.name);
            const model = gltf.scene;
            model.userData.placeId = place._id;

            // Apply saved position offset if available
            const offset = place.modelPosition || { x: 0, y: 0, z: 0 };
            model.position.set(
              merc.x + offset.x * scale,
              merc.y + offset.y * scale,
              merc.z + offset.z * scale
            );

            model.scale.set(scale, scale, scale);
            model.rotation.y = Math.PI;

            layer.scene.add(model);
            console.log('3D model added to scene for:', place.name);
          },
          undefined,
          (error) => {
            console.error('Error loading saved 3D model for', place.name, ':', error);

            // Fallback to default marker if the model can't be fetched
            const { project, updateProject } = useStudio.getState();
            if (project.principal._id === place._id) {
              updateProject({ principal: { ...project.principal, modelUrl: undefined, modelPath: undefined, customModel: false } });
            } else {
              const updatedSecondaries = project.secondaries.map((s) =>
                s._id === place._id ? { ...s, modelUrl: undefined, modelPath: undefined, customModel: false } : s
              );
              updateProject({ secondaries: updatedSecondaries });
            }
          }
        );
      }
    });
  }, [mapInstance, project.principal, project.secondaries, maplibregl]);

  // draw markers & routes on updates
  useEffect(() => {
    if (!mapInstance || !maplibregl) return;

    const draw = () => {
      // Clean previous markers
      if (!mapInstance.__markers) mapInstance.__markers = [];
      mapInstance.__markers.forEach((mk) => mk.remove());
      mapInstance.__markers = [];

      // Clean previous 3D models
      if (mapInstance.__threeLayer) {
        if (!mapInstance.__models) mapInstance.__models = [];
        mapInstance.__models.forEach((obj) => mapInstance.__threeLayer.scene.remove(obj));
        mapInstance.__models = [];
      }

      // Principal marker
      const p = project.principal;
      if (isFinite(p.longitude) && isFinite(p.latitude)) {
        const pm = new maplibregl.Marker({ color: '#111827' })
          .setLngLat([p.longitude, p.latitude])
          .setPopup(new maplibregl.Popup().setHTML(`<div class="text-sm"><b>${p.name}</b><br/>${prettyLatLng(p.latitude, p.longitude)}</div>`))
          .addTo(mapInstance);
        mapInstance.__markers.push(pm);
      }

      // Secondary markers / models
      project.secondaries.forEach((s, idx) => {
        if (!isFinite(s.longitude) || !isFinite(s.latitude)) return;
        if (s.modelUrl && mapInstance.__threeLayer) {
          const loader = new GLTFLoader();
          loader.load(s.modelUrl, (gltf) => {
            const model = gltf.scene;
            model.userData.placeId = s._id;
            const merc = maplibregl.MercatorCoordinate.fromLngLat([s.longitude, s.latitude], s.modelPosition?.z || 0);
            const scale = merc.meterInMercatorCoordinateUnits();
            model.position.set(
              merc.x + (s.modelPosition?.x || 0) * scale,
              merc.y + (s.modelPosition?.y || 0) * scale,
              merc.z + (s.modelPosition?.z || 0) * scale
            );
            model.scale.set(scale, scale, scale);
            mapInstance.__threeLayer.scene.add(model);
            mapInstance.__models.push(model);
          });
        } else {
          const mk = new maplibregl.Marker({ color: '#2563eb' })
            .setLngLat([s.longitude, s.latitude])
            .setPopup(new maplibregl.Popup().setHTML(`
              <div class="text-sm">
                <b>${s.name}</b><br/>${prettyLatLng(s.latitude, s.longitude)}<br/>
                ${s.footerInfo?.distance ? `Distance: ${s.footerInfo.distance}<br/>` : ''}
                ${s.footerInfo?.time ? `Time: ${s.footerInfo.time}` : ''}
              </div>`))
            .addTo(mapInstance);
          const el = mk.getElement();
          el.addEventListener('mouseenter', () => {
            setHoveredPlace(s._id);
            window.dispatchEvent(new CustomEvent('place-event', { detail: { type: 'hover', placeId: s._id } }));
          });
          el.addEventListener('mouseleave', () => {
            setHoveredPlace(null);
            window.dispatchEvent(new CustomEvent('place-event', { detail: { type: 'hover', placeId: null } }));
          });
          el.addEventListener('click', () => {
            setSelectedPlace(s._id);
            window.dispatchEvent(new CustomEvent('place-event', { detail: { type: 'click', placeId: s._id } }));
          });
          mapInstance.__markers.push(mk);
        }
      });

      // Routes: remove existing layers/sources (ensure layers removed before sources)
      const routeIds = (mapInstance.__routeIds || []);
      routeIds.forEach((id) => {
        const outlineId = `${id}-outline`;
        if (mapInstance.getLayer(outlineId)) mapInstance.removeLayer(outlineId);
        if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
        if (mapInstance.getSource(id)) mapInstance.removeSource(id);
      });
      mapInstance.__routeIds = [];

      // Draw routes if present
      project.secondaries.forEach((s, idx) => {
        const encoded = s.routesFromBase?.[0];
        if (!encoded) return;

        console.log(`Rendering route for ${s.name}:`, {
          hasRouteGeoJSON: !!s.routeGeoJSON,
          routeGeoJSON: s.routeGeoJSON,
          encoded: encoded
        });

        try {
          let feature;
          let routeId = `route-${idx}`;

          // Check if we have GeoJSON data (from routing API)
          if (s.routeGeoJSON) {
            feature = s.routeGeoJSON;
            console.log(`Using GeoJSON route data for ${s.name}:`, feature);
          } else {
            feature = decodePolylineToGeoJSON(maplibregl, encoded);
            console.log(`Using decoded polyline route for ${s.name}:`, feature);
          }

          if (feature?.geometry?.type === 'LineString') {
            feature = {
              ...feature,
              geometry: {
                ...feature.geometry,
                coordinates: sanitizeLineCoords(feature.geometry.coordinates)
              }
            };
          }

          if (!feature.geometry.coordinates.length) return;

          // Remove existing route layer if it exists
          if (mapInstance.getLayer(routeId)) {
            mapInstance.removeLayer(routeId);
          }
          if (mapInstance.getSource(routeId)) {
            mapInstance.removeSource(routeId);
          }

          // Add new route layer with enhanced styling
          mapInstance.addSource(routeId, { type: 'geojson', data: feature });
          mapInstance.addLayer({
            id: routeId,
            type: 'line',
            source: routeId,
            paint: {
              'line-width': 6,
              'line-color': '#10b981',
              'line-opacity': 0.9
            },
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            }
          });

          mapInstance.addLayer({
            id: `${routeId}-outline`,
            type: 'line',
            source: routeId,
            paint: {
              'line-width': 8,
              'line-color': '#ffffff',
              'line-opacity': 0.3
            },
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            }
          }, routeId); // Insert below the main route line

          mapInstance.__routeIds.push(routeId);

          console.log(`Route ${idx} added to map:`, feature);
        } catch (error) {
          console.error(`Failed to render route ${idx}:`, error);
        }
      });
    };

    if (mapInstance.isStyleLoaded()) {
      draw();
    } else {
      mapInstance.once('load', draw);
    }
  }, [project, mapInstance, maplibregl]);

  return (
    <div ref={mapRef} className="w-full h-full rounded-2xl overflow-hidden bg-gray-200" style={{ position: 'relative' }}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-75 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      
      {/* Fallback map display if MapLibre isn't working */}
      {ready && !mapRef.current?.querySelector('canvas') && (
        <div className="w-full h-full bg-blue-100 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-2">🗺️</div>
            <p className="text-gray-600">Map loaded but canvas not visible</p>
            <p className="text-xs text-gray-500 mt-1">Check console for debugging info</p>
          </div>
        </div>
      )}

      {pendingModel && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-xl shadow-lg space-y-4 max-w-md w-full mx-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Position 3D Model</h3>
              <button 
                onClick={cancelModel}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Select Model:</label>
              <select 
                className="w-full border rounded px-3 py-2 text-sm"
                onChange={(e) => {
                  const selectedModel = AVAILABLE_MODELS.find(m => m.url === e.target.value);
                  if (selectedModel && pendingModel) {
                    // Replace the current model with the selected one
                    const layer = mapInstance?.__threeLayer;
                    if (layer) {
                      layer.scene.remove(pendingModel.model);
                      const loader = new GLTFLoader();
                      loader.load(selectedModel.url, (gltf) => {
                        const newModel = gltf.scene;
                        newModel.userData.placeId = pendingModel.id;
                        newModel.position.copy(pendingModel.model.position);
                        newModel.scale.copy(pendingModel.model.scale);
                        newModel.rotation.copy(pendingModel.model.rotation);
                        layer.scene.add(newModel);
                        setPendingModel({ ...pendingModel, model: newModel, modelUrl: selectedModel.url });
                      });
                    }
                  }
                }}
              >
                {AVAILABLE_MODELS.map(model => (
                  <option key={model.url} value={model.url}>
                    {model.name}
                  </option>
                ))}
              </select>
              
              {/* Custom Model Upload */}
              <div className="mt-3">
                <label className="text-sm font-medium text-gray-700">Or upload custom GLB model:</label>
                <div className="mt-1">
                  <input
                    type="file"
                    accept=".glb,.gltf"
                    className="w-full text-sm border rounded px-3 py-2"
                                         onChange={async (e) => {
                       const file = e.target.files[0];
                       if (file && pendingModel) {
                         try {
                           // Upload the file to the backend
                           const uploadResult = await upload3DModel(file);
                           const layer = mapInstance?.__threeLayer;
                           if (layer) {
                             layer.scene.remove(pendingModel.model);
                             const loader = new GLTFLoader();
                             loader.load(uploadResult.url, (gltf) => {
                               const newModel = gltf.scene;
                               newModel.userData.placeId = pendingModel.id;
                               newModel.position.copy(pendingModel.model.position);
                               newModel.scale.copy(pendingModel.model.scale);
                               newModel.rotation.copy(pendingModel.model.rotation);
                               layer.scene.add(newModel);
                               setPendingModel({
                                 ...pendingModel,
                                 model: newModel,
                                 modelUrl: uploadResult.url,
                                 modelPath: uploadResult.relativeUrl,
                                 customFile: file,
                                 uploadedModel: uploadResult
                               });
                             }, undefined, (error) => {
                               console.error('Error loading custom model:', error);
                               alert('Failed to load custom model. Please check the file format.');
                             });
                           }
                         } catch (error) {
                           console.error('Upload failed:', error);
                           alert('Failed to upload 3D model. Please try again.');
                         }
                       }
                     }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: GLB, GLTF (max 50MB)
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 w-8">X:</label>
                <input 
                  type="range" 
                  min="-10" 
                  max="10" 
                  step="0.1"
                  value={pendingModel.offset.x} 
                  onChange={(e) => updateOffset('x', Number(e.target.value))} 
                  className="flex-1"
                />
                <input 
                  type="number" 
                  value={pendingModel.offset.x} 
                  onChange={(e) => updateOffset('x', Number(e.target.value))} 
                  className="w-16 border rounded px-2 py-1 text-sm"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 w-8">Y:</label>
                <input 
                  type="range" 
                  min="-10" 
                  max="10" 
                  step="0.1"
                  value={pendingModel.offset.y} 
                  onChange={(e) => updateOffset('y', Number(e.target.value))} 
                  className="flex-1"
                />
                <input 
                  type="number" 
                  value={pendingModel.offset.y} 
                  onChange={(e) => updateOffset('y', Number(e.target.value))} 
                  className="w-16 border rounded px-2 py-1 text-sm"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 w-8">Z:</label>
                <input 
                  type="range" 
                  min="-5" 
                  max="20" 
                  step="0.1"
                  value={pendingModel.offset.z} 
                  onChange={(e) => updateOffset('z', Number(e.target.value))} 
                  className="flex-1"
                />
                <input 
                  type="number" 
                  value={pendingModel.offset.z} 
                  onChange={(e) => updateOffset('z', Number(e.target.value))} 
                  className="w-16 border rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              <p>• X: Left/Right position</p>
              <p>• Y: Forward/Backward position</p>
              <p>• Z: Height (up/down)</p>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button 
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors" 
                onClick={cancelModel}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors" 
                onClick={saveModel}
              >
                Save Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Secondary Place Card (sortable)

function SecondaryCard({ place, index, projectId }) {
  const { replaceSecondary, project, backend, removeSecondary } = useStudio();
  const [open360, setOpen360] = useState(false);
  const [openTour, setOpenTour] = useState(false);
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
      
      // Ensure secondary place exists in backend and has a real _id
      let updatedProject = useStudio.getState().project;
      let refreshedPlace = updatedProject.secondaries[index];
      let placeId = refreshedPlace._id;

      if (!placeId) {
        // Persist this secondary place to backend to get a real ObjectId
        const payload = {
          name: refreshedPlace.name,
          latitude: refreshedPlace.latitude,
          longitude: refreshedPlace.longitude,
          category: refreshedPlace.category || 'Secondary',
          virtualtour: refreshedPlace.virtualtour || undefined,
          tourUrl: refreshedPlace.tourUrl || undefined,
          heading: refreshedPlace.heading || undefined,
          zoom: refreshedPlace.zoom || undefined,
          bounds: refreshedPlace.bounds || undefined,
          footerInfo: refreshedPlace.footerInfo || undefined,
          model3d: refreshedPlace.modelPath ? { url: refreshedPlace.modelPath } : undefined
        };
        const res = await fetch(`${backend}/api/projects/${pid}/places`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          throw new Error('Failed to create place before routing');
        }
        const created = await res.json();
        placeId = created._id;
        // Update local store with the backend-assigned _id
        replaceSecondary(index, { _id: placeId });
        updatedProject = useStudio.getState().project;
        refreshedPlace = updatedProject.secondaries[index];
      }
      
      console.log('Computing route for:', { pid, placeId, place: refreshedPlace.name });
      
      const r = await computeRoute(pid, placeId);
      
      // attach pretty metrics
      const routeData = {
        routesFromBase: [r.encoded],
        routeGeoJSON: r.geojson || decodePolylineToGeoJSON(useStudio.getState().map, r.encoded), // Store the route data
        footerInfo: { 
          ...(refreshedPlace.footerInfo || {}), 
          distance: r.pretty.distance,
          time: r.pretty.time
        }
      };
      
      console.log('Storing route data:', routeData);
      replaceSecondary(index, routeData);
      
      console.log('Route computed successfully:', r);
    } catch (e) {
      console.error('Routing failed:', e);
      alert('Routing failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  }

  // upload 360
  async function onUpload360(file) {
    try {
      const res = await uploadImage(file);
      replaceSecondary(index, { virtualtour: res.url, tourUrl: undefined });
    } catch (e) {
      alert('Upload failed');
    }
  }

  async function onDelete() {
    if (!window.confirm('Delete this place?')) return;
    try {
      if (project._id && place._id && !String(place._id).startsWith('temp-')) {
        await fetch(`${backend}/api/projects/${project._id}/places/${place._id}`, { method: 'DELETE' });
      }
    } catch (e) {
      console.warn('Delete request failed:', e);
    }
    removeSecondary(index);
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
          onUploaded={(url) => replaceSecondary(index, { virtualtour: url, tourUrl: undefined })}
        />
      </div>

      <label className="block mt-3 text-xs">Tour URL
        <input type="url" className="w-full mt-1 rounded-lg border p-1" value={place.tourUrl || ''} onChange={(e) => replaceSecondary(index, { tourUrl: e.target.value, virtualtour: undefined })} />
      </label>
      {((!place.virtualtour && !place.tourUrl) || (place.virtualtour && place.tourUrl)) && (
        <div className="mt-2 text-xs text-red-600">Provide either a 360 image or a tour URL</div>
      )}

             <div className="flex gap-2 mt-3">
         {place.virtualtour && (
           <button className="px-3 py-1 rounded-lg bg-emerald-600 text-white" onClick={() => setOpen360(true)}>View 360°</button>
         )}
         {place.tourUrl && (
           <button
             className="px-3 py-1 rounded-lg bg-emerald-600 text-white"
             onClick={() => setOpenTour(true)}
           >
             View Tour
           </button>
         )}
         <button className="px-3 py-1 rounded-lg bg-indigo-600 text-white" onClick={onComputeRoute}>Route</button>
         <button className="px-3 py-1 rounded-lg bg-red-600 text-white" onClick={onDelete}>Delete</button>
       </div>
       
       {/* 3D Model Upload for existing places */}
       <div className="mt-3">
         <label className="text-xs font-medium text-gray-700">3D Model (optional):</label>
         <div className="mt-1">
           <input
             type="file"
             accept=".glb,.gltf"
             className="w-full text-xs border rounded px-2 py-1"
                           onChange={async (e) => {
                const file = e.target.files[0];
                if (file) {
                  try {
                    const uploadResult = await upload3DModel(file);
                    replaceSecondary(index, {
                      modelUrl: uploadResult.url,
                      modelPath: uploadResult.relativeUrl,
                      customModel: true
                    });
                  } catch (error) {
                    console.error('Upload failed:', error);
                    alert('Failed to upload 3D model. Please try again.');
                  }
                }
              }}
           />
           {place.modelUrl && (
             <div className="mt-1 text-xs text-green-600">
               ✓ 3D model loaded
               <button 
                 className="ml-2 text-red-500 hover:text-red-700"
                 onClick={() => replaceSecondary(index, { modelUrl: undefined, modelPath: undefined, customModel: undefined })}
               >
                 Remove
               </button>
             </div>
           )}
         </div>
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
      <Modal open={openTour} onClose={() => setOpenTour(false)} title={`${place.name} – Tour`}>
        {place.tourUrl ? (
          <iframe src={place.tourUrl} className="w-full h-full" allowFullScreen />
        ) : (
          <div className="w-full h-full grid place-items-center text-gray-500">No tour URL yet</div>
        )}
      </Modal>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Page

export default function MappingStudio() {
  const { project, updateProject, reorderSecondaries, backend } = useStudio();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  async function onSave() {
    const places = [project.principal, ...project.secondaries];
    for (const p of places) {
      const hasPano = !!p.virtualtour;
      const hasTour = !!p.tourUrl;
      if (hasPano === hasTour) {
        alert(`Place "${p.name}" must have exactly one media: 360 image or tour URL`);
        return;
      }
    }
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

  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expOpts, setExpOpts] = useState({
    inlineAssets: true,
    inlineData: true,
    includeLocalLibs: true,
    styleURL: project.styleURL || '',
    profiles: ['driving'],
    includeRoutes: true
  });

  async function doExport() {
    if (!project._id) {
      alert('Save project first');
      return;
    }
    const places = [project.principal, ...project.secondaries];
    for (const p of places) {
      const hasPano = !!p.virtualtour;
      const hasTour = !!p.tourUrl;
      if (hasPano === hasTour) {
        alert(`Place "${p.name}" must have exactly one media: 360 image or tour URL`);
        return;
      }
    }
    setExporting(true);
    try {
      const res = await fetch(`${backend}/api/projects/${project._id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expOpts)
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title || 'project'}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Export failed');
    }
    setExporting(false);
    setExportOpen(false);
  }

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
            <input
              className="text-sm text-gray-600 bg-transparent outline-none w-full"
              placeholder="Map style URL (optional)"
              value={project.styleURL || ''}
              onChange={(e) => updateProject({ styleURL: e.target.value })} />
          </div>
            <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white" onClick={onSave}>Save</button>
            <button className="px-4 py-2 rounded-xl bg-gray-900 text-white" onClick={() => setExportOpen(true)}>Export</button>
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
                onUploaded={(url) => updateProject({ principal: { ...project.principal, virtualtour: url, tourUrl: undefined } })}
              />
            </div>
            <label className="block mt-3 text-xs">Tour URL
              <input type="url" className="w-full mt-1 rounded-lg border p-1" value={project.principal.tourUrl || ''} onChange={(e) => updateProject({ principal: { ...project.principal, tourUrl: e.target.value, virtualtour: undefined } })} />
            </label>
            {((!project.principal.virtualtour && !project.principal.tourUrl) || (project.principal.virtualtour && project.principal.tourUrl)) && (
              <div className="mt-2 text-xs text-red-600">Provide either a 360 image or a tour URL</div>
            )}
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

        {exportOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white p-4 rounded-xl w-80 space-y-2">
              <h3 className="font-semibold text-lg">Export Project</h3>
              <label className="block text-sm"><input type="checkbox" className="mr-2" checked={expOpts.inlineAssets} onChange={e=>setExpOpts({...expOpts, inlineAssets:e.target.checked})}/>Inline assets</label>
              <label className="block text-sm"><input type="checkbox" className="mr-2" checked={expOpts.inlineData} onChange={e=>setExpOpts({...expOpts, inlineData:e.target.checked})}/>Inline data</label>
              <label className="block text-sm"><input type="checkbox" className="mr-2" checked={expOpts.includeLocalLibs} onChange={e=>setExpOpts({...expOpts, includeLocalLibs:e.target.checked})}/>Include local libs</label>
              <label className="block text-sm"><input type="checkbox" className="mr-2" checked={expOpts.includeRoutes} onChange={e=>setExpOpts({...expOpts, includeRoutes:e.target.checked})}/>Include routes</label>
              <label className="block text-sm">Map Style URL (leave blank for satellite)
                <input className="w-full mt-1 rounded border p-1" value={expOpts.styleURL} onChange={e=>setExpOpts({...expOpts, styleURL:e.target.value})} placeholder="https://example.com/style.json"/>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button className="px-3 py-1 rounded bg-gray-200" onClick={()=>setExportOpen(false)}>Cancel</button>
                <button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={doExport}>{exporting ? 'Preparing…' : 'Export'}</button>
              </div>
            </div>
          </div>
        )}
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
