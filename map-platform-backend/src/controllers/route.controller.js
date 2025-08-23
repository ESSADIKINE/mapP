import axios from 'axios';
import polyline from 'polyline';
import { Project } from '../models/Project.js';

const OSRM_HOST = process.env.OSRM_HOST || 'https://router.project-osrm.org';

async function fetchRouteOSRM({ from, to, profile = 'driving' }) {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${OSRM_HOST}/route/v1/${profile}/${coords}`;
  const { data } = await axios.get(url, {
    params: {
      overview: 'full',
      geometries: 'geojson',
      steps: false,
      alternatives: false
    }
  });
  const route = data?.routes?.[0];
  if (!route) throw new Error('NoRoute');
  const encoded = polyline.encode(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
  return { distance: route.distance, duration: route.duration, encoded };
}

export const getRoute = async (req, res) => {
  const [fromLat, fromLng] = (req.query.from || '').split(',').map(Number);
  const [toLat, toLng] = (req.query.to || '').split(',').map(Number);
  const profile = req.query.profile || 'driving';
  if (!fromLat || !fromLng || !toLat || !toLng) {
    return res.status(400).json({ error: 'InvalidCoordinates' });
  }
  try {
    const r = await fetchRouteOSRM({ from: { lat: fromLat, lng: fromLng }, to: { lat: toLat, lng: toLng }, profile });
    return res.json(r);
  } catch (e) {
    console.error('Route error:', e.message);
    return res.status(502).json({ error: 'RoutingFailed', message: e.message });
  }
};

export const computeAndAttachRouteToSecondary = async (req, res) => {
  const { projectId, placeId } = req.params;
  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ error: 'NotFound' });

  const secondary = project.secondaries.id(placeId);
  if (!secondary) return res.status(404).json({ error: 'PlaceNotFound' });

  const from = { lat: project.principal.latitude, lng: project.principal.longitude };
  const to = { lat: secondary.latitude, lng: secondary.longitude };

  try {
    const profile = req.query.profile || 'driving';
    const r = await fetchRouteOSRM({ from, to, profile });
    const km = (r.distance / 1000).toFixed(1) + ' KM';
    const mins = Math.round(r.duration / 60) + ' mins';
    secondary.routesFromBase = [r.encoded];
    secondary.footerInfo = { ...(secondary.footerInfo || {}), distance: km, time: mins };
    await project.save();
    return res.json({
      encoded: r.encoded,
      distance_m: r.distance,
      duration_s: r.duration,
      pretty: { distance: km, time: mins }
    });
  } catch (e) {
    console.error('Compute route error:', e.message);
    return res.status(502).json({ error: 'RoutingFailed', message: e.message });
  }
};
