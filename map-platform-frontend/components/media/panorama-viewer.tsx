'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { useStudioStore } from '@/lib/store';

const Pannellum = dynamic(async () => {
  const mod = await import('react-pannellum');
  return mod.Pannellum;
}, { ssr: false });

export const PanoramaViewer: React.FC = () => {
  const { panoramaUrl } = useStudioStore();

  return (
    <Card padding="none" className="relative h-[320px] overflow-hidden">
      {panoramaUrl ? (
        <Pannellum
          key={panoramaUrl}
          id="studio-panorama"
          sceneId="primary"
          width="100%"
          height="100%"
          image={panoramaUrl}
          autoLoad
          showFullscreenCtrl
          yaw={130}
          hfov={90}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-secondary-500/50 to-secondary-500/10 text-center text-white/60">
          <span className="text-sm uppercase tracking-[0.3em] text-white/40">Panorama not set</span>
          <p className="max-w-xs text-sm text-white/60">Upload a 360° image to unlock the immersive tour experience for this location.</p>
        </div>
      )}
    </Card>
  );
};

export default PanoramaViewer;
