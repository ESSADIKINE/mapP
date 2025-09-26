'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { DEFAULT_STYLE } from '@/lib/constants';
import { useStudioStore } from '@/lib/store';

type MapLib = typeof import('maplibre-gl');
type MapInstance = import('maplibre-gl').Map;

interface MarkerRecord {
  marker: import('maplibre-gl').Marker;
  element: HTMLDivElement;
}

export const InteractiveMap: React.FC = () => {
  const {
    project,
    mapLib,
    mapInstance,
    setMapLib,
    setMapInstance,
    hoveredPlaceId,
    selectedPlaceId,
    setSelectedPlace,
    activeRoute
  } = useStudioStore();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Record<string, MarkerRecord>>({});

  useEffect(() => {
    let cancelled = false;
    async function loadMapLib() {
      if (!mapLib) {
        const lib = await import('maplibre-gl');
        if (!cancelled) {
          setMapLib(lib);
        }
      }
    }
    loadMapLib();
    return () => {
      cancelled = true;
    };
  }, [mapLib, setMapLib]);

  useEffect(() => {
    if (!mapLib || mapInstance || !containerRef.current) return;

    const map = new mapLib.Map({
      container: containerRef.current,
      style: project.styleURL || DEFAULT_STYLE,
      center: [project.principal.longitude, project.principal.latitude],
      zoom: project.principal.zoom ?? 15,
      pitch: 45,
      bearing: -20,
      attributionControl: false
    });

    map.addControl(new mapLib.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      setMapInstance(map);
    });

    return () => {
      map.remove();
      setMapInstance(null);
    };
  }, [mapLib, mapInstance, project.styleURL, project.principal, setMapInstance]);

  useEffect(() => {
    if (mapInstance && project.styleURL) {
      mapInstance.setStyle(project.styleURL);
    }
  }, [mapInstance, project.styleURL]);

  const places = useMemo(() => [project.principal, ...project.secondaries], [project]);

  useEffect(() => {
    if (!mapInstance || !mapLib) return;

    const map = mapInstance as MapInstance;

    places.forEach((place) => {
      const id = place._id ?? place.name;
      let record = markersRef.current[id];
      if (!record) {
        const element = document.createElement('div');
        element.className = 'group flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/40 bg-secondary-500/80 text-white shadow-lg transition hover:scale-110';
        element.innerHTML = `<span class="text-xs font-bold uppercase tracking-[0.2em]">${place.category === 'Principal' ? 'HQ' : 'SP'}</span>`;
        element.addEventListener('click', () => {
          setSelectedPlace(place._id ?? place.name);
        });
        element.addEventListener('mouseenter', () => element.classList.add('scale-110'));
        element.addEventListener('mouseleave', () => element.classList.remove('scale-110'));
        const marker = new mapLib.Marker({ element }).setLngLat([place.longitude, place.latitude]).addTo(map);
        markersRef.current[id] = { marker, element };
      } else {
        record.marker.setLngLat([place.longitude, place.latitude]);
      }
    });

    Object.entries(markersRef.current).forEach(([id, record]) => {
      if (!places.find((place) => (place._id ?? place.name) === id)) {
        record.marker.remove();
        delete markersRef.current[id];
      }
    });

    if (selectedPlaceId) {
      const active = markersRef.current[selectedPlaceId];
      if (active) {
        Object.values(markersRef.current).forEach(({ element }) => element.classList.remove('ring-4', 'ring-primary-400/60'));
        active.element.classList.add('ring-4', 'ring-primary-400/60');
        const target = places.find((place) => (place._id ?? place.name) === selectedPlaceId);
        if (target) {
          map.easeTo({ center: [target.longitude, target.latitude], duration: 1200, zoom: target.zoom ?? map.getZoom() });
        }
      }
    }
  }, [mapInstance, mapLib, places, selectedPlaceId, setSelectedPlace, hoveredPlaceId]);

  useEffect(() => {
    if (!mapInstance) return;
    const map = mapInstance as MapInstance;
    const sourceId = 'active-route';
    const layerId = 'active-route-line';

    if (activeRoute) {
      const sourceData = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: activeRoute.geometry,
            properties: {}
          }
        ]
      } satisfies GeoJSON.FeatureCollection;

      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as any).setData(sourceData);
      } else {
        map.addSource(sourceId, { type: 'geojson', data: sourceData });
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#FFD700',
            'line-width': 5,
            'line-opacity': 0.9
          }
        });
      }
    } else {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    }
  }, [mapInstance, activeRoute]);

  return <div ref={containerRef} className="h-[520px] w-full overflow-hidden rounded-[28px]" />;
};

export default InteractiveMap;
