'use client'

import * as ScrollArea from '@radix-ui/react-scroll-area'
import { AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useStudio } from '@/lib/studioStore'
import { SecondaryPlaceCard } from './SecondaryPlaceCard'

export function SecondaryPlacesPanel() {
  const { secondaries, addSecondary } = useStudio((state) => ({
    secondaries: state.project.secondaries,
    addSecondary: state.addSecondary,
  }))

  return (
    <section className="flex h-full flex-col gap-4 rounded-3xl border border-navy-100 bg-white/80 p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">Secondary Places</h2>
          <p className="text-sm text-navy-600">Craft immersive highlights around your principal location.</p>
        </div>
        <button
          type="button"
          onClick={() => addSecondary({ name: `Place ${secondaries.length + 1}`, category: 'Secondary' })}
          className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 shadow transition hover:bg-gold-400"
        >
          <Plus className="h-4 w-4" /> Add place
        </button>
      </div>

      <ScrollArea.Root className="relative -mx-2 flex-1">
        <ScrollArea.Viewport className="h-full w-full px-2">
          <div className="space-y-4 pb-6">
            <AnimatePresence initial={false}>
              {secondaries.map((place) => (
                <SecondaryPlaceCard key={place._id} place={place} />
              ))}
            </AnimatePresence>
            {secondaries.length === 0 && (
              <div className="rounded-3xl border border-dashed border-navy-200 bg-navy-50/50 p-6 text-center text-sm text-navy-600">
                No secondary places yet. Add one to begin crafting your immersive route.
              </div>
            )}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation="vertical"
          className="flex touch-none select-none border-l border-navy-100 bg-white/60"
        >
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-navy-200" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </section>
  )}
