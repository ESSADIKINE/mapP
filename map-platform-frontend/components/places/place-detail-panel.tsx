import React, { useMemo } from 'react';
import Tabs from '@radix-ui/react-tabs';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TextArea } from '@/components/ui/textarea';
import Label from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileDropCard } from '@/components/forms/file-drop-card';
import { uploadAsset } from '@/lib/upload';
import { useStudioStore } from '@/lib/store';
import { prettyLatLng, safeNumber } from '@/lib/utils';

export const PlaceDetailPanel: React.FC = () => {
  const {
    project,
    selectedPlaceId,
    updatePrincipal,
    updateSecondary,
    removeSecondary,
    requestRoute,
    activeRoute,
    isRouting,
    setPanoramaUrl,
    setModelUrl
  } = useStudioStore();

  const place = useMemo(() => {
    if (selectedPlaceId === 'principal' || selectedPlaceId === project.principal._id) {
      return { place: project.principal, isPrincipal: true } as const;
    }
    const secondary = project.secondaries.find((item) => item._id === selectedPlaceId);
    return secondary
      ? ({ place: secondary, isPrincipal: false } as const)
      : ({ place: project.principal, isPrincipal: true } as const);
  }, [project, selectedPlaceId]);

  const updatePlace = (patch: Record<string, unknown>) => {
    if (place.isPrincipal) {
      updatePrincipal(patch as any);
    } else if (place.place._id) {
      updateSecondary(place.place._id, patch as any);
    }
  };

  const handleLogoUpload = async (file: File) => {
    const asset = await uploadAsset(file);
    updatePlace({ logoUrl: asset.url });
  };

  const handlePanoramaUpload = async (file: File) => {
    const asset = await uploadAsset(file);
    updatePlace({ tourUrl: asset.url });
    setPanoramaUrl(asset.url);
  };

  const handleModelUpload = async (file: File) => {
    const asset = await uploadAsset(file);
    setModelUrl(asset.url);
  };

  const heading = place.isPrincipal ? 'Principal anchor' : 'Satellite destination';
  const coordinates = prettyLatLng(place.place.latitude, place.place.longitude);

  React.useEffect(() => {
    if (place.place.tourUrl) {
      setPanoramaUrl(place.place.tourUrl);
    }
  }, [place.place.tourUrl, setPanoramaUrl]);

  return (
    <Card padding="lg" className="flex h-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Badge tone={place.isPrincipal ? 'gold' : 'navy'} className="max-w-max">
          {heading}
        </Badge>
        <h2 className="text-2xl font-semibold text-white">{place.place.name}</h2>
        <p className="text-sm text-white/50">{coordinates}</p>
      </div>

      <Tabs.Root defaultValue="details" className="flex h-full flex-col">
        <Tabs.List className="mb-4 inline-flex gap-2 rounded-full bg-white/5 p-1 text-sm">
          <Tabs.Trigger
            value="details"
            className="rounded-full px-4 py-2 data-[state=active]:bg-primary-500 data-[state=active]:text-secondary-foreground"
          >
            Details
          </Tabs.Trigger>
          <Tabs.Trigger
            value="experience"
            className="rounded-full px-4 py-2 data-[state=active]:bg-primary-500 data-[state=active]:text-secondary-foreground"
          >
            Immersive media
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="details" className="flex-1 space-y-6">
          <div className="grid gap-4">
            <Label>Name</Label>
            <Input
              value={place.place.name}
              onChange={(event) => updatePlace({ name: event.target.value })}
            />
          </div>
          <div className="grid gap-4">
            <Label hint="What type of venue or category best describes this location?">Category</Label>
            <Input
              value={place.place.placeType ?? ''}
              onChange={(event) => updatePlace({ placeType: event.target.value })}
            />
          </div>
          <div className="grid gap-4">
            <Label>Description</Label>
            <TextArea
              value={place.place.description ?? ''}
              onChange={(event) => updatePlace({ description: event.target.value })}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <Label>Latitude</Label>
              <Input
                value={String(place.place.latitude)}
                onChange={(event) => updatePlace({ latitude: safeNumber(event.target.value, place.place.latitude) })}
              />
            </div>
            <div className="space-y-4">
              <Label>Longitude</Label>
              <Input
                value={String(place.place.longitude)}
                onChange={(event) => updatePlace({ longitude: safeNumber(event.target.value, place.place.longitude) })}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <Label>Address</Label>
              <Input value={place.place.address ?? ''} onChange={(event) => updatePlace({ address: event.target.value })} />
            </div>
            <div className="space-y-4">
              <Label>Contact number</Label>
              <Input value={place.place.phone ?? ''} onChange={(event) => updatePlace({ phone: event.target.value })} />
            </div>
          </div>
          <div className="space-y-4">
            <Label>Google Maps URL</Label>
            <Input
              type="url"
              placeholder="https://maps.google.com/..."
              value={place.place.googleMapsUrl ?? ''}
              onChange={(event) => updatePlace({ googleMapsUrl: event.target.value })}
            />
          </div>

          {!place.isPrincipal && (
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-5">
              <div>
                <p className="text-sm text-white/70">Driving route from principal</p>
                {activeRoute && activeRoute.id === place.place._id ? (
                  <p className="mt-1 text-sm text-primary-200">
                    {activeRoute.summary.distance} • {activeRoute.summary.duration}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-white/40">Generate a fresh route preview for this destination.</p>
                )}
              </div>
              <Button
                variant="secondary"
                disabled={isRouting}
                onClick={() => requestRoute(place.place)}
              >
                {isRouting ? 'Routing…' : 'Compute route'}
              </Button>
            </div>
          )}

          {!place.isPrincipal && place.place._id && (
            <Button variant="ghost" className="w-full border border-white/10" onClick={() => removeSecondary(place.place._id!)}>
              Remove from project
            </Button>
          )}
        </Tabs.Content>

        <Tabs.Content value="experience" className="flex-1 space-y-5">
          <FileDropCard
            title="Brand emblem"
            description="Drop a transparent PNG or SVG to represent this location across the studio."
            accept={['image/png', 'image/svg+xml', 'image/jpeg']}
            onUpload={handleLogoUpload}
            cta="Upload logo"
          />
          <FileDropCard
            title="360° panorama"
            description="Share an equirectangular JPG to activate the immersive tour viewer."
            accept={['image/jpeg', 'image/png']}
            onUpload={handlePanoramaUpload}
            cta="Add panorama"
          />
          <FileDropCard
            title="3D environment"
            description="Upload a GLB/GLTF model to render in the orbit viewer."
            accept={['model/gltf-binary', 'model/gltf+json', 'model/gltf']}
            onUpload={handleModelUpload}
            cta="Upload 3D model"
          />
        </Tabs.Content>
      </Tabs.Root>
    </Card>
  );
};

export default PlaceDetailPanel;
