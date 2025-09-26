'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { ExternalLink, Image360 } from 'lucide-react'

const ReactPannellum = dynamic(() => import('react-pannellum'), { ssr: false })

export interface MediaPreviewProps {
  name: string
  virtualtour?: string
  tourUrl?: string
}

export function MediaPreview({ name, virtualtour, tourUrl }: MediaPreviewProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'360' | 'tour'>('360')

  if (!virtualtour && !tourUrl) {
    return null
  }

  const open360 = () => {
    setMode('360')
    setOpen(true)
  }

  const openTour = () => {
    setMode('tour')
    setOpen(true)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {virtualtour && (
        <button
          type="button"
          onClick={open360}
          className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-3 py-1.5 text-sm font-semibold text-navy-900 shadow-sm transition hover:bg-gold-400"
        >
          <Image360 className="h-4 w-4" /> View 360°
        </button>
      )}
      {tourUrl && (
        <button
          type="button"
          onClick={openTour}
          className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-3 py-1.5 text-sm font-semibold text-navy-900 shadow-sm transition hover:border-gold-400 hover:text-gold-600"
        >
          <ExternalLink className="h-4 w-4" /> View Tour
        </button>
      )}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-navy-900/70 backdrop-blur" />
          <Dialog.Content className="fixed inset-0 z-50 m-auto flex h-[80vh] w-[90vw] max-w-5xl flex-col rounded-3xl bg-white p-6 shadow-2xl">
            <Dialog.Title className="text-lg font-semibold text-navy-900">
              {mode === '360' ? `${name} — 360° Preview` : `${name} — Virtual Tour`}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-navy-600">
              {mode === '360'
                ? 'Interact with the immersive panorama.'
                : 'The tour opens inside the modal for quick review.'}
            </Dialog.Description>
            <div className="mt-4 flex-1 overflow-hidden rounded-2xl border border-navy-100 bg-navy-900/5">
              {mode === '360' && virtualtour ? (
                <ReactPannellum
                  id={`pano-${name}`}
                  sceneId={`scene-${name}`}
                  imageSource={virtualtour}
                  config={{
                    autoLoad: true,
                    showControls: true,
                  }}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : tourUrl ? (
                <motion.iframe
                  key={tourUrl}
                  src={tourUrl}
                  className="h-full w-full"
                  title={`${name} tour`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              ) : null}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="mt-4 self-end rounded-full bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-navy-700"
              >
                Close
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
