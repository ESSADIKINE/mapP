'use client'

import { create } from 'zustand'
import type { Project, Place } from '@/types'

const defaultProject: Project = {
  title: 'Untitled Project',
  description: 'Describe your project…',
  styleURL: '',
  principal: {
    name: 'Residence',
    latitude: 33.529234683566955,
    longitude: -7.685066910530196,
    category: 'Principal',
    googleMapsUrl: '',
    address: '',
    phone: '',
    description: '',
    placeType: '',
    zoom: 16.4,
    heading: 0,
    footerInfo: { location: 'Oulfa' },
  },
  secondaries: [],
}

export function createDefaultProject(): Project {
  return {
    ...defaultProject,
    principal: {
      ...defaultProject.principal,
      footerInfo: { ...defaultProject.principal.footerInfo },
    },
    secondaries: [],
  }
}

export type StudioState = {
  backend: string
  project: Project
  mapLib: typeof import('maplibre-gl') | null
  mapInstance: import('maplibre-gl').Map | null
  hoveredPlaceId: string | null
  selectedPlaceId: string | null
  setBackend: (url: string) => void
  setProject: (project: Project) => void
  updateProject: (patch: Partial<Project>) => void
  updatePrincipal: (patch: Partial<Place>) => void
  addSecondary: (place?: Partial<Place>) => Place
  replaceSecondary: (id: string, patch: Partial<Place>) => void
  removeSecondary: (id: string) => void
  setMapLib: (lib: typeof import('maplibre-gl') | null) => void
  setMapInstance: (map: import('maplibre-gl').Map | null) => void
  setHoveredPlace: (id: string | null) => void
  setSelectedPlace: (id: string | null) => void
  resetProject: () => void
}

function withId(place: Place | Partial<Place>): Place {
  if ('_id' in place && place._id) {
    return place as Place
  }

  const now = Date.now()
  return {
    name: place.name ?? 'Place',
    latitude: place.latitude ?? defaultProject.principal.latitude,
    longitude: place.longitude ?? defaultProject.principal.longitude,
    category: place.category ?? 'Secondary',
    googleMapsUrl: place.googleMapsUrl ?? '',
    address: place.address ?? '',
    phone: place.phone ?? '',
    description: place.description ?? '',
    placeType: place.placeType ?? '',
    footerInfo: place.footerInfo ?? {},
    routeSummary: place.routeSummary ?? null,
    logoUrl: place.logoUrl,
    tourUrl: place.tourUrl,
    virtualtour: place.virtualtour,
    zoom: place.zoom,
    bounds: place.bounds as Place['bounds'],
    heading: place.heading,
    routesFromBase: place.routesFromBase,
    _id: `temp-${now}-${Math.random().toString(36).slice(2, 9)}`,
  }
}

export const useStudio = create<StudioState>((set, get) => ({
  backend: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000',
  project: createDefaultProject(),
  mapLib: null,
  mapInstance: null,
  hoveredPlaceId: null,
  selectedPlaceId: null,

  setBackend: (url) => set({ backend: url }),
  setProject: (project) => set({ project }),
  updateProject: (patch) => set({ project: { ...get().project, ...patch } }),
  updatePrincipal: (patch) =>
    set({ project: { ...get().project, principal: { ...get().project.principal, ...patch } } }),
  addSecondary: (place) => {
    const newPlace = withId({ category: 'Secondary', ...place })
    set({ project: { ...get().project, secondaries: [...get().project.secondaries, newPlace] } })
    return newPlace
  },
  replaceSecondary: (id, patch) => {
    set({
      project: {
        ...get().project,
        secondaries: get().project.secondaries.map((p) =>
          p._id === id ? { ...p, ...patch } : p,
        ),
      },
    })
  },
  removeSecondary: (id) => {
    set({
      project: {
        ...get().project,
        secondaries: get().project.secondaries.filter((p) => p._id !== id),
      },
    })
  },
  setMapLib: (lib) => set({ mapLib: lib }),
  setMapInstance: (map) => set({ mapInstance: map }),
  setHoveredPlace: (id) => set({ hoveredPlaceId: id }),
  setSelectedPlace: (id) => set({ selectedPlaceId: id }),
  resetProject: () => set({ project: createDefaultProject() }),
}))
