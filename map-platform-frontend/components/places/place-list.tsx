import React from 'react';
import ScrollArea from '@radix-ui/react-scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStudioStore } from '@/lib/store';
import { prettyLatLng } from '@/lib/utils';

export const PlaceList: React.FC = () => {
  const { project, selectedPlaceId, setSelectedPlace, addSecondary } = useStudioStore();

  const principal = project.principal;
  const secondaries = project.secondaries ?? [];

  const handleAddPlace = () => {
    addSecondary({ name: `New location ${secondaries.length + 1}` });
  };

  return (
    <Card padding="lg" className="flex h-full flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Places overview</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Project atlas</h2>
        </div>
        <Badge tone="gold" className="shadow-glow">{secondaries.length + 1} active</Badge>
      </div>

      <ScrollArea.Root className="flex-1 overflow-hidden">
        <ScrollArea.Viewport className="h-full w-full space-y-4 pr-2">
          <PlaceListItem
            key={principal._id}
            active={selectedPlaceId === principal._id || selectedPlaceId === 'principal'}
            label="Principal anchor"
            name={principal.name}
            coordinates={prettyLatLng(principal.latitude, principal.longitude)}
            onClick={() => setSelectedPlace(principal._id ?? 'principal')}
            tone="primary"
          />
          {secondaries.map((place) => (
            <PlaceListItem
              key={place._id}
              active={selectedPlaceId === place._id}
              label={place.placeType || 'Secondary site'}
              name={place.name}
              coordinates={prettyLatLng(place.latitude, place.longitude)}
              onClick={() => setSelectedPlace(place._id ?? '')}
              tone="muted"
            />
          ))}
        </ScrollArea.Viewport>
      </ScrollArea.Root>

      <Button onClick={handleAddPlace} className="w-full">
        Add satellite place
      </Button>
    </Card>
  );
};

interface PlaceListItemProps {
  label: string;
  name: string;
  coordinates: string;
  active?: boolean;
  onClick?: () => void;
  tone: 'primary' | 'muted';
}

const PlaceListItem: React.FC<PlaceListItemProps> = ({ label, name, coordinates, active, onClick, tone }) => {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:-translate-y-1 hover:border-primary-400 hover:bg-white/10 ${
        active ? 'border-primary-500 bg-primary-500/10 shadow-glow' : ''
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="relative flex flex-col gap-3">
        <span className="text-[0.6rem] uppercase tracking-[0.3em] text-white/40">{label}</span>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{name}</h3>
          <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${tone === 'primary' ? 'text-primary-300' : 'text-white/50'}`}>
            {active ? 'Active' : 'Explore'}
          </span>
        </div>
        <p className="text-sm text-white/60">{coordinates}</p>
      </div>
    </button>
  );
};

export default PlaceList;
