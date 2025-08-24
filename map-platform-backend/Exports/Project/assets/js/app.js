(async function () {
  // --- Load project data: prefer inline JSON, fallback to window.__PROJECT__, then ./data/project.json ---
  let data = null;

  const tag = document.getElementById('project-data');
  const embedded = tag && tag.textContent && tag.textContent.trim().startsWith('{')
    ? tag.textContent.trim()
    : '';

  if (embedded) {
    try { data = JSON.parse(embedded); } catch (e) { console.error('Invalid inline JSON', e); }
  }
  if (!data && typeof window !== 'undefined' && window.__PROJECT__) {
    data = window.__PROJECT__;
  }
  if (!data) {
    // Only works when served over http(s) (won’t work with file://)
    try {
      const r = await fetch('./data/project.json');
      if (r.ok) data = await r.json();
    } catch (e) {
      console.warn('Fetch fallback failed (expected on file://):', e);
    }
  }
  if (!data) {
    alert('No project data found. Paste your JSON into <script id="project-data"> in map.html.');
    return;
  }

  // --- Header info ---
  document.getElementById('title').textContent = data.project?.title || 'Project';
  document.getElementById('subtitle').textContent = data.project?.description || '';
  const logo = document.getElementById('logo');
  if (data.project?.logo?.src) {
    logo.src = data.project.logo.src;
    logo.alt = data.project.logo.alt || 'Logo';
  } else {
    logo.style.display = 'none';
  }

  // --- Map init ---
  const map = new maplibregl.Map({
    container: 'map',
    style: data.project?.styleURL || 'https://demotiles.maplibre.org/style.json',
    center: [data.principal.lon, data.principal.lat],
    zoom: data.principal.zoom || 13
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

  // Helper: build popup HTML
  function popupHTML(place, isPrincipal) {
    const lines = [];
    lines.push(`<h3 class="popup-title">${place.name || (isPrincipal ? 'Principal' : 'Place')}</h3>`);
    const meta = [];
    if (place.category) meta.push(place.category);
    if (place.footerInfo?.location) meta.push(place.footerInfo.location);
    if (!isPrincipal) {
      if (place.footerInfo?.distanceText) meta.push(place.footerInfo.distanceText);
      if (place.footerInfo?.timeText) meta.push(place.footerInfo.timeText);
    }
    if (meta.length) lines.push(`<p class="popup-meta">${meta.join(' • ')}</p>`);
    const hasVT = !!place.virtualtour;
    lines.push(`<div>`);
    if (hasVT) {
      lines.push(`<button class="btn primary" data-action="open-pano" data-url="${encodeURIComponent(place.virtualtour)}">View 360°</button>`);
    }
    lines.push(`<button class="btn" data-action="center" data-lon="${place.lon}" data-lat="${place.lat}">Center</button>`);
    lines.push(`</div>`);
    return lines.join('');
  }

  // 360° viewer modal
  let viewer = null;
  const panoModal = document.getElementById('panoModal');
  const panoClose = document.getElementById('panoClose');
  function openPano(url) {
    panoModal.classList.remove('hidden');
    panoModal.setAttribute('aria-hidden', 'false');
    // init / reinit pannellum
    const container = document.getElementById('panorama');
    container.innerHTML = ''; // reset
    viewer = window.pannellum?.viewer('panorama', {
      type: 'equirectangular',
      panorama: url,
      autoLoad: true,
      hfov: 100,
      compass: true
    });
  }
  function closePano() {
    panoModal.classList.add('hidden');
    panoModal.setAttribute('aria-hidden', 'true');
    try { viewer?.destroy?.(); } catch {}
    viewer = null;
  }
  panoClose.addEventListener('click', closePano);
  panoModal.addEventListener('click', (e) => { if (e.target === panoModal) closePano(); });

  // Intercept popup button clicks
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    if (action === 'open-pano') {
      openPano(decodeURIComponent(btn.getAttribute('data-url')));
    } else if (action === 'center') {
      const lon = Number(btn.getAttribute('data-lon'));
      const lat = Number(btn.getAttribute('data-lat'));
      map.easeTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 15) });
    }
  });

  // Add everything after style loads
  map.on('load', () => {
    // Markers
    const principalMarker = new maplibregl.Marker({ color: '#e11d48' })
      .setLngLat([data.principal.lon, data.principal.lat])
      .setPopup(new maplibregl.Popup({ offset: 16 }).setHTML(popupHTML(data.principal, true)))
      .addTo(map);

    const allCoords = [[data.principal.lon, data.principal.lat]];

    (data.secondaries || []).forEach((s) => {
      const m = new maplibregl.Marker({ color: '#2563eb' })
        .setLngLat([s.lon, s.lat])
        .setPopup(new maplibregl.Popup({ offset: 16 }).setHTML(popupHTML(s, false)))
        .addTo(map);

      allCoords.push([s.lon, s.lat]);

      // Routes
      (s.routes || []).forEach((r, i) => {
        if (!r || !r.geometry || r.geometry.type !== 'LineString') return;
        const srcId = `route-${s.id}-${i}`;
        map.addSource(srcId, {
          type: 'geojson',
          data: { type: 'Feature', geometry: r.geometry }
        });
        map.addLayer({
          id: srcId,
          type: 'line',
          source: srcId,
          paint: { 'line-color': '#2563eb', 'line-width': 3 }
        });
        // include route coordinates in bounds
        if (Array.isArray(r.geometry.coordinates)) {
          r.geometry.coordinates.forEach((c) => Array.isArray(c) && c.length >= 2 && allCoords.push(c));
        }
      });
    });

    // Fit to project
    if (allCoords.length >= 2) {
      const b = allCoords.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(allCoords[0], allCoords[0]));
      map.fitBounds(b, { padding: 80, duration: 900 });
    }
  });
})();
