import polyline from 'polyline';

/**
 * Decode an encoded polyline string into GeoJSON coordinates.
 * Attempts to auto-detect precision (5 or 6).
 * @param {string} str
 * @returns {number[][]} Array of [lon, lat]
 */
export function decodePolyline(str) {
  if (!str || typeof str !== 'string') return [];
  const precision = str.includes('?') || str.length > 1e5 ? 6 : 5; // naive heuristic
  return polyline.decode(str, precision).map(([lat, lon]) => [lon, lat]);
}

