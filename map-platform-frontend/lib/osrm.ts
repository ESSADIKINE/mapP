/**
 * OSRM routing utilities.
 *
 * Provides a `getRoute` function that fetches routes from an OSRM server and
 * helpers for formatting distance and duration.
 *
 * The default host falls back to the public demo server if no environment
 * variable is supplied.
 *
 * @module osrm
 */

const DEFAULT_HOST = process.env.NEXT_PUBLIC_OSRM_HOST || 'https://router.project-osrm.org';

/** Mapping from generic profile names to OSRM profiles. */
const PROFILE_MAP: Record<string, string> = {
  driving: 'driving',
  walking: 'foot',
  cycling: 'bike'
};

/**
 * Format metres to kilometres with one decimal.
 *
 * @param {number} meters
 * @returns {string} e.g. `"12.3 km"`
 * @example
 * formatKm(1234); // '1.2 km'
 */
export function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format seconds to `hh:mm` (rounded to minutes).
 *
 * @param {number} seconds
 * @returns {string} e.g. `"01:05"`
 * @example
 * formatHhMm(3750); // '01:02'
 */
export function formatHhMm(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export interface RouteParams {
  coords: [number, number][];
  profile: 'driving' | 'walking' | 'cycling';
  host?: string;
}

export interface RouteResult {
  geometry: GeoJSON.LineString;
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * Fetch a route from OSRM.
 *
 * @param {RouteParams} params
 * @returns {Promise<RouteResult>}
 * @throws {Error} on validation failure or missing route
 *
 * @example
 * const route = await getRoute({
 *   coords: [[-122.42, 37.78], [-122.45, 37.91]],
 *   profile: 'driving'
 * });
 * map.getSource('route-source').setData({
 *   type: 'Feature',
 *   geometry: route.geometry,
 *   properties: {}
 * });
 * map.addLayer({ id: 'route-line', type: 'line', source: 'route-source' });
 * const summary = `${formatKm(route.distanceMeters)} • ${formatHhMm(route.durationSeconds)}`;
 */
export async function getRoute({ coords, profile, host = DEFAULT_HOST }: RouteParams): Promise<RouteResult> {
  if (!Array.isArray(coords) || coords.length < 2) {
    throw new Error('coords must contain at least two [lng,lat] pairs');
  }
  if (!['driving', 'walking', 'cycling'].includes(profile)) {
    throw new Error(`Unsupported profile: ${profile}`);
  }
  const osrmProfile = PROFILE_MAP[profile];
  const coordStr = coords.map(c => {
    if (!Array.isArray(c) || c.length !== 2 || c.some(v => typeof v !== 'number' || Number.isNaN(v))) {
      throw new Error('Invalid coordinate in coords');
    }
    return `${c[0]},${c[1]}`;
  }).join(';');

  const url = `${host.replace(/\/$/, '')}/route/v1/${osrmProfile}/${coordStr}?overview=full&geometries=geojson&steps=true&alternatives=false`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OSRM request failed: ${res.status}`);
  }
  const data = await res.json();
  if (!data.routes || !data.routes[0]) {
    throw new Error('No route found');
  }
  const route = data.routes[0];
  return {
    geometry: route.geometry,
    distanceMeters: route.distance,
    durationSeconds: route.duration
  };
}

// Minimal inline tests for format helpers
// Run with vitest: `vitest run lib/osrm.test.ts`
// These tests execute only when using Vitest's import.meta.vitest
if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;
  it('formatKm', () => {
    expect(formatKm(1234)).toBe('1.2 km');
  });
  it('formatHhMm', () => {
    expect(formatHhMm(3660)).toBe('01:01');
  });
}

export default getRoute;
