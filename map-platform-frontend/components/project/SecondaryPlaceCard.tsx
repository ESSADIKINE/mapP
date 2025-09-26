'use client'

import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Route as RouteIcon, Trash2 } from 'lucide-react'
import { computeRoute, prettyLatLng } from '@/lib/api'
import { useStudio } from '@/lib/studioStore'
import type { LibraryAsset, Place } from '@/types'
import { AssetSelectorField } from '@/components/library/AssetSelectorField'
import { PlaceTypeSelectField } from '@/components/library/PlaceTypeSelectField'
import { MediaPreview } from './MediaPreview'

interface SecondaryPlaceCardProps {
  place: Place
}

export function SecondaryPlaceCard({ place }: SecondaryPlaceCardProps) {
  const [isRouting, setIsRouting] = useState(false)
  const { project, backend, replaceSecondary, removeSecondary, setSelectedPlace, setHoveredPlace } = useStudio((state) => ({
    project: state.project,
    backend: state.backend,
    replaceSecondary: state.replaceSecondary,
    removeSecondary: state.removeSecondary,
    setSelectedPlace: state.setSelectedPlace,
    setHoveredPlace: state.setHoveredPlace,
  }))

  const placeId = place._id as string
  const coordinates = useMemo(() => prettyLatLng(place.latitude, place.longitude), [place.latitude, place.longitude])

  const update = useCallback(
    (patch: Partial<Place>) => {
      if (!placeId) return
      replaceSecondary(placeId, patch)
    },
    [placeId, replaceSecondary],
  )

  const handleHeroAsset = useCallback(
    (asset: LibraryAsset | null) => {
      if (asset) {
        update({ virtualtour: asset.url, tourUrl: undefined })
      } else {
        update({ virtualtour: undefined })
      }
    },
    [update],
  )

  const handleLogoAsset = useCallback(
    (asset: LibraryAsset | null) => {
      update({ logoUrl: asset?.url })
    },
    [update],
  )

  const handleRoute = useCallback(async () => {
    if (!placeId) return
    setIsRouting(true)
    try {
      const result = await computeRoute(project, place, backend)
      update({
        routeSummary: {
          encoded: result.encoded,
          distanceMeters: result.distanceMeters,
          durationSeconds: result.durationSeconds,
          pretty: result.summary,
          geojson: result.feature,
        },
        footerInfo: {
          ...place.footerInfo,
          distance: result.summary.distance,
          time: result.summary.time,
        },
      })
    } catch (error) {
      console.error('Routing failed', error)
      alert('Unable to compute route. Please try again later.')
    } finally {
      setIsRouting(false)
    }
  }, [backend, place, placeId, project, update])

  const handleRemove = useCallback(async () => {
    if (!window.confirm('Remove this secondary place?')) return
    try {
      if (project._id && place._id && !String(place._id).startsWith('temp-')) {
        await fetch(`${backend}/api/projects/${project._id}/places/${place._id}`, { method: 'DELETE' })
      }
    } catch (error) {
      console.warn('Delete request failed', error)
    }
    removeSecondary(placeId)
  }, [backend, place._id, placeId, project._id, removeSecondary])

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="rounded-3xl border border-navy-100 bg-white/90 p-5 shadow-lg transition hover:border-gold-400"
      onMouseEnter={() => setHoveredPlace(placeId)}
      onMouseLeave={() => setHoveredPlace(null)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <input
            value={place.name}
            onChange={(event) => update({ name: event.target.value })}
            className="w-full rounded-2xl border border-transparent bg-navy-50/60 px-4 py-2 text-base font-semibold text-navy-900 focus:border-gold-400 focus:outline-none"
          />
          <p className="mt-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-navy-500">
            <MapPin className="h-4 w-4" /> {coordinates}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="rounded-full bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <PlaceTypeSelectField
          label="Place type"
          value={place.placeType}
          onChange={(next) => update({ placeType: next })}
        />
        <label className="space-y-1 text-xs font-medium text-navy-700">
          Google Maps link
          <input
            value={place.googleMapsUrl ?? ''}
            onChange={(event) => update({ googleMapsUrl: event.target.value })}
            className="w-full rounded-xl border border-navy-100 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-navy-700">
          Latitude
          <input
            type="number"
            step="0.000001"
            value={place.latitude}
            onChange={(event) => update({ latitude: parseFloat(event.target.value) })}
            className="w-full rounded-xl border border-navy-100 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-navy-700">
          Longitude
          <input
            type="number"
            step="0.000001"
            value={place.longitude}
            onChange={(event) => update({ longitude: parseFloat(event.target.value) })}
            className="w-full rounded-xl border border-navy-100 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-navy-700 md:col-span-2">
          Tour URL
          <input
            value={place.tourUrl ?? ''}
            onChange={(event) => update({ tourUrl: event.target.value, virtualtour: undefined })}
            className="w-full rounded-xl border border-navy-100 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-navy-700 md:col-span-2">
          Address
          <input
            value={place.address ?? ''}
            onChange={(event) => update({ address: event.target.value })}
            className="w-full rounded-xl border border-navy-100 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-navy-700">
          Phone
          <input
            value={place.phone ?? ''}
            onChange={(event) => update({ phone: event.target.value })}
            className="w-full rounded-xl border border-navy-100 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-navy-700">
          Description
          <textarea
            value={place.description ?? ''}
            onChange={(event) => update({ description: event.target.value })}
            rows={3}
            className="w-full rounded-xl border border-navy-100 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AssetSelectorField
          label="360° image"
          description="Select a panorama from the library"
          type="panorama"
          value={place.virtualtour}
          backend={backend}
          onChange={handleHeroAsset}
        />
        <AssetSelectorField
          label="Place logo"
          description="Logos replace legacy 3D models"
          type="logo"
          value={place.logoUrl}
          backend={backend}
          onChange={handleLogoAsset}
        />
      </div>

      {((place.virtualtour && place.tourUrl) || (!place.virtualtour && !place.tourUrl)) && (
        <p className="mt-3 text-xs font-medium text-rose-600">Provide either a 360° image or a tour URL.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <MediaPreview name={place.name} virtualtour={place.virtualtour} tourUrl={place.tourUrl} />
        <button
          type="button"
          onClick={() => setSelectedPlace(placeId)}
          className="rounded-full border border-navy-200 px-3 py-1.5 text-sm font-semibold text-navy-700 transition hover:border-gold-400 hover:text-gold-600"
        >
          Focus on map
        </button>
        <button
          type="button"
          onClick={handleRoute}
          disabled={isRouting}
          className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-4 py-1.5 text-sm font-semibold text-white shadow transition hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-400"
        >
          <RouteIcon className="h-4 w-4" /> {isRouting ? 'Calculating…' : 'Compute route'}
        </button>
      </div>

      {place.routeSummary?.pretty && (
        <p className="mt-3 rounded-2xl bg-navy-50 px-3 py-2 text-sm font-medium text-navy-800">
          Route · {place.routeSummary.pretty.distance} • {place.routeSummary.pretty.time}
        </p>
      )}
    </motion.article>
  )
}
