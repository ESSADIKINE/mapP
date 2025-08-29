(async function(){
  const loadingEl = document.getElementById('loading');
  const data = window.__PROJECT__ || await fetch('./data/project.json').then(r=>r.json());
  
  let map;
  let currentProject = null;
  let routeLayerId = null;
  let viewer = null;

  function sanitizeLine(coords) {
    const out = [];
    coords.forEach((pt) => {
      if (!Array.isArray(pt) || pt.length < 2) return;
      let [lon, lat] = pt;
      if (!isFinite(lon) || !isFinite(lat)) return;
      if (Math.abs(lon) <= 90 && Math.abs(lat) > 90) {
        [lon, lat] = [lat, lon];
      }
      if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
      out.push([lon, lat]);
    });
    return out;
  }

  function initMap() {
    map = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        sources: {
          'satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: '© Esri'
          }
        },
        layers: [
          { id: 'satellite-layer', type: 'raster', source: 'satellite', minzoom: 0, maxzoom: 20 }
        ]
      },
      center: [data.principal.lon, data.principal.lat],
      zoom: data.principal.zoom || 13
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));

    map.on('load', () => {
      if (loadingEl) loadingEl.style.display = 'none';

      if (isFinite(data.principal.lon) && isFinite(data.principal.lat)) {
        new maplibregl.Marker({ color: '#111827' })
          .setLngLat([data.principal.lon, data.principal.lat])
          .setPopup(new maplibregl.Popup().setHTML(`<div><b>${data.principal.name}</b><br/>Principal Place</div>`))
          .addTo(map);
      }

      // Secondary markers with click-only interactions
      data.secondaries.forEach((s) => {
        if (!isFinite(s.lon) || !isFinite(s.lat)) return;
        const marker = new maplibregl.Marker({ color: '#2563eb' }).setLngLat([s.lon, s.lat]).addTo(map);

        const openPanel = () => {
          currentProject = s;
          showInfoPanel(s);
        };

        marker.getElement().addEventListener('click', openPanel);
      });
    });

    map.on('error', (error) => {
      if (error?.error?.message?.includes('tile')) {
        if (!map._removed && !map.getSource('fallback-satellite')) {
          map.addSource('fallback-satellite', {
            type: 'raster',
            tiles: ['https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}.jpg'],
            tileSize: 256,
            attribution: '© Stadia Maps'
          });
          map.addLayer({ id: 'fallback-sat-layer', type: 'raster', source: 'fallback-satellite', minzoom: 0, maxzoom: 20 });
        }
      }
    });
  }

  function showInfoPanel(project) {
    const panel = document.getElementById('infoPanel');
    const title = document.getElementById('infoTitle');
    const container = document.getElementById('panoSmall');
    const distanceEl = document.getElementById('infoDistance');
    const timeEl = document.getElementById('infoTime');
    const meta = document.getElementById('infoMeta');

    title.textContent = project.name;
    panel.classList.remove('hidden');

    if (viewer && viewer.destroy) {
      viewer.destroy();
      viewer = null;
    }
    container.innerHTML = '';

    distanceEl.textContent = project.footerInfo?.distanceText || '';
    timeEl.textContent = project.footerInfo?.timeText || '';
    if (distanceEl.textContent || timeEl.textContent) {
      meta.style.display = 'flex';
    } else {
      meta.style.display = 'none';
    }

    if (project.virtualtour) {
      viewer = pannellum.viewer('panoSmall', {
        type: 'equirectangular',
        panorama: project.virtualtour,
        crossOrigin: 'anonymous',
        autoLoad: true,
        showControls: true,
        hfov: 100
      });
      viewer.on('load', () => viewer.resize());
    }
  }

  function hideInfoPanel() {
    const panel = document.getElementById('infoPanel');
    panel.classList.add('hidden');
    if (viewer && viewer.destroy) {
      viewer.destroy();
      viewer = null;
    }
  }

  function showRoute() {
    if (!currentProject) return;

    const draw = () => {
      if (routeLayerId) {
        if (map.getLayer(routeLayerId)) map.removeLayer(routeLayerId);
        if (map.getSource(routeLayerId)) map.removeSource(routeLayerId);
        routeLayerId = null;
      }

      const route = (currentProject.routes && currentProject.routes[0]) || null;
      let coords = [];

      if (route && route.geometry && route.geometry.type === 'LineString') {
        coords = sanitizeLine(route.geometry.coordinates);
      }

      if (coords.length < 2) {
        coords = [
          [data.principal.lon, data.principal.lat],
          [currentProject.lon, currentProject.lat]
        ];
      }

      const feature = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } };
      const id = `route-${currentProject.id || currentProject.name}`;

      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);

      map.addSource(id, { type: 'geojson', data: feature });
      map.addLayer({
        id,
        type: 'line',
        source: id,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#10b981', 'line-width': 6, 'line-opacity': 0.9 }
      });
      routeLayerId = id;

      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([data.principal.lon, data.principal.lat]);
      bounds.extend([currentProject.lon, currentProject.lat]);
      coords.forEach((c) => bounds.extend(c));
      map.fitBounds(bounds, { padding: 60, maxZoom: 17 });
    };

    if (!map.loaded()) {
      map.once('load', draw);
    } else {
      draw();
    }
  }

  function showHome() {
    hideInfoPanel();
    if (routeLayerId) {
      if (map.getLayer(routeLayerId)) map.removeLayer(routeLayerId);
      if (map.getSource(routeLayerId)) map.removeSource(routeLayerId);
      routeLayerId = null;
    }
    map.flyTo({ center: [data.principal.lon, data.principal.lat], zoom: data.principal.zoom || 13, duration: 1000 });
  }

  function showAbout() { alert('About Us'); }
  function showProjects() { alert('Projects'); }
  function goHome() { showHome(); }
  function toggleMenu() { alert('Menu'); }

  window.onload = function() {
    initMap();
  };

  window.showHome = showHome;
  window.showAbout = showAbout;
  window.showProjects = showProjects;
  window.goHome = goHome;
  window.toggleMenu = toggleMenu;
  window.showRoute = showRoute;
  window.hideInfoPanel = hideInfoPanel;
})();
