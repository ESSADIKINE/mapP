'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useStudio } from '@/lib/studioStore'
import { uploadImage } from '@/lib/api'
import { UploadField } from './UploadField'

export function ProjectHero() {
  const { project, updateProject, backend, setBackend } = useStudio((state) => ({
    project: state.project,
    updateProject: state.updateProject,
    backend: state.backend,
    setBackend: state.setBackend,
  }))

  const handleLogoUpload = useCallback(
    async (file: File) => {
      const response = await uploadImage(file, backend)
      updateProject({ logoUrl: response.url })
    },
    [backend, updateProject],
  )

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-3xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 p-8 text-white shadow-xl"
    >
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-5">
          <div className="flex flex-col gap-3">
            <input
              value={project.title}
              onChange={(event) => updateProject({ title: event.target.value })}
              placeholder="Untitled Project"
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-2xl font-semibold text-white placeholder:text-white/60 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
            />
            <textarea
              value={project.description ?? ''}
              onChange={(event) => updateProject({ description: event.target.value })}
              placeholder="Describe your project…"
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/70 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
            />
          </div>
          {/* Advanced inputs removed per request */}
        </div>
        <div className="w-full max-w-xs">
          <UploadField
            label="Project branding"
            description="Recommended: transparent PNG or SVG"
            previewUrl={project.logoUrl}
            onUpload={handleLogoUpload}
            onRemove={() => updateProject({ logoUrl: undefined })}
            cta="Upload logo"
            accept={{ 'image/*': [] }}
          />
        </div>
      </div>
    </motion.section>
  )
}
