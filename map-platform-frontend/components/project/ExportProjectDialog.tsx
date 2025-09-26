'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, PackageOpen } from 'lucide-react'
import type { ExportOptions } from '@/types'

interface ExportProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: ExportOptions
  onOptionsChange: (options: ExportOptions) => void
  onExport: () => Promise<void>
  exporting: boolean
}

export function ExportProjectDialog({
  open,
  onOpenChange,
  options,
  onOptionsChange,
  onExport,
  exporting,
}: ExportProjectDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy-900/70 backdrop-blur" />
        <Dialog.Content className="fixed inset-0 z-50 m-auto flex w-[90vw] max-w-xl flex-col rounded-3xl bg-white p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-100 text-navy-900">
              <PackageOpen className="h-6 w-6" />
            </div>
            <div>
              <Dialog.Title className="text-xl font-semibold text-navy-900">Export Project</Dialog.Title>
              <Dialog.Description className="text-sm text-navy-600">
                Bundle your project into a shareable archive ready for deployment.
              </Dialog.Description>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="flex items-start gap-3 rounded-2xl border border-navy-100 bg-navy-50/40 p-3">
              <input
                type="checkbox"
                checked={options.includeSecondaries}
                onChange={(event) => onOptionsChange({ ...options, includeSecondaries: event.target.checked })}
                className="mt-1 h-4 w-4 rounded border-navy-300 text-gold-500 focus:ring-gold-400"
              />
              <div>
                <p className="text-sm font-semibold text-navy-900">Include secondary places</p>
                <p className="text-xs text-navy-600">Export all supporting locations with their media and copy.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-navy-100 bg-navy-50/40 p-3">
              <input
                type="checkbox"
                checked={options.includeRoutes}
                onChange={(event) => onOptionsChange({ ...options, includeRoutes: event.target.checked })}
                className="mt-1 h-4 w-4 rounded border-navy-300 text-gold-500 focus:ring-gold-400"
              />
              <div>
                <p className="text-sm font-semibold text-navy-900">Include computed routes</p>
                <p className="text-xs text-navy-600">Attach GeoJSON directions for offline access.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-navy-100 bg-navy-50/40 p-3">
              <input
                type="checkbox"
                checked={options.includeImages}
                onChange={(event) => onOptionsChange({ ...options, includeImages: event.target.checked })}
                className="mt-1 h-4 w-4 rounded border-navy-300 text-gold-500 focus:ring-gold-400"
              />
              <div>
                <p className="text-sm font-semibold text-navy-900">Inline media assets</p>
                <p className="text-xs text-navy-600">Bundle logos and 360° panoramas directly inside the archive.</p>
              </div>
            </label>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <Dialog.Close asChild>
              <button className="rounded-full border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-700 transition hover:border-gold-400 hover:text-gold-600">
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={onExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-400"
            >
              <AnimatePresence initial={false} mode="wait">
                {exporting ? (
                  <motion.span
                    key="loading"
                    className="inline-flex items-center gap-2"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                  >
                    <Loader2 className="h-4 w-4 animate-spin" /> Preparing…
                  </motion.span>
                ) : (
                  <motion.span
                    key="export"
                    className="inline-flex items-center gap-2"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                  >
                    Export project
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
