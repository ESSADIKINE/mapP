'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Loader2, Save } from 'lucide-react'
import { ProjectHero } from '@/components/project/ProjectHero'
import { PrincipalPlaceForm } from '@/components/project/PrincipalPlaceForm'
import { SecondaryPlacesPanel } from '@/components/project/SecondaryPlacesPanel'
import { StudioMap } from '@/components/Map/StudioMap'
import { ExportProjectDialog } from '@/components/project/ExportProjectDialog'
import { useStudio } from '@/lib/studioStore'
import { saveProject } from '@/lib/api'
import type { ExportOptions } from '@/types'
import { useAssetLibrary } from '@/lib/assetLibraryStore'

const DEFAULT_EXPORT: ExportOptions = {
  includeSecondaries: true,
  includeRoutes: true,
  includeImages: true,
}

export default function StudioPage() {
  const { project, setProject, backend } = useStudio((state) => ({
    project: state.project,
    setProject: state.setProject,
    backend: state.backend,
  }))

  const fetchLibrary = useAssetLibrary((state) => state.fetchAll)
  const libraryLoaded = useAssetLibrary((state) => state.initialized)

  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT)

  const allPlaces = useMemo(() => [project.principal, ...project.secondaries], [project])

  useEffect(() => {
    if (!libraryLoaded) {
      fetchLibrary(backend)
    }
  }, [backend, fetchLibrary, libraryLoaded])

  const ensureMediaIsValid = useCallback(() => {
    for (const place of allPlaces) {
      const hasPano = Boolean(place.virtualtour)
      const hasTour = Boolean(place.tourUrl)
      if (hasPano === hasTour) {
        alert(`Place "${place.name}" must include either a 360° image or a tour URL.`)
        return false
      }
    }
    return true
  }, [allPlaces])

  const ensureProjectSaved = useCallback(async () => {
    setSaving(true)
    try {
      const saved = await saveProject(project, backend)
      setProject(saved)
      return saved
    } catch (error) {
      console.error(error)
      alert('Unable to save the project. Please try again.')
      throw error
    } finally {
      setSaving(false)
    }
  }, [backend, project, setProject])

  const handleSave = useCallback(async () => {
    await ensureProjectSaved()
  }, [ensureProjectSaved])

  const handleExport = useCallback(async () => {
    if (!ensureMediaIsValid()) return

    setExporting(true)
    try {
      const saved = project._id ? project : await ensureProjectSaved()
      const payload = {
        inlineAssets: options.includeImages,
        inlineData: options.includeImages,
        includeLocalLibs: true,
        includeRoutes: options.includeRoutes,
        includeSecondaries: options.includeSecondaries,
        styleURL: saved.styleURL || '',
        profiles: ['driving'],
      }
      const res = await fetch(`${backend}/api/projects/${saved._id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(`Export failed: ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${saved.title || 'project'}.zip`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setExportOpen(false)
    } catch (error) {
      console.error(error)
      alert('Unable to export the project. Please verify the backend service.')
    } finally {
      setExporting(false)
    }
  }, [backend, ensureMediaIsValid, ensureProjectSaved, options.includeImages, options.includeRoutes, options.includeSecondaries, project])

  return (
    <main className="min-h-screen pb-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4 rounded-3xl border border-navy-100 bg-white/70 p-6 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-navy-900">Immersive Map Studio</h1>
              <p className="text-sm text-navy-600">Design elegant tours powered by accessible Radix UI components and delightful motion.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 shadow transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save project
              </button>
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-800 transition hover:border-gold-400 hover:text-gold-600"
              >
                <Download className="h-4 w-4" /> Export bundle
              </button>
            </div>
          </div>
        </header>

        <ProjectHero />

        <motion.div
          layout
          className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="flex flex-col gap-8">
            <PrincipalPlaceForm />
            <SecondaryPlacesPanel />
          </div>
          <StudioMap />
        </motion.div>
      </div>

      <ExportProjectDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        options={options}
        onOptionsChange={setOptions}
        onExport={handleExport}
        exporting={exporting}
      />
    </main>
  )
}
