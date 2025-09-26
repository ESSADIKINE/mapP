import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStudioStore } from '@/lib/store';
import InteractiveMap from '@/components/map/interactive-map';
import ModelViewer from '@/components/media/model-viewer';
import PanoramaViewer from '@/components/media/panorama-viewer';

const metrics = [
  { label: 'Destinations', key: 'destinations' },
  { label: 'Avg. travel time', key: 'duration' },
  { label: 'Total distance', key: 'distance' }
];

export const StudioStage: React.FC = () => {
  const { project, activeRoute } = useStudioStore();

  const data = {
    destinations: `${project.secondaries.length + 1}`,
    duration: activeRoute?.summary.duration ?? '—',
    distance: activeRoute?.summary.distance ?? '—'
  };

  return (
    <div className="flex flex-col gap-6">
      <Card padding="lg" className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <Badge tone="gold" className="max-w-max">Spatial canvas</Badge>
            <h2 className="mt-3 text-3xl font-semibold text-white">Interactive map studio</h2>
            <p className="mt-2 text-sm text-white/60">Design, plan, and preview your spatial storytelling with responsive map layers and real-time interactions.</p>
          </div>
          <div className="grid grid-cols-3 gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-white/70 max-lg:hidden">
            {metrics.map((metric) => (
              <div key={metric.key} className="text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-white/35">{metric.label}</p>
                <p className="mt-1 text-lg font-semibold text-primary-100">{(data as any)[metric.key]}</p>
              </div>
            ))}
          </div>
        </div>
        <InteractiveMap />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">360° immersion</h3>
          <PanoramaViewer />
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">3D orbit experience</h3>
          <ModelViewer />
        </div>
      </div>
    </div>
  );
};

export default StudioStage;
