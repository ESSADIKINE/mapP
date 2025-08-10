// Placeholder for TypeScript type definitions
// This will define the data structures used in the application

export interface Project {
  id: string
  title: string
  logoUrl?: string
  description?: string
  principal: Place
  secondaries: Place[]
  createdAt: string
  updatedAt: string
}

export interface Place {
  id: string
  name: string
  latitude: number
  longitude: number
  virtualtour?: string
  zoom?: number
  bounds?: [number, number][]
  heading?: number
  category: 'Principal' | 'Secondary' | 'Other'
  routesFromBase?: string[]
  footerInfo?: {
    location?: string
    distance?: string
    time?: string
  }
}

export interface Route {
  id: string
  from: Place
  to: Place
  distance: number
  duration: number
  geometry: any
  instructions: string[]
}

export interface UploadResponse {
  url: string
  publicId: string
  format: string
  width: number
  height: number
} 