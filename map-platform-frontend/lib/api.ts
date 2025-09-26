'use client'

import type { Feature, LineString } from 'geojson'
import type { Place, Project, ProjectSummary, UploadResponse } from '@/types'
import { formatHhMm, formatKm, getRoute } from './osrm'

export function prettyLatLng(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

export async function uploadImage(file: File, backend: string): Promise<UploadResponse> {
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${backend}/api/upload`, { method: 'POST', body: fd })

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`)
    }

    return res.json()
  } catch (error) {
    console.warn('Falling back to mock upload response', error)
    return {
      url: URL.createObjectURL(file),
      public_id: `mock-${Date.now()}`,
      bytes: file.size,
    }
  }
}

export function sanitizeProject(project: Project): Project {
  const cleanPlace = (place: Place): Place => {
    const cleaned: Place = {
      ...place,
      virtualtour: place.virtualtour || undefined,
      tourUrl: place.tourUrl || undefined,
      logoUrl: place.logoUrl || undefined,
      googleMapsUrl: place.googleMapsUrl || undefined,
      address: place.address?.trim() || undefined,
      phone: place.phone?.trim() || undefined,
      description: place.description?.trim() || undefined,
      placeType: place.placeType?.trim() || undefined,
      footerInfo: place.footerInfo,
      routeSummary: place.routeSummary,
    }

    return cleaned
  }

  return {
    ...project,
    logoUrl: project.logoUrl || undefined,
    styleURL: project.styleURL || undefined,
    principal: cleanPlace(project.principal),
    secondaries: project.secondaries.map(cleanPlace),
  }
}

export async function saveProject(project: Project, backend: string): Promise<Project> {
  const payload = sanitizeProject(project)
  const hasId = Boolean(project._id)
  const endpoint = hasId ? `${backend}/api/projects/${project._id}` : `${backend}/api/projects`
  const method = hasId ? 'PUT' : 'POST'

  try {
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error(`Save failed: ${res.status}`)
    }

    return res.json()
  } catch (error) {
    console.warn('Falling back to mock project save', error)
    const mockId = project._id || `mock-${Date.now()}`
    return {
      ...project,
      _id: mockId,
      secondaries: project.secondaries.map((place, index) => ({
        ...place,
        _id: place._id || `place-${mockId}-${index}`,
      })),
      createdAt: project.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
}

export async function fetchProjectSummaries(backend: string): Promise<ProjectSummary[]> {
  try {
    const res = await fetch(`${backend}/api/projects`)
    if (!res.ok) {
      throw new Error(`List failed: ${res.status}`)
    }
    const items: ProjectSummary[] = await res.json()
    return items
  } catch (error) {
    console.error('Unable to fetch project list', error)
    throw error
  }
}

export async function fetchProjectById(id: string, backend: string): Promise<Project> {
  try {
    const res = await fetch(`${backend}/api/projects/${id}`)
    if (!res.ok) {
      throw new Error(`Fetch project failed: ${res.status}`)
    }
    const project: Project = await res.json()
    return {
      ...project,
      secondaries: project.secondaries ?? [],
    }
  } catch (error) {
    console.error('Unable to fetch project data', error)
    throw error
  }
}

export interface RouteComputationResult {
  feature: Feature<LineString>
  summary: {
    distance: string
    time: string
  }
  encoded: string
  distanceMeters: number
  durationSeconds: number
}

export async function computeRoute(
  project: Project,
  place: Place,
  backend: string,
): Promise<RouteComputationResult> {
  if (!project.principal || !place) {
    throw new Error('Missing principal or place')
  }

  const coords: [number, number][] = [
    [project.principal.longitude, project.principal.latitude],
    [place.longitude, place.latitude],
  ]

  try {
    const res = await fetch(
      `${backend}/api/projects/${project._id ?? 'new'}/places/${place._id ?? 'temp'}/route`,
      { method: 'POST' },
    )

    if (res.ok) {
      const data = await res.json()
      const feature: Feature<LineString> = data.geojson ??
        (data.encoded ? decodePolylineToFeature(data.encoded) : generateFallbackRoute(project.principal, place).feature)
      const coordinates = (feature.geometry as LineString).coordinates as [number, number][]
      return {
        feature,
        summary: data.pretty ?? {
          distance: formatKm(data.distance_m ?? 0),
          time: formatHhMm(data.duration_s ?? 0),
        },
        encoded: data.encoded ?? encodePolyline(coordinates),
        distanceMeters: data.distance_m ?? 0,
        durationSeconds: data.duration_s ?? 0,
      }
    }
  } catch (error) {
    console.warn('Backend route failed, trying OSRM', error)
  }

  try {
    const route = await getRoute({ coords, profile: 'driving' })
    const feature: Feature<LineString> = {
      type: 'Feature',
      geometry: route.geometry,
      properties: {},
    }
    const encoded = encodePolyline(route.geometry.coordinates as [number, number][])
    return {
      feature,
      summary: {
        distance: formatKm(route.distanceMeters),
        time: formatHhMm(route.durationSeconds),
      },
      encoded,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
    }
  } catch (error) {
    console.warn('OSRM route failed, generating fallback route', error)
    const fallback = generateFallbackRoute(project.principal, place)
    return fallback
  }
}

function decodePolylineToFeature(encoded: string): Feature<LineString> {
  const coords = decodePolyline(encoded)
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coords,
    },
    properties: {},
  }
}

function generateFallbackRoute(principal: Place, secondary: Place): RouteComputationResult {
  const coords = createSCurve(
    [principal.longitude, principal.latitude],
    [secondary.longitude, secondary.latitude],
  )
  const encoded = encodePolyline(coords)
  const distance = haversineDistance(principal.latitude, principal.longitude, secondary.latitude, secondary.longitude)
  const durationSeconds = Math.round((distance / 1000) * 180)

  return {
    feature: {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: {},
    },
    summary: {
      distance: `${(distance / 1000).toFixed(1)} km`,
      time: `${Math.max(1, Math.round(durationSeconds / 60))} min`,
    },
    encoded,
    distanceMeters: distance,
    durationSeconds,
  }
}

function createSCurve(start: [number, number], end: [number, number]): [number, number][] {
  const [startLng, startLat] = start
  const [endLng, endLat] = end
  const midLng = (startLng + endLng) / 2
  const midLat = (startLat + endLat) / 2
  const intensity = 0.01

  return [
    [startLng, startLat],
    [midLng - intensity, midLat + intensity],
    [midLng + intensity, midLat - intensity],
    [endLng, endLat],
  ]
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

function encodePolyline(coordinates: [number, number][]): string {
  let encoded = ''
  let lastLat = 0
  let lastLng = 0

  for (const [lng, lat] of coordinates) {
    const latDiff = Math.round((lat - lastLat) * 1e5)
    const lngDiff = Math.round((lng - lastLng) * 1e5)

    encoded += encodeNumber(latDiff) + encodeNumber(lngDiff)

    lastLat = lat
    lastLng = lng
  }

  return encoded
}

function decodePolyline(encoded: string): [number, number][] {
  let index = 0
  const coordinates: [number, number][] = []
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte: number

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += deltaLat

    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1
    lng += deltaLng

    coordinates.push([lng / 1e5, lat / 1e5])
  }

  return coordinates
}

function encodeNumber(num: number): string {
  num <<= 1
  if (num < 0) num = ~num

  let encoded = ''
  while (num >= 0x20) {
    encoded += String.fromCharCode((0x20 | (num & 0x1f)) + 63)
    num >>= 5
  }
  encoded += String.fromCharCode(num + 63)
  return encoded
}
