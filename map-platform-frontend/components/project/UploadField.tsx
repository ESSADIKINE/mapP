'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { ImageIcon, Loader2, Trash2, UploadCloud } from 'lucide-react'

export interface UploadFieldProps {
  label: string
  description?: string
  previewUrl?: string
  onUpload: (file: File) => Promise<void> | void
  onRemove?: () => void
  accept?: Record<string, string[]>
  cta?: string
}

export function UploadField({
  label,
  description,
  previewUrl,
  onUpload,
  onRemove,
  accept,
  cta = 'Upload',
}: UploadFieldProps) {
  const [loading, setLoading] = useState(false)
  const handleDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return
      setLoading(true)
      try {
        await onUpload(files[0])
      } finally {
        setLoading(false)
      }
    },
    [onUpload],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: handleDrop, accept })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-navy-900 dark:text-white">{label}</span>
        {onRemove && previewUrl && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 text-xs font-medium text-navy-600 hover:text-navy-400"
          >
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        )}
      </div>
      <motion.div
        {...getRootProps({ className: 'group relative cursor-pointer' })}
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
        whileHover={{ scale: 1.01 }}
        className={`rounded-2xl border-2 border-dashed p-4 transition-colors duration-300 ${
          isDragActive
            ? 'border-gold-500 bg-gold-50/60'
            : 'border-navy-200 bg-white/70 hover:border-gold-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900/90 text-gold-400">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : previewUrl ? <ImageIcon className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-navy-900">{cta}</p>
            <p className="text-xs text-navy-600">
              {description ?? 'Drag & drop or click to browse'}
            </p>
            {previewUrl && !loading && (
              <span className="inline-block rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-medium text-navy-800">
                Preview available
              </span>
            )}
          </div>
        </div>
      </motion.div>
      {previewUrl && (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="overflow-hidden rounded-2xl border border-navy-100 shadow-inner"
        >
          <img src={previewUrl} alt={label} className="h-40 w-full object-cover" />
        </motion.div>
      )}
    </div>
  )
}
