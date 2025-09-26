'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Maximize2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { GeoJSONSource, Marker, StyleSpecification } from 'maplibre-gl'
import { useStudio } from '@/lib/studioStore'
import type { Place } from '@/types'

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '© Esri',
    },
  },
  layers: [
    {
      id: 'satellite-layer',
      type: 'raster',
      source: 'satellite',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
}

type MarkerEntry = {
  marker: Marker
  element: HTMLDivElement
}

export function StudioMap() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null)
  const [fullscreenContainerReady, setFullscreenContainerReady] = useState(false)
  const setFullscreenContainer = useCallback((el: HTMLDivElement | null) => {
    fullscreenContainerRef.current = el
    setFullscreenContainerReady(Boolean(el))
  }, [])
  const fullscreenMapRef = useRef<any | null>(null)
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map())
  const routesRef = useRef<Set<string>>(new Set())
  const currentStyleRef = useRef<string>('')
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  const {
    project,
    mapLib,
    setMapLib,
    mapInstance,
    setMapInstance,
    selectedPlaceId,
    hoveredPlaceId,
  } = useStudio((state) => ({
    project: state.project,
    mapLib: state.mapLib,
    setMapLib: state.setMapLib,
    mapInstance: state.mapInstance,
    setMapInstance: state.setMapInstance,
    selectedPlaceId: state.selectedPlaceId,
    hoveredPlaceId: state.hoveredPlaceId,
  }))

  // Load MapLibre library on demand
  useEffect(() => {
    if (mapLib) return
    let isMounted = true
    import('maplibre-gl').then((mod) => {
      const lib = (mod as any).default ?? mod
      if (!isMounted) return
      setMapLib(lib)
    })
    return () => {
      isMounted = false
    }
  }, [mapLib, setMapLib])

  // Initialize map instance (runs only when the library is available and no instance exists)
  useEffect(() => {
    if (!mapLib || mapInstance || !containerRef.current) {
      return
    }

    const map = new mapLib.Map({
      container: containerRef.current,
      style: project.styleURL || SATELLITE_STYLE,
      center: [project.principal.longitude, project.principal.latitude],
      zoom: project.principal.zoom ?? 14,
      maxZoom: 19,
    })

    currentStyleRef.current = typeof project.styleURL === 'string' && project.styleURL
      ? project.styleURL
      : 'satellite-default'

    map.addControl(new mapLib.NavigationControl({ visualizePitch: true }))
    map.addControl(new mapLib.AttributionControl({ compact: true }))

    map.on('load', () => {
      map.resize()
    })

    setMapInstance(map)

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove())
      markersRef.current.clear()
      routesRef.current.forEach((sourceId) => {
        if (map.getLayer(`${sourceId}-line`)) map.removeLayer(`${sourceId}-line`)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      })
      routesRef.current.clear()
      map.remove()
      if (useStudio.getState().mapInstance === map) {
        setMapInstance(null)
      }
    }
  }, [mapLib])

  // Update map style when style URL changes
  useEffect(() => {
    if (!mapInstance) return
    const nextStyle = project.styleURL && project.styleURL.trim().length > 0 ? project.styleURL : null
    const key = nextStyle ?? 'satellite-default'
    if (currentStyleRef.current === key) {
      return
    }
    currentStyleRef.current = key
    mapInstance.setStyle(nextStyle ?? (SATELLITE_STYLE as any))
  }, [mapInstance, project.styleURL])

  const allPlaces = useMemo(() => {
    const principalWithId: Place & { _markerId: string } = {
      ...project.principal,
      _id: project.principal._id ?? 'principal',
      _markerId: 'principal',
      category: 'Principal',
    }
    const secondaries = project.secondaries.map((place) => ({
      ...place,
      _markerId: place._id ?? `secondary-${place.latitude}-${place.longitude}`,
    }))
    return [principalWithId, ...secondaries]
  }, [project.principal, project.secondaries])

  // Update markers when places change
  useEffect(() => {
    if (!mapInstance || !mapLib) return

    const activeId = selectedPlaceId ?? 'principal'
    const hoveredId = hoveredPlaceId ?? null
    const usedIds = new Set<string>()

    allPlaces.forEach((place) => {
      const markerId = (place as any)._markerId as string
      usedIds.add(markerId)
      const existing = markersRef.current.get(markerId)
      const element = existing?.element ?? createMarkerElement({
        label: place.name,
        logoUrl: place.logoUrl,
        type: place.category,
      })

      if (!existing) {
        element.addEventListener('mouseenter', () => useStudio.getState().setHoveredPlace(markerId))
        element.addEventListener('mouseleave', () => useStudio.getState().setHoveredPlace(null))
        element.addEventListener('click', () => useStudio.getState().setSelectedPlace(markerId))
      }

      element.dataset.active = markerId === activeId ? 'true' : 'false'
      element.dataset.hovered = markerId === hoveredId ? 'true' : 'false'
      element.dataset.category = place.category

      // Keep logo and label in sync with latest place data
      const innerEl = element.querySelector('.studio-marker-inner') as HTMLDivElement | null
      if (innerEl) {
        const imgEl = innerEl.querySelector('img') as HTMLImageElement | null
        if (place.logoUrl) {
          if (imgEl) {
            if (imgEl.src !== place.logoUrl) {
              imgEl.src = place.logoUrl
              imgEl.alt = place.name
            }
          } else {
            innerEl.textContent = ''
            const newImg = document.createElement('img')
            newImg.src = place.logoUrl
            newImg.alt = place.name
            innerEl.appendChild(newImg)
          }
          innerEl.classList.add('has-image')
        } else if (imgEl) {
          // Remove image if logo removed and show fallback glyph
          imgEl.remove()
          innerEl.textContent = place.category === 'Principal' ? '★' : '●'
          innerEl.classList.remove('has-image')
        }
      }
      const captionEl = element.querySelector('.studio-marker-caption') as HTMLSpanElement | null
      if (captionEl && captionEl.textContent !== place.name) {
        captionEl.textContent = place.name
      }

      if (!existing) {
        const marker = new mapLib.Marker({ element, anchor: 'bottom' })
          .setLngLat([place.longitude, place.latitude])
          .addTo(mapInstance)
        markersRef.current.set(markerId, { marker, element })
      } else {
        existing.marker.setLngLat([place.longitude, place.latitude])
      }
    })

    // Remove markers that are no longer present
    Array.from(markersRef.current.entries()).forEach(([markerId, entry]) => {
      if (!usedIds.has(markerId)) {
        entry.marker.remove()
        markersRef.current.delete(markerId)
      }
    })
  }, [allPlaces, hoveredPlaceId, mapInstance, mapLib, selectedPlaceId])

  // Update routes
  useEffect(() => {
    if (!mapInstance) return

    const existingSources = new Set(routesRef.current)

    project.secondaries.forEach((place) => {
      const route = place.routeSummary?.geojson
      const markerId = place._id ?? ''
      const sourceId = `route-${markerId}`

      if (!route) {
        if (routesRef.current.has(sourceId)) {
          if (mapInstance.getLayer(`${sourceId}-line`)) mapInstance.removeLayer(`${sourceId}-line`)
          if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId)
          routesRef.current.delete(sourceId)
        }
        return
      }

      if (!mapInstance.getSource(sourceId)) {
        mapInstance.addSource(sourceId, {
          type: 'geojson',
          data: route,
        })
        mapInstance.addLayer({
          id: `${sourceId}-line`,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-width': 4,
            'line-color': '#FFD700',
            'line-opacity': 0.88,
          },
        })
      } else {
        const source = mapInstance.getSource(sourceId) as GeoJSONSource
        source.setData(route)
      }
      routesRef.current.add(sourceId)
      existingSources.delete(sourceId)
    })

    existingSources.forEach((sourceId) => {
      if (mapInstance.getLayer(`${sourceId}-line`)) mapInstance.removeLayer(`${sourceId}-line`)
      if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId)
      routesRef.current.delete(sourceId)
    })
  }, [mapInstance, project.secondaries])

  // Focus map on selected place
  useEffect(() => {
    if (!mapInstance) return
    const target = selectedPlaceId === 'principal'
      ? project.principal
      : project.secondaries.find((place) => place._id === selectedPlaceId)
    if (!target) return

    mapInstance.flyTo({
      center: [target.longitude, target.latitude],
      zoom: selectedPlaceId === 'principal' ? project.principal.zoom ?? 15 : Math.max(mapInstance.getZoom(), 15),
      speed: 1.2,
      curve: 1.6,
    })
  }, [mapInstance, project.principal, project.secondaries, selectedPlaceId])

  // Fullscreen map lifecycle (separate instance)
  useEffect(() => {
    if (!fullscreenOpen || !mapLib || !fullscreenContainerRef.current || !fullscreenContainerReady) return

    const fsMap = new mapLib.Map({
      container: fullscreenContainerRef.current,
      style: project.styleURL || SATELLITE_STYLE,
      center: [project.principal.longitude, project.principal.latitude],
      zoom: Math.max(15, project.principal.zoom ?? 14),
      maxZoom: 19,
    })

    fsMap.addControl(new mapLib.NavigationControl({ visualizePitch: true }))
    fsMap.addControl(new mapLib.AttributionControl({ compact: true }))

    const handleResize = () => fsMap.resize()
    const id = setTimeout(handleResize, 50)

    fsMap.on('load', handleResize)
    const raf = requestAnimationFrame(handleResize)
    window.addEventListener('resize', handleResize)

    const localMarkers: Array<{ id: string; marker: any }> = []
    const places: Array<Place & { _markerId: string }> = [
      {
        ...project.principal,
        _id: project.principal._id ?? 'principal',
        _markerId: 'principal',
        category: 'Principal',
      },
      ...project.secondaries.map((p) => ({
        ...p,
        _markerId: p._id ?? `secondary-${p.latitude}-${p.longitude}`,
      })),
    ]

    places.forEach((place) => {
      const element = createMarkerElement({ label: place.name, logoUrl: place.logoUrl, type: place.category })
      const marker = new mapLib.Marker({ element, anchor: 'bottom' })
        .setLngLat([place.longitude, place.latitude])
        .addTo(fsMap)
      localMarkers.push({ id: place._markerId, marker })
    })

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(id)
      window.removeEventListener('resize', handleResize)
      localMarkers.forEach(({ marker }) => marker.remove())
      fsMap.remove()
    }
  }, [fullscreenOpen, fullscreenContainerReady, mapLib, project.principal, project.secondaries, project.styleURL])

  return (
    <>
      <motion.div
        layout
        className="relative h-full w-full overflow-hidden rounded-3xl border border-navy-100 bg-navy-900/80 shadow-xl"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div ref={containerRef} className="h-full w-full" />
        <div className="pointer-events-none absolute left-6 top-6 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-navy-800 shadow">
          Map preview
        </div>
        <button
          type="button"
          onClick={() => setFullscreenOpen(true)}
          className="absolute right-4 bottom-4 z-10 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold text-navy-900 shadow transition hover:bg-white"
        >
          <Maximize2 className="h-4 w-4" /> Fullscreen
        </button>
      </motion.div>

      <Dialog.Root open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-navy-900/70 backdrop-blur" />
          <Dialog.Content className="fixed inset-0 z-50 m-auto flex h-[95vh] w-[95vw] max-w-[1600px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-navy-100 px-4 py-2">
              <Dialog.Title className="text-sm font-semibold text-navy-900">Fullscreen Map</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="rounded-full p-2 text-navy-700 hover:bg-navy-50">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <div ref={setFullscreenContainer} className="w-full flex-1 min-h-[300px]" />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

function createMarkerElement({ label, logoUrl, type }: { label: string; logoUrl?: string; type: Place['category'] }) {
  const el = document.createElement('div')
  el.className = 'studio-marker'
  const caption = document.createElement('span')
  caption.textContent = label
  caption.className = 'studio-marker-caption'
  el.appendChild(caption)
  const inner = document.createElement('div')
  inner.className = 'studio-marker-inner'
  if (logoUrl) {
    const img = document.createElement('img')
    img.src = logoUrl
    img.alt = label
    inner.appendChild(img)
    inner.classList.add('has-image')
  } else {
    inner.textContent = type === 'Principal' ? '★' : '●'
  }
  el.appendChild(inner)
  return el
}
