(async function(){
  const loadingEl = document.getElementById('loading');
  const data = window.__PROJECT__ || await fetch('./data/project.json').then(r=>r.json());

  let map;
  let currentProject = null;
  let routeLayerId = null;
  let viewer = null;

  const listView = document.getElementById('listView');
  const detailsView = document.getElementById('detailsView');
  const listEl = document.getElementById('secondaryList');
  const detailTitle = document.getElementById('detailTitle');
  const detailCoords = document.getElementById('detailCoords');
  const copyBtn = document.getElementById('copyCoordsBtn');
  const detailMedia = document.getElementById('detailMedia');
  const detailDistance = document.getElementById('detailDistance');
  const detailTime = document.getElementById('detailTime');
  const routeToggle = document.getElementById('routeToggle');
  const backBtn = document.getElementById('backBtn');

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

      populateSecondaries();
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

  function populateSecondaries() {
    listEl.innerHTML = '';
    data.secondaries.forEach((s) => {
      if (!isFinite(s.lon) || !isFinite(s.lat)) return;
      const marker = new maplibregl.Marker({ color: '#2563eb' }).setLngLat([s.lon, s.lat]).addTo(map);
      s._marker = marker;

      const li = document.createElement('li');
      li.className = 'secondary-item';
      li.tabIndex = 0;
      li.innerHTML = `<span>${s.name}</span>` +
        (s.category ? ` <span class="badge">${s.category}</span>` : '') +
        (s.footerInfo?.distanceText ? ` <span class="badge">${s.footerInfo.distanceText}</span>` : '') +
        (s.footerInfo?.timeText ? ` <span class="badge">${s.footerInfo.timeText}</span>` : '') +
        (s.virtualtour ? ` <span class="badge">3D</span>` : '');

      const open = () => openDetails(s);
      li.addEventListener('click', open);
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
      li.addEventListener('mouseenter', () => marker.getElement().classList.add('marker-highlight'));
      li.addEventListener('mouseleave', () => marker.getElement().classList.remove('marker-highlight'));
      listEl.appendChild(li);

      marker.getElement().addEventListener('mouseenter', () => li.classList.add('hover'));
      marker.getElement().addEventListener('mouseleave', () => li.classList.remove('hover'));
      marker.getElement().addEventListener('click', open);
    });
  }

  function openDetails(project) {
    currentProject = project;
    listView.classList.add('hidden');
    detailsView.classList.remove('hidden');
    detailTitle.textContent = project.name;
    const coordsText = `${project.lat.toFixed(5)}, ${project.lon.toFixed(5)}`;
    detailCoords.textContent = coordsText;
    copyBtn.onclick = () => navigator.clipboard.writeText(coordsText);
    detailDistance.textContent = project.footerInfo?.distanceText || '';
    detailTime.textContent = project.footerInfo?.timeText || '';
    detailMedia.innerHTML = '';
    if (viewer && viewer.destroy) {
      viewer.destroy();
      viewer = null;
    }
    if (project.virtualtour) {
      viewer = pannellum.viewer('detailMedia', {
        type: 'equirectangular',
        panorama: project.virtualtour,
        crossOrigin: 'anonymous',
        autoLoad: true,
        showControls: true,
        hfov: 100
      });
      viewer.on('load', () => viewer.resize());
    }
    routeToggle.checked = false;
  }

  function closeDetails() {
    detailsView.classList.add('hidden');
    listView.classList.remove('hidden');
    hideRoute();
    if (viewer && viewer.destroy) {
      viewer.destroy();
      viewer = null;
    }
  }

  function hideRoute() {
    if (routeLayerId) {
      if (map.getLayer(routeLayerId)) map.removeLayer(routeLayerId);
      if (map.getSource(routeLayerId)) map.removeSource(routeLayerId);
      routeLayerId = null;
    }
  }

  function showRoute() {
    if (!currentProject) return;

    const draw = () => {
      hideRoute();
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
    closeDetails();
    map.flyTo({ center: [data.principal.lon, data.principal.lat], zoom: data.principal.zoom || 13, duration: 1000 });
  }
  function showAbout() { alert('About Us'); }
  function showProjects() { alert('Projects'); }
  function goHome() { showHome(); }
  function toggleMenu() { alert('Menu'); }

  backBtn.addEventListener('click', closeDetails);
  routeToggle.addEventListener('change', (e) => {
    if (e.target.checked) showRoute(); else hideRoute();
  });

  window.onload = function() {
    initMap();
  };

  window.showHome = showHome;
  window.showAbout = showAbout;
  window.showProjects = showProjects;
  window.goHome = goHome;
  window.toggleMenu = toggleMenu;
})();
