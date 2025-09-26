import { create } from 'zustand';
import { getRoute, formatKm, formatHhMm } from '@/lib/osrm';
import { DEFAULT_MODEL_URL } from '@/lib/constants';
import { Place, Project, ActiveRoute } from '@/lib/types';
import { tempId } from '@/lib/utils';

type MapLib = typeof import('maplibre-gl') | null;
type MapInstance = import('maplibre-gl').Map | null;

interface StudioState {
  backend: string;
  project: Project;
  hoveredPlaceId: string | null;
  selectedPlaceId: string | null;
  mapLib: MapLib;
  mapInstance: MapInstance;
  activeRoute?: ActiveRoute;
  isRouting: boolean;
  modelUrl: string;
  panoramaUrl?: string;

  setProject: (project: Project) => void;
  updateProject: (patch: Partial<Project>) => void;
  updatePrincipal: (patch: Partial<Place>) => void;
  addSecondary: (place?: Partial<Place>) => string;
  updateSecondary: (id: string, patch: Partial<Place>) => void;
  removeSecondary: (id: string) => void;
  setHoveredPlace: (id: string | null) => void;
  setSelectedPlace: (id: string | null) => void;
  setMapLib: (lib: MapLib) => void;
  setMapInstance: (map: MapInstance) => void;
  setRoute: (route?: ActiveRoute) => void;
  requestRoute: (place: Place) => Promise<void>;
  setModelUrl: (url: string) => void;
  setPanoramaUrl: (url?: string) => void;
}

const defaultProject: Project = {
  title: 'Untitled Development',
  description: 'Craft immersive map experiences with an elegant studio.',
  styleURL: '',
  logoUrl: '',
  principal: {
    _id: 'principal',
    name: 'Headquarters',
    latitude: 33.529234683566955,
    longitude: -7.685066910530196,
    category: 'Principal',
    googleMapsUrl: '',
    address: 'Oulfa',
    phone: '',
    description: '',
    placeType: 'Residence',
    zoom: 16.4,
    heading: 0,
    footerInfo: {
      location: 'Oulfa'
    }
  },
  secondaries: []
};

export const useStudioStore = create<StudioState>((set, get) => ({
  backend: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000',
  project: defaultProject,
  hoveredPlaceId: null,
  selectedPlaceId: 'principal',
  mapLib: null,
  mapInstance: null,
  activeRoute: undefined,
  isRouting: false,
  modelUrl: DEFAULT_MODEL_URL,
  panoramaUrl: undefined,

  setProject: (project) => set({ project }),
  updateProject: (patch) => set({ project: { ...get().project, ...patch } }),
  updatePrincipal: (patch) =>
    set({
      project: {
        ...get().project,
        principal: { ...get().project.principal, ...patch }
      }
    }),
  addSecondary: (place) => {
    const id = place?._id ?? tempId('place');
    const next: Place = {
      _id: id,
      name: place?.name ?? 'New location',
      latitude: place?.latitude ?? get().project.principal.latitude,
      longitude: place?.longitude ?? get().project.principal.longitude,
      category: place?.category ?? 'Secondary',
      googleMapsUrl: place?.googleMapsUrl ?? '',
      address: place?.address ?? '',
      phone: place?.phone ?? '',
      description: place?.description ?? '',
      placeType: place?.placeType ?? '',
      zoom: place?.zoom ?? get().project.principal.zoom,
      heading: place?.heading ?? 0,
      footerInfo: place?.footerInfo ?? {}
    };
    set({
      project: {
        ...get().project,
        secondaries: [...get().project.secondaries, next]
      },
      selectedPlaceId: id
    });
    return id;
  },
  updateSecondary: (id, patch) => {
    set({
      project: {
        ...get().project,
        secondaries: get().project.secondaries.map((place) =>
          place._id === id ? { ...place, ...patch } : place
        )
      }
    });
  },
  removeSecondary: (id) => {
    set({
      project: {
        ...get().project,
        secondaries: get().project.secondaries.filter((place) => place._id !== id)
      },
      selectedPlaceId: 'principal'
    });
  },
  setHoveredPlace: (id) => set({ hoveredPlaceId: id }),
  setSelectedPlace: (id) => set({ selectedPlaceId: id }),
  setMapLib: (lib) => set({ mapLib: lib }),
  setMapInstance: (map) => set({ mapInstance: map }),
  setRoute: (route) => set({ activeRoute: route }),
  requestRoute: async (place) => {
    const { project } = get();
    if (!project.principal || !place) return;
    set({ isRouting: true });
    try {
      const route = await getRoute({
        coords: [
          [project.principal.longitude, project.principal.latitude],
          [place.longitude, place.latitude]
        ],
        profile: 'driving'
      });
      const summary = {
        distance: formatKm(route.distanceMeters),
        duration: formatHhMm(route.durationSeconds)
      };
      set({
        activeRoute: { id: place._id ?? place.name, geometry: route.geometry, summary }
      });
    } catch (error) {
      console.error('Failed to compute route', error);
      set({ activeRoute: undefined });
    } finally {
      set({ isRouting: false });
    }
  },
  setModelUrl: (url) => set({ modelUrl: url }),
  setPanoramaUrl: (url) => set({ panoramaUrl: url || undefined })
}));

export type StudioStore = ReturnType<typeof useStudioStore.getState>;
