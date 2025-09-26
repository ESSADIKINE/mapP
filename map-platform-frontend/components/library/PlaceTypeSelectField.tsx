'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useAssetLibrary } from '@/lib/assetLibraryStore'

interface PlaceTypeSelectFieldProps {
  label: string
  value?: string
  onChange: (value?: string) => void
  description?: string
}

export function PlaceTypeSelectField({ label, value, onChange, description }: PlaceTypeSelectFieldProps) {
  const placeTypes = useAssetLibrary((state) => state.placeTypes)

  const options = useMemo(
    () => placeTypes.map((item) => ({ key: item._id, value: item.name, label: item.name })),
    [placeTypes],
  )

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-medium text-navy-800">{label}</span>
          {description ? <p className="text-xs text-navy-600">{description}</p> : null}
        </div>
        <Link href="/settings" className="text-xs font-semibold text-navy-600 hover:text-gold-600">
          Manage types
        </Link>
      </div>
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || undefined)}
        className="w-full rounded-xl border border-navy-100 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
      >
        <option value="">Select place type…</option>
        {options.map((option) => (
          <option key={option.key} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {options.length === 0 ? (
        <p className="text-xs text-rose-600">No place types yet. Add them from settings.</p>
      ) : null}
    </div>
  )
}
