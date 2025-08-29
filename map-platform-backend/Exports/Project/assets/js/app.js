(async function(){
  const loadingEl = document.getElementById('loading');
  const data = window.__PROJECT__ || await fetch('./data/project.json').then(r=>r.json());
  
  let map;
  let currentProject = null;
  let routeLayerId = null;
  let viewer = null;

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

    new maplibregl.Marker({ color: '#111827' })
      .setLngLat([data.principal.lon, data.principal.lat])
      .setPopup(new maplibregl.Popup().setHTML(`<div><b>${data.principal.name}</b><br/>Principal Place</div>`))
      .addTo(map);

    // Secondary markers with hover/click interactions
    data.secondaries.forEach((s) => {
      const marker = new maplibregl.Marker({ color: '#2563eb' }).setLngLat([s.lon, s.lat]).addTo(map);

      const openPanel = () => {
        currentProject = s;
        showInfoPanel(s);
      };

      marker.getElement().addEventListener('mouseenter', openPanel);
      marker.getElement().addEventListener('click', openPanel);
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

    // Remove existing route
    if (routeLayerId) {
      if (map.getLayer(routeLayerId)) map.removeLayer(routeLayerId);
      if (map.getSource(routeLayerId)) map.removeSource(routeLayerId);
      routeLayerId = null;
    }

    const route = (currentProject.routes && currentProject.routes[0]) || null;
    let feature;

    if (route && route.geometry && route.geometry.type === 'LineString') {
      feature = { type: 'Feature', properties: {}, geometry: route.geometry };
    } else {
      // fallback straight line
      feature = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [data.principal.lon, data.principal.lat],
            [currentProject.lon, currentProject.lat]
          ]
        }
      };
    }

    const id = `route-${currentProject.id || currentProject.name}`;
    map.addSource(id, { type: 'geojson', data: feature });
    map.addLayer({
      id,
      type: 'line',
      source: id,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#10b981', 'line-width': 6, 'line-opacity': 0.9 }
    });
    routeLayerId = id;

    // Fit to exact route geometry (no unintended fly elsewhere)
    const bounds = new maplibregl.LngLatBounds();
    feature.geometry.coordinates.forEach(c => bounds.extend(c));
    map.fitBounds(bounds, { padding: 60, maxZoom: 17 });
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
