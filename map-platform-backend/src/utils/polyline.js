import polyline from 'polyline';

/**
 * Decode an encoded polyline string into GeoJSON coordinates.
 * Robustly auto-detects precision (5 or 6) by comparing path lengths.
 * @param {string} str
 * @returns {number[][]} Array of [lon, lat]
 */
export function decodePolyline(str) {
  if (!str || typeof str !== 'string') return [];
  try {
    const coords6 = polyline.decode(str, 6).map(([lat, lon]) => [lon, lat]);
    const coords5 = polyline.decode(str, 5).map(([lat, lon]) => [lon, lat]);

    const length = (coords) => {
      let d = 0;
      for (let i = 1; i < coords.length; i++) {
        d += haversine(coords[i - 1], coords[i]);
      }
      return d;
    };

    const len6 = length(coords6);
    const len5 = length(coords5);

    // Prefer the one with longer length (polyline5-decoded-6 will be ~10x shorter)
    const chosen = len6 >= len5 ? coords6 : coords5;

    // Defensive: filter out obviously invalid coords
    return chosen.filter(([lon, lat]) => isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180);
  } catch {
    // Fallback to precision 5
    return polyline.decode(str, 5).map(([lat, lon]) => [lon, lat]);
  }
}

function haversine(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

