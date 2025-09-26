'use client'

import Link from 'next/link'
import { useCallback, useMemo, useRef, useState } from 'react'
import { ImageIcon, Loader2, PlusCircle, XCircle } from 'lucide-react'
import { uploadImage } from '@/lib/api'
import { useAssetLibrary } from '@/lib/assetLibraryStore'
import type { AssetKind, LibraryAsset } from '@/types'
import { toast } from '@/lib/toast'

interface AssetSelectorFieldProps {
  label: string
  description?: string
  type: AssetKind
  value?: string
  backend: string
  onChange: (asset: LibraryAsset | null) => void
}

export function AssetSelectorField({ label, description, type, value, backend, onChange }: AssetSelectorFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [showUploader, setShowUploader] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const assets = useAssetLibrary((state) => (type === 'logo' ? state.logos : state.panoramas))
  const createAsset = useAssetLibrary((state) => state.createAsset)

  const selectedAsset = useMemo(() => {
    if (!value) return undefined
    return assets.find((asset) => asset.url === value)
  }, [assets, value])

  const handleSelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const id = event.target.value
      if (!id) {
        onChange(null)
        return
      }
      const asset = assets.find((item) => item._id === id)
      if (asset) {
        onChange(asset)
      }
    },
    [assets, onChange],
  )

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setSelectedFile(file ?? null)
  }, [])

  const resetUploader = useCallback(() => {
    setShowUploader(false)
    setNewLabel('')
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      toast.warning('Select an image to upload.')
      return
    }
    const trimmedLabel = newLabel.trim()
    if (!trimmedLabel) {
      toast.info('Provide a label for this asset before uploading.')
      return
    }
    setUploading(true)
    try {
      const response = await uploadImage(selectedFile, backend)
      const asset = await createAsset(backend, {
        type,
        label: trimmedLabel,
        url: response.url,
        publicId: response.public_id,
      })
      onChange(asset)
      resetUploader()
      toast.success('Asset uploaded to your library.')
    } catch (error) {
      console.error('Asset upload failed', error)
      toast.error('Unable to upload the asset. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [backend, createAsset, newLabel, onChange, resetUploader, selectedFile, type])

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-navy-900">{label}</p>
          {description ? <p className="text-xs text-navy-600">{description}</p> : null}
          {selectedAsset ? (
            <p className="mt-1 text-xs font-medium text-gold-700">Selected: {selectedAsset.label}</p>
          ) : value ? (
            <p className="mt-1 text-xs font-medium text-navy-600">Using custom URL</p>
          ) : (
            <p className="mt-1 text-xs text-navy-500">No asset selected</p>
          )}
        </div>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2 py-1 text-xs font-semibold text-navy-600 transition hover:bg-navy-100"
          >
            <XCircle className="h-4 w-4" /> Clear
          </button>
        ) : null}
      </div>

      <select
        value={selectedAsset?._id ?? ''}
        onChange={handleSelectChange}
        className="w-full rounded-xl border border-navy-200 px-3 py-2 text-sm text-navy-900 shadow-inner focus:border-gold-400 focus:outline-none"
      >
        <option value="">Select from library…</option>
        {assets.map((asset) => (
          <option key={asset._id} value={asset._id}>
            {asset.label}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => setShowUploader((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full border border-dashed border-navy-300 px-3 py-1.5 font-semibold text-navy-700 transition hover:border-gold-400 hover:text-gold-600"
        >
          <PlusCircle className="h-4 w-4" /> {showUploader ? 'Close uploader' : 'Add new asset'}
        </button>
        <Link href="/settings" className="inline-flex items-center gap-1 text-navy-600 hover:text-gold-600">
          Manage library
        </Link>
      </div>

      {showUploader ? (
        <div className="space-y-3 rounded-2xl border border-navy-200 bg-white/70 p-4 shadow-inner">
          <label className="flex flex-col gap-1 text-xs font-medium text-navy-700">
            Asset label
            <input
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              placeholder="e.g. Sunset exterior"
              className="rounded-xl border border-navy-200 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-navy-700">
            Upload image
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="rounded-xl border border-navy-200 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-4 py-1.5 text-sm font-semibold text-white shadow transition hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-400"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />} Upload to library
            </button>
            <button
              type="button"
              onClick={resetUploader}
              className="text-xs font-semibold text-rose-600 hover:text-rose-500"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {selectedAsset ? (
        <figure className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow">
          <img src={selectedAsset.url} alt={selectedAsset.label} className="h-48 w-full object-cover" />
          <figcaption className="px-3 py-2 text-xs font-medium text-navy-700">{selectedAsset.label}</figcaption>
        </figure>
      ) : null}
    </div>
  )
}
