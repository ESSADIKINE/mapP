// Placeholder for the Zustand store
// This will manage global application state

import { create } from 'zustand'

interface AppState {
  projects: any[]
  currentProject: any | null
  places: any[]
  isLoading: boolean
  error: string | null
  
  // Actions
  setProjects: (projects: any[]) => void
  setCurrentProject: (project: any | null) => void
  setPlaces: (places: any[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  projects: [],
  currentProject: null,
  places: [],
  isLoading: false,
  error: null,
  
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setPlaces: (places) => set({ places }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
})) 