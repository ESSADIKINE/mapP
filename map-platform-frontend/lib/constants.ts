export const GOLD = '#FFD700';
export const NAVY = '#001F3F';

export const DEFAULT_MODEL_URL = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

export const AVAILABLE_MODELS = [
  { name: 'Astronaut', url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb' },
  { name: 'Duck', url: 'https://modelviewer.dev/shared-assets/models/Duck.glb' },
  { name: 'Horse', url: 'https://modelviewer.dev/shared-assets/models/Horse.glb' },
  { name: 'Cesium Air', url: 'https://modelviewer.dev/shared-assets/models/CesiumAir/CesiumAir.glb' },
  { name: 'Cesium Balloon', url: 'https://modelviewer.dev/shared-assets/models/CesiumBalloon/CesiumBalloon.glb' },
  { name: 'Cesium Ground Station', url: 'https://modelviewer.dev/shared-assets/models/CesiumGroundStation/CesiumGroundStation.glb' },
  { name: 'Cesium Milk Truck', url: 'https://modelviewer.dev/shared-assets/models/CesiumMilkTruck/CesiumMilkTruck.glb' },
  { name: 'Cesium Man', url: 'https://modelviewer.dev/shared-assets/models/CesiumMan/CesiumMan.glb' }
] as const;

export const DEFAULT_STYLE = 'https://demotiles.maplibre.org/style.json';
