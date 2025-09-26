'use client'

import { create } from 'zustand'
import type { AssetKind, LibraryAsset, PlaceTypeDefinition } from '@/types'
import * as libraryApi from './libraryApi'

interface AssetLibraryState {
  logos: LibraryAsset[]
  panoramas: LibraryAsset[]
  placeTypes: PlaceTypeDefinition[]
  loading: boolean
  initialized: boolean
  error?: string
  fetchAll: (backend: string) => Promise<void>
  createAsset: (
    backend: string,
    payload: { type: AssetKind; label: string; url: string; publicId?: string },
  ) => Promise<LibraryAsset>
  updateAsset: (
    backend: string,
    id: string,
    payload: Partial<Pick<LibraryAsset, 'label' | 'url' | 'publicId'>>,
  ) => Promise<LibraryAsset>
  deleteAsset: (backend: string, id: string, type: AssetKind) => Promise<void>
  createPlaceType: (
    backend: string,
    payload: { name: string; description?: string },
  ) => Promise<PlaceTypeDefinition>
  updatePlaceType: (
    backend: string,
    id: string,
    payload: Partial<Pick<PlaceTypeDefinition, 'name' | 'description'>>,
  ) => Promise<PlaceTypeDefinition>
  deletePlaceType: (backend: string, id: string) => Promise<void>
}

function sortAssets(items: LibraryAsset[]): LibraryAsset[] {
  return [...items].sort((a, b) => a.label.localeCompare(b.label))
}

function sortPlaceTypes(items: PlaceTypeDefinition[]): PlaceTypeDefinition[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}

export const useAssetLibrary = create<AssetLibraryState>((set, get) => ({
  logos: [],
  panoramas: [],
  placeTypes: [],
  loading: false,
  initialized: false,
  error: undefined,

  fetchAll: async (backend) => {
    const state = get()
    if (state.loading) return
    set({ loading: true, error: undefined })
    try {
      const [logos, panoramas, placeTypes] = await Promise.all([
        libraryApi.fetchAssets(backend, 'logo'),
        libraryApi.fetchAssets(backend, 'panorama'),
        libraryApi.fetchPlaceTypes(backend),
      ])
      set({
        logos: sortAssets(logos),
        panoramas: sortAssets(panoramas),
        placeTypes: sortPlaceTypes(placeTypes),
        loading: false,
        initialized: true,
        error: undefined,
      })
    } catch (error) {
      console.error('Failed to fetch asset library', error)
      set({
        loading: false,
        initialized: true,
        error: error instanceof Error ? error.message : 'Unable to load asset library',
      })
    }
  },

  createAsset: async (backend, payload) => {
    const asset = await libraryApi.createAsset(backend, payload)
    set((state) =>
      payload.type === 'logo'
        ? { logos: sortAssets([...state.logos.filter((item) => item._id !== asset._id), asset]) }
        : { panoramas: sortAssets([...state.panoramas.filter((item) => item._id !== asset._id), asset]) },
    )
    return asset
  },

  updateAsset: async (backend, id, payload) => {
    const asset = await libraryApi.updateAsset(backend, id, payload)
    set((state) =>
      asset.type === 'logo'
        ? { logos: sortAssets(state.logos.map((item) => (item._id === asset._id ? asset : item))) }
        : { panoramas: sortAssets(state.panoramas.map((item) => (item._id === asset._id ? asset : item))) },
    )
    return asset
  },

  deleteAsset: async (backend, id, type) => {
    await libraryApi.deleteAsset(backend, id)
    set((state) =>
      type === 'logo'
        ? { logos: state.logos.filter((item) => item._id !== id) }
        : { panoramas: state.panoramas.filter((item) => item._id !== id) },
    )
  },

  createPlaceType: async (backend, payload) => {
    const item = await libraryApi.createPlaceType(backend, payload)
    set((state) => ({ placeTypes: sortPlaceTypes([...state.placeTypes, item]) }))
    return item
  },

  updatePlaceType: async (backend, id, payload) => {
    const item = await libraryApi.updatePlaceType(backend, id, payload)
    set((state) => ({
      placeTypes: sortPlaceTypes(state.placeTypes.map((p) => (p._id === item._id ? item : p))),
    }))
    return item
  },

  deletePlaceType: async (backend, id) => {
    await libraryApi.deletePlaceType(backend, id)
    set((state) => ({ placeTypes: state.placeTypes.filter((p) => p._id !== id) }))
  },
}))
