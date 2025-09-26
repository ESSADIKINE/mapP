'use client'

import { useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStudio } from '@/lib/studioStore'
import { prettyLatLng } from '@/lib/api'
import type { LibraryAsset } from '@/types'
import { AssetSelectorField } from '@/components/library/AssetSelectorField'
import { PlaceTypeSelectField } from '@/components/library/PlaceTypeSelectField'
import { MediaPreview } from './MediaPreview'

export function PrincipalPlaceForm() {
  const { project, updatePrincipal, backend } = useStudio((state) => ({
    project: state.project,
    updatePrincipal: state.updatePrincipal,
    backend: state.backend,
  }))

  const principal = project.principal

  const locationSummary = useMemo(
    () => prettyLatLng(principal.latitude, principal.longitude),
    [principal.latitude, principal.longitude],
  )

  const handleHeroAsset = useCallback(
    (asset: LibraryAsset | null) => {
      if (asset) {
        updatePrincipal({ virtualtour: asset.url, tourUrl: undefined })
      } else {
        updatePrincipal({ virtualtour: undefined })
      }
    },
    [updatePrincipal],
  )

  const handleLogoAsset = useCallback(
    (asset: LibraryAsset | null) => {
      updatePrincipal({ logoUrl: asset?.url })
    },
    [updatePrincipal],
  )

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-3xl border border-navy-100 bg-white/80 p-6 shadow-lg backdrop-blur"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy-900">Principal Place</h2>
        <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy-800">
          Principal
        </span>
      </div>
      <p className="mt-1 text-sm text-navy-600">Anchor your map by describing the primary location experience.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-navy-800">Name</span>
          <input
            value={principal.name}
            onChange={(event) => updatePrincipal({ name: event.target.value })}
            className="w-full rounded-2xl border border-navy-100 px-4 py-2 text-sm text-navy-900 shadow-inner focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-300"
          />
        </label>
        <div className="space-y-2 text-sm">
          <span className="font-medium text-navy-800">Coordinates</span>
          <div className="flex items-center justify-between rounded-2xl border border-navy-100 px-4 py-2 text-sm text-navy-800 shadow-inner">
            <span>{locationSummary}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.000001"
              value={principal.latitude}
              onChange={(event) => updatePrincipal({ latitude: parseFloat(event.target.value) })}
              className="rounded-xl border border-navy-100 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
            />
            <input
              type="number"
              step="0.000001"
              value={principal.longitude}
              onChange={(event) => updatePrincipal({ longitude: parseFloat(event.target.value) })}
              className="rounded-xl border border-navy-100 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
            />
          </div>
        </div>
        <PlaceTypeSelectField
          label="Place type"
          value={principal.placeType}
          onChange={(next) => updatePrincipal({ placeType: next })}
        />
        <label className="space-y-2 text-sm">
          <span className="font-medium text-navy-800">Google Maps link</span>
          <input
            value={principal.googleMapsUrl ?? ''}
            onChange={(event) => updatePrincipal({ googleMapsUrl: event.target.value })}
            placeholder="https://maps.google.com/..."
            className="w-full rounded-2xl border border-navy-100 px-4 py-2 text-sm focus:border-gold-400 focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span className="font-medium text-navy-800">Description</span>
          <textarea
            value={principal.description ?? ''}
            onChange={(event) => updatePrincipal({ description: event.target.value })}
            rows={3}
            className="w-full rounded-2xl border border-navy-100 px-4 py-2 text-sm focus:border-gold-400 focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-navy-800">Address</span>
          <input
            value={principal.address ?? ''}
            onChange={(event) => updatePrincipal({ address: event.target.value })}
            className="w-full rounded-2xl border border-navy-100 px-4 py-2 text-sm focus:border-gold-400 focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-navy-800">Phone</span>
          <input
            value={principal.phone ?? ''}
            onChange={(event) => updatePrincipal({ phone: event.target.value })}
            className="w-full rounded-2xl border border-navy-100 px-4 py-2 text-sm focus:border-gold-400 focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span className="font-medium text-navy-800">Virtual tour URL (optional)</span>
          <input
            value={principal.tourUrl ?? ''}
            onChange={(event) => updatePrincipal({ tourUrl: event.target.value, virtualtour: undefined })}
            placeholder="https://yourtour.com/experience"
            className="w-full rounded-2xl border border-navy-100 px-4 py-2 text-sm focus:border-gold-400 focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AssetSelectorField
          label="Hero panorama or 360° image"
          description="Choose a panorama from your library"
          type="panorama"
          value={principal.virtualtour}
          backend={backend}
          onChange={handleHeroAsset}
        />
        <AssetSelectorField
          label="Principal logo"
          description="This replaces legacy 3D models"
          type="logo"
          value={principal.logoUrl}
          backend={backend}
          onChange={handleLogoAsset}
        />
      </div>

      {((principal.virtualtour && principal.tourUrl) || (!principal.virtualtour && !principal.tourUrl)) && (
        <p className="mt-3 text-xs font-medium text-rose-600">
          Provide either a 360° image or a tour URL to keep the experience consistent.
        </p>
      )}

      <div className="mt-4">
        <MediaPreview name={principal.name} virtualtour={principal.virtualtour} tourUrl={principal.tourUrl} />
      </div>
    </motion.section>
  )
}
