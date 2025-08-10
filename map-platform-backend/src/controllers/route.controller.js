import axios from 'axios';
import polyline from 'polyline';
import { Project } from '../models/Project.js';

const useMapbox = !!process.env.MAPBOX_ACCESS_TOKEN;

async function fetchRouteMapbox({ from, to }) {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  const profile = process.env.MAPBOX_PROFILE || 'driving';
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}`;
  const { data } = await axios.get(url, {
    params: { access_token: token, geometries: 'polyline', overview: 'full' }
  });
  const route = data?.routes?.[0];
  if (!route) throw new Error('NoRoute');
  return {
    distance: route.distance, // meters
    duration: route.duration, // seconds
    encoded: route.geometry
  };
}

async function fetchRouteGraphHopper({ from, to }) {
  const base = process.env.GRAPHHOPPER_BASE_URL;
  const key = process.env.GRAPHHOPPER_API_KEY;
  if (!base || !key) throw new Error('GraphHopperNotConfigured');
  const { data } = await axios.get(`${base}/route`, {
    params: {
      point: [`${from.lat},${from.lng}`, `${to.lat},${to.lng}`],
      key,
      profile: 'car',
      points_encoded: true
    },
    paramsSerializer: p => new URLSearchParams(p).toString()
  });
  const path = data?.paths?.[0];
  if (!path) throw new Error('NoRoute');
  return {
    distance: path.distance,
    duration: path.time / 1000,
    encoded: path.points
  };
}

export const getRoute = async (req, res) => {
  const [fromLat, fromLng] = (req.query.from || '').split(',').map(Number);
  const [toLat, toLng] = (req.query.to || '').split(',').map(Number);
  if (!fromLat || !fromLng || !toLat || !toLng) {
    return res.status(400).json({ error: 'InvalidCoordinates' });
  }

  const args = { from: { lat: fromLat, lng: fromLng }, to: { lat: toLat, lng: toLng } };

  try {
    const r = useMapbox ? await fetchRouteMapbox(args) : await fetchRouteGraphHopper(args);
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
    const r = useMapbox ? await fetchRouteMapbox({ from, to }) : await fetchRouteGraphHopper({ from, to });
    // human-friendly values
    const km = (r.distance / 1000).toFixed(1) + ' KM';
    const mins = Math.round(r.duration / 60) + ' mins';

    // attach
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
