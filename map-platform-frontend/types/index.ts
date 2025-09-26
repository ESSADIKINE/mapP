import type { Feature } from 'geojson'

export type PlaceCategory = 'Principal' | 'Secondary' | 'Other'

export interface PlaceFooterInfo {
  location?: string
  distance?: string
  time?: string
}

export interface RouteSummary {
  encoded?: string
  distanceMeters?: number
  durationSeconds?: number
  pretty?: {
    distance?: string
    time?: string
  }
  geojson?: Feature
}

export interface Place {
  _id?: string
  name: string
  latitude: number
  longitude: number
  virtualtour?: string
  tourUrl?: string
  googleMapsUrl?: string
  logoUrl?: string
  zoom?: number
  bounds?: [number, number][]
  heading?: number
  address?: string
  phone?: string
  description?: string
  placeType?: string
  category: PlaceCategory
  routesFromBase?: string[]
  footerInfo?: PlaceFooterInfo
  routeSummary?: RouteSummary | null
}

export interface Project {
  _id?: string
  title: string
  logoUrl?: string
  description?: string
  styleURL?: string
  principal: Place
  secondaries: Place[]
  createdAt?: string
  updatedAt?: string
}

export interface ProjectSummary {
  _id: string
  title: string
  createdAt?: string
  updatedAt?: string
}

export interface UploadResponse {
  url: string
  public_id: string
  bytes?: number
  width?: number
  height?: number
}

export type AssetKind = 'logo' | 'panorama'

export interface LibraryAsset {
  _id: string
  id?: string
  type: AssetKind
  label: string
  url: string
  publicId?: string
  createdAt?: string
  updatedAt?: string
}

export interface PlaceTypeDefinition {
  _id: string
  id?: string
  name: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

export interface ExportOptions {
  includeSecondaries: boolean
  includeRoutes: boolean
  includeImages: boolean
}

// Ambient declaration for untyped dependency
declare module 'react-pannellum'