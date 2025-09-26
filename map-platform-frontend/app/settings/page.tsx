'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Pencil, PlusCircle, Trash2, UploadCloud } from 'lucide-react'
import { useStudio } from '@/lib/studioStore'
import { useAssetLibrary } from '@/lib/assetLibraryStore'
import { uploadImage } from '@/lib/api'
import type { AssetKind, LibraryAsset, PlaceTypeDefinition } from '@/types'
import { toast } from '@/lib/toast'

function useLibraryBootstrap(backend: string) {
  const fetchLibrary = useAssetLibrary((state) => state.fetchAll)
  const initialized = useAssetLibrary((state) => state.initialized)

  useEffect(() => {
    if (!initialized) {
      fetchLibrary(backend)
    }
  }, [backend, fetchLibrary, initialized])
}

interface AssetManagerSectionProps {
  title: string
  description: string
  type: AssetKind
  backend: string
}

function AssetManagerSection({ title, description, type, backend }: AssetManagerSectionProps) {
  const assets = useAssetLibrary((state) => (type === 'logo' ? state.logos : state.panoramas))
  const createAsset = useAssetLibrary((state) => state.createAsset)
  const updateAsset = useAssetLibrary((state) => state.updateAsset)
  const deleteAsset = useAssetLibrary((state) => state.deleteAsset)

  const [label, setLabel] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const readyToUpload = useMemo(() => Boolean(label.trim() && file), [label, file])

  const handleUpload = useCallback(async () => {
    if (!file) {
      toast.warning('Select a file to upload.')
      return
    }
    const trimmedLabel = label.trim()
    if (!trimmedLabel) {
      toast.info('Provide a label for this asset.')
      return
    }
    setUploading(true)
    try {
      const response = await uploadImage(file, backend)
      await createAsset(backend, {
        type,
        label: trimmedLabel,
        url: response.url,
        publicId: response.public_id,
      })
      setLabel('')
      setFile(null)
      toast.success('Asset uploaded to the library.')
    } catch (error) {
      console.error('Unable to create asset', error)
      toast.error('Upload failed. Please try again or check your backend configuration.')
    } finally {
      setUploading(false)
    }
  }, [backend, createAsset, file, label, type])

  const handleRename = useCallback(
    async (asset: LibraryAsset) => {
      const next = window.prompt('Rename asset', asset.label)
      if (!next) return
      const trimmed = next.trim()
      if (!trimmed || trimmed === asset.label) return
      try {
        await updateAsset(backend, asset._id, { label: trimmed })
        toast.success('Asset renamed successfully.')
      } catch (error) {
        console.error('Rename failed', error)
        toast.error('Unable to rename asset. Please try again.')
      }
    },
    [backend, updateAsset],
  )

  const handleDelete = useCallback(
    async (asset: LibraryAsset) => {
      if (!window.confirm(`Delete asset "${asset.label}"?`)) return
      try {
        await deleteAsset(backend, asset._id, type)
        toast.success('Asset deleted.')
      } catch (error) {
        console.error('Delete failed', error)
        toast.error('Unable to delete asset. Please try again.')
      }
    },
    [backend, deleteAsset, type],
  )

  return (
    <section className="space-y-4 rounded-3xl border border-navy-100 bg-white/80 p-6 shadow-lg">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
          <p className="text-sm text-navy-600">{description}</p>
        </div>
      </header>

      <div className="rounded-2xl border border-dashed border-navy-200 bg-navy-50/40 p-4">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto] md:items-end">
          <label className="text-xs font-medium text-navy-700">
            Asset label
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="e.g. Skyline at dusk"
              className="mt-1 w-full rounded-xl border border-navy-200 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
            />
          </label>
          <label className="text-xs font-medium text-navy-700">
            Upload file
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded-xl border border-navy-200 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!readyToUpload || uploading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-400"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} Upload
          </button>
        </div>
        <p className="mt-2 text-xs text-navy-500">
          Uploaded assets are saved to Cloudinary and shared across your projects.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {assets.map((asset) => (
          <article
            key={asset._id}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow"
          >
            <img src={asset.url} alt={asset.label} className="h-40 w-full object-cover" />
            <div className="flex flex-1 flex-col justify-between gap-3 p-4">
              <div>
                <h3 className="text-sm font-semibold text-navy-900">{asset.label}</h3>
                <p className="text-xs text-navy-500 break-all">{asset.url}</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleRename(asset)}
                  className="inline-flex items-center gap-1 rounded-full border border-navy-200 px-3 py-1 text-navy-700 transition hover:border-gold-400 hover:text-gold-600"
                >
                  <Pencil className="h-4 w-4" /> Rename
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(asset)}
                  className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-rose-600 transition hover:bg-rose-100"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          </article>
        ))}
        {assets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-navy-200 bg-navy-50/60 p-6 text-sm text-navy-600">
            No assets yet. Upload your first one to populate the library.
          </div>
        ) : null}
      </div>
    </section>
  )
}

interface PlaceTypeManagerSectionProps {
  backend: string
}

function PlaceTypeManagerSection({ backend }: PlaceTypeManagerSectionProps) {
  const placeTypes = useAssetLibrary((state) => state.placeTypes)
  const createPlaceType = useAssetLibrary((state) => state.createPlaceType)
  const updatePlaceType = useAssetLibrary((state) => state.updatePlaceType)
  const deletePlaceType = useAssetLibrary((state) => state.deletePlaceType)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.info('Provide a name for the place type.')
      return
    }
    setSaving(true)
    try {
      await createPlaceType(backend, { name: trimmed, description: description.trim() || undefined })
      setName('')
      setDescription('')
      toast.success('Place type created.')
    } catch (error) {
      console.error('Unable to create place type', error)
      toast.error('Creation failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [backend, createPlaceType, description, name])

  const handleRename = useCallback(
    async (type: PlaceTypeDefinition) => {
      const next = window.prompt('Rename place type', type.name)
      if (!next) return
      const trimmed = next.trim()
      if (!trimmed || trimmed === type.name) return
      try {
        await updatePlaceType(backend, type._id, { name: trimmed })
        toast.success('Place type renamed.')
      } catch (error) {
        console.error('Rename failed', error)
        toast.error('Unable to rename place type. Please try again.')
      }
    },
    [backend, updatePlaceType],
  )

  const handleDescriptionEdit = useCallback(
    async (type: PlaceTypeDefinition) => {
      const next = window.prompt('Update description', type.description ?? '')
      if (next === null) return
      const trimmed = next.trim()
      try {
        await updatePlaceType(backend, type._id, { description: trimmed || undefined })
        toast.success('Description updated.')
      } catch (error) {
        console.error('Update failed', error)
        toast.error('Unable to update description. Please try again.')
      }
    },
    [backend, updatePlaceType],
  )

  const handleDelete = useCallback(
    async (type: PlaceTypeDefinition) => {
      if (!window.confirm(`Delete place type "${type.name}"?`)) return
      try {
        await deletePlaceType(backend, type._id)
        toast.success('Place type deleted.')
      } catch (error) {
        console.error('Delete failed', error)
        toast.error('Unable to delete place type. Please try again.')
      }
    },
    [backend, deletePlaceType],
  )

  return (
    <section className="space-y-4 rounded-3xl border border-navy-100 bg-white/80 p-6 shadow-lg">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">Place types</h2>
          <p className="text-sm text-navy-600">Define reusable categories for your places.</p>
        </div>
      </header>

      <div className="rounded-2xl border border-dashed border-navy-200 bg-navy-50/40 p-4">
        <div className="grid gap-3 md:grid-cols-[2fr_2fr_auto] md:items-end">
          <label className="text-xs font-medium text-navy-700">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Boutique hotel"
              className="mt-1 w-full rounded-xl border border-navy-200 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
            />
          </label>
          <label className="text-xs font-medium text-navy-700">
            Description (optional)
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short description"
              className="mt-1 w-full rounded-xl border border-navy-200 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-400"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} Add type
          </button>
        </div>
        <p className="mt-2 text-xs text-navy-500">Place types appear in the dropdowns on your project forms.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {placeTypes.map((type) => (
          <article key={type._id} className="flex flex-col justify-between rounded-2xl border border-navy-100 bg-white p-4 shadow">
            <div>
              <h3 className="text-sm font-semibold text-navy-900">{type.name}</h3>
              {type.description ? (
                <p className="mt-1 text-xs text-navy-600">{type.description}</p>
              ) : (
                <p className="mt-1 text-xs text-navy-500 italic">No description</p>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleRename(type)}
                className="inline-flex items-center gap-1 rounded-full border border-navy-200 px-3 py-1 text-navy-700 transition hover:border-gold-400 hover:text-gold-600"
              >
                <Pencil className="h-4 w-4" /> Rename
              </button>
              <button
                type="button"
                onClick={() => handleDescriptionEdit(type)}
                className="inline-flex items-center gap-1 rounded-full border border-navy-200 px-3 py-1 text-navy-700 transition hover:border-gold-400 hover:text-gold-600"
              >
                <Pencil className="h-4 w-4" /> Edit description
              </button>
              <button
                type="button"
                onClick={() => handleDelete(type)}
                className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-rose-600 transition hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </article>
        ))}
        {placeTypes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-navy-200 bg-navy-50/60 p-6 text-sm text-navy-600">
            No place types yet. Create your first entry above.
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default function SettingsPage() {
  const backend = useStudio((state) => state.backend)
  useLibraryBootstrap(backend)

  return (
    <main className="min-h-screen bg-navy-50/40 pb-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-3 rounded-3xl border border-navy-100 bg-white/90 p-6 shadow-xl">
          <div>
            <h1 className="text-2xl font-semibold text-navy-900">Asset Library Settings</h1>
            <p className="text-sm text-navy-600">Manage reusable logos, 360° panoramas, and place types for your projects.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-navy-200 px-4 py-2 font-semibold text-navy-800 transition hover:border-gold-400 hover:text-gold-600"
            >
              Return to studio
            </Link>
          </div>
        </header>

        <AssetManagerSection
          title="Place logos"
          description="Store organization and project logos for reuse across multiple places."
          type="logo"
          backend={backend}
        />

        <AssetManagerSection
          title="360° panoramas"
          description="Upload immersive panoramas once and reuse them across different locations."
          type="panorama"
          backend={backend}
        />

        <PlaceTypeManagerSection backend={backend} />
      </div>
    </main>
  )
}
