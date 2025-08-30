(async function(){
  const loadingEl = document.getElementById('loading');
  const data = window.__PROJECT__ || await fetch('./data/project.json').then(r=>r.json());

  let map;
  let currentProject = null;
  let routeLayerId = null;
  let viewer = null;
  let stickyProject = null;
  let previewProject = null;
  let threeScene = null;
  let threeCamera = null;
  let threeRenderer = null;
  const modelMeshes = [];
  let raycaster = null;
  let mouse = null;
  let hoveredModel = null;
  let lastFocus = null;

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
  const TOUR_WHITELIST = ['my.matterport.com','kuula.co'];
  const logoEl = document.getElementById('logo');

  if (logoEl) {
    logoEl.addEventListener('click', () => {
      if (!map) return;
      const { lon, lat, zoom } = data.principal || {};
      if (isFinite(lon) && isFinite(lat)) {
        map.flyTo({ center: [lon, lat], zoom: zoom || map.getZoom() });
      }
    });
  }

  function loadScript(src){
    return new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src=src;
      s.onload=res;
      s.onerror=rej;
      document.head.appendChild(s);
    });
  }

  async function ensurePannellum(){
    if(window.pannellum) return window.pannellum;
    const src=window.PANNELLUM_SRC||'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
    await loadScript(src);
    return window.pannellum;
  }

  async function ensureThree(){
    if(window.THREE && window.THREE.GLTFLoader && window.THREE.DRACOLoader) return window.THREE;
    const base=window.THREE_SRC||'https://unpkg.com/three@0.155.0';
    if(base.startsWith('http')){
      await loadScript(`${base}/build/three.min.js`);
      await loadScript(`${base}/examples/js/loaders/GLTFLoader.js`);
      await loadScript(`${base}/examples/js/loaders/DRACOLoader.js`);
    }else{
      await loadScript(`${base}/three.min.js`);
      await loadScript(`${base}/GLTFLoader.js`);
      await loadScript(`${base}/DRACOLoader.js`);
    }
    return window.THREE;
  }

  function getSecondaryById(id) {
    return data.secondaries.find((s) => s.id === id || s._id === id || s.name === id);
  }

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

  function loadModel(place) {
    if (!place.model3d || !place.model3d.url || !window.THREE) return;
    const loader = new THREE.GLTFLoader();
    if (THREE.DRACOLoader) {
      const dracoLoader = new THREE.DRACOLoader();
      if (window.DRACO_DECODER_PATH) dracoLoader.setDecoderPath(window.DRACO_DECODER_PATH);
      loader.setDRACOLoader(dracoLoader);
    }
    loader.load(place.model3d.url, (gltf) => {
      const scene = gltf.scene;
      const mc = maplibregl.MercatorCoordinate.fromLngLat([place.lon, place.lat], place.model3d.altitude || 0);
      const scale = mc.meterInMercatorCoordinateUnits() * (place.model3d.scale || 1);
      scene.scale.set(scale, scale, scale);
      const rot = place.model3d.rotation || [0, 0, 0];
      scene.rotation.set(
        THREE.MathUtils.degToRad(rot[0] || 0),
        THREE.MathUtils.degToRad(rot[1] || 0),
        THREE.MathUtils.degToRad(rot[2] || 0)
      );
      scene.position.set(mc.x, mc.y, mc.z);
      scene.userData.placeId = place.id || place._id || place.name;
      scene.updateMatrix();
      scene.matrixAutoUpdate = false;
      threeScene.add(scene);
      modelMeshes.push(scene);
      place._model = scene;
    });
  }

  function setupModels() {
    if (!window.THREE) return;
    threeScene = new THREE.Scene();
    threeCamera = new THREE.Camera();
    threeRenderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: map.painter.context.gl,
      antialias: true
    });
    threeRenderer.autoClear = false;
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    const customLayer = {
      id: 'three-models',
      type: 'custom',
      renderingMode: '3d',
      onAdd: function () {},
      render: function (gl, matrix) {
        const m = new THREE.Matrix4().fromArray(matrix);
        threeCamera.projectionMatrix = m;
        if (threeRenderer.resetState) threeRenderer.resetState();
        threeRenderer.render(threeScene, threeCamera);
        map.triggerRepaint();
      }
    };
    map.addLayer(customLayer);

    loadModel(data.principal);
    data.secondaries.forEach(loadModel);

    const canvas = map.getCanvas();
    canvas.addEventListener('mousemove', (e) => handlePointer(e, 'move'));
    canvas.addEventListener('click', (e) => handlePointer(e, 'click'));
    canvas.addEventListener('mouseleave', () => handlePointer(null, 'leave'));
  }

  function handlePointer(e, type) {
    if (!raycaster || !mouse) return;
    if (type === 'leave') {
      if (hoveredModel) {
        window.dispatchEvent(new CustomEvent('glb-marker', { detail: { type: 'leave', placeId: hoveredModel } }));
        hoveredModel = null;
      }
      return;
    }
    const rect = map.getCanvas().getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, threeCamera);
    const hits = raycaster.intersectObjects(modelMeshes, true);
    if (hits.length) {
      let obj = hits[0].object;
      while (obj && !obj.userData.placeId) obj = obj.parent;
      if (!obj) return;
      const placeId = obj.userData.placeId;
      if (type === 'move') {
        if (hoveredModel !== placeId) {
          if (hoveredModel) {
            window.dispatchEvent(new CustomEvent('glb-marker', { detail: { type: 'leave', placeId: hoveredModel } }));
          }
          hoveredModel = placeId;
          window.dispatchEvent(new CustomEvent('glb-marker', { detail: { type: 'hover', placeId } }));
        }
      } else if (type === 'click') {
        window.dispatchEvent(new CustomEvent('glb-marker', { detail: { type: 'click', placeId } }));
      }
    } else if (type === 'move' && hoveredModel) {
      window.dispatchEvent(new CustomEvent('glb-marker', { detail: { type: 'leave', placeId: hoveredModel } }));
      hoveredModel = null;
    }
  }

  function initMap() {
    const style =
      data.project.styleURL && data.project.styleURL !== 'satellite'
        ? data.project.styleURL
        : {
            version: 8,
            sources: {
              satellite: {
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
          };

    map = new maplibregl.Map({
      container: 'map',
      style,
      center: [data.principal.lon, data.principal.lat],
      zoom: data.principal.zoom || 13
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));
    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    map.on('load', async () => {
      if (loadingEl) loadingEl.style.display = 'none';

      if (
        isFinite(data.principal.lon) &&
        isFinite(data.principal.lat) &&
        !(data.principal.model3d && data.principal.model3d.useAsMarker)
      ) {
        new maplibregl.Marker({ color: '#111827' })
          .setLngLat([data.principal.lon, data.principal.lat])
          .setPopup(new maplibregl.Popup().setHTML(`<div><b>${data.principal.name}</b><br/>Principal Place</div>`))
          .addTo(map);
      }

      populateSecondaries();
      const hasModels = data.principal.model3d || data.secondaries.some((s) => s.model3d);
      if (hasModels) {
        await ensureThree();
        setupModels();
      }
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
      let marker = null;
      if (!s.model3d || !s.model3d.useAsMarker) {
        marker = new maplibregl.Marker({ color: '#2563eb' }).setLngLat([s.lon, s.lat]).addTo(map);
        s._marker = marker;
      }

      const li = document.createElement('li');
      li.className = 'secondary-item';
      li.tabIndex = 0;
      li.setAttribute('role','button');
      li.innerHTML = `<span>${s.name}</span>` +
        (s.category ? ` <span class="badge">${s.category}</span>` : '') +
        (s.footerInfo?.distanceText ? ` <span class="badge">${s.footerInfo.distanceText}</span>` : '') +
        (s.footerInfo?.timeText ? ` <span class="badge">${s.footerInfo.timeText}</span>` : '') +
        (s.model3d ? ` <span class="badge">3D</span>` : '');
      s._li = li;

      const open = () => openDetails(s, true);
      li.addEventListener('click', open);
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        } else if (e.key === 'Escape') {
          cancelPreview();
        }
      });
      li.addEventListener('focus', () => showPreview(s));
      li.addEventListener('blur', () => cancelPreview());
      li.addEventListener('mouseenter', () => marker && marker.getElement().classList.add('marker-highlight'));
      li.addEventListener('mouseleave', () => marker && marker.getElement().classList.remove('marker-highlight'));
      listEl.appendChild(li);
      if (marker) {
        marker.getElement().addEventListener('mouseenter', () => showPreview(s));
        marker.getElement().addEventListener('mouseleave', () => cancelPreview());
        marker.getElement().addEventListener('click', open);
      }
    });
  }
  function renderTour(url){
    let allowed=false;
    try{
      const host=new URL(url).hostname.replace(/^www\./,'');
      allowed=TOUR_WHITELIST.includes(host);
    }catch{}
    if(!allowed){
      const a=document.createElement('a');
      a.href=url;
      a.target='_blank';
      a.rel='noopener noreferrer';
      a.textContent='Open tour';
      a.className='tour-link';
      detailMedia.appendChild(a);
      return;
    }
    const iframe=document.createElement('iframe');
    iframe.src=url;
    iframe.className='tour-frame';
    iframe.allowFullscreen=true;
    detailMedia.appendChild(iframe);
    let loaded=false;
    const showFallback=()=>{
      if(loaded) return;
      detailMedia.innerHTML='';
      const a=document.createElement('a');
      a.href=url;
      a.target='_blank';
      a.rel='noopener noreferrer';
      a.textContent='Open tour';
      a.className='tour-link';
      detailMedia.appendChild(a);
    };
    iframe.addEventListener('load',()=>{loaded=true;});
    iframe.addEventListener('error',showFallback);
    setTimeout(showFallback,3000);
  }

  async function openDetails(project, sticky = false) {
    currentProject = project;
    lastFocus = document.activeElement;
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
    if (project.media?.type === 'panorama' && project.media.panoramaUrl) {
      try{
        await ensurePannellum();
        if(!detailsView.classList.contains('hidden')){
          viewer = pannellum.viewer('detailMedia', {
            type: 'equirectangular',
            panorama: project.media.panoramaUrl,
            crossOrigin: 'anonymous',
            autoLoad: true,
            showControls: true,
            hfov: 100
          });
          viewer.on('load', () => viewer.resize());
        }
      }catch{}
    } else if (project.media?.type === 'tour' && project.media.tourUrl) {
      renderTour(project.media.tourUrl);
    }
    routeToggle.checked = false;
    if (sticky) {
      stickyProject = project;
      previewProject = null;
    }
    backBtn.focus();
  }

  function showPreview(project) {
    if (stickyProject) return;
    if (previewProject && previewProject !== project) {
      cancelPreview();
    }
    previewProject = project;
    if (project._li) project._li.classList.add('hover');
    if (project._marker) project._marker.getElement().classList.add('marker-highlight');
    openDetails(project, false);
  }

  function cancelPreview() {
    if (stickyProject) return;
    if (previewProject?._li) previewProject._li.classList.remove('hover');
    if (previewProject?._marker) previewProject._marker.getElement().classList.remove('marker-highlight');
    previewProject = null;
    closeDetails();
  }

  function closeDetails() {
    detailsView.classList.add('hidden');
    listView.classList.remove('hidden');
    hideRoute();
    if (viewer && viewer.destroy) {
      viewer.destroy();
      viewer = null;
    }
    if(lastFocus){
      lastFocus.focus();
      lastFocus=null;
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
    stickyProject = null;
    closeDetails();
    map.flyTo({ center: [data.principal.lon, data.principal.lat], zoom: data.principal.zoom || 13, duration: 1000 });
  }
  function showAbout() { alert('About Us'); }
  function showProjects() { alert('Projects'); }
  function goHome() { showHome(); }
  function toggleMenu() { alert('Menu'); }

  backBtn.addEventListener('click', () => { stickyProject = null; closeDetails(); });
  routeToggle.addEventListener('change', (e) => {
    if (e.target.checked) showRoute(); else hideRoute();
  });

  window.addEventListener('glb-marker', (e) => {
    const { type, placeId } = e.detail || {};
    const place = getSecondaryById(placeId);

    if (type === 'hover' && place) {
      // Non-sticky preview while hovering a 3D marker
      showPreview(place);
    } else if (type === 'leave') {
      // Cancel preview when pointer leaves the model
      cancelPreview();
    } else if (type === 'click' && place) {
      // Sticky details on click
      openDetails(place, true);
    }
  });

  document.addEventListener('keydown',(e)=>{
    if(e.key==='Escape'){
      if(previewProject){
        cancelPreview();
      }else if(!detailsView.classList.contains('hidden')){
        stickyProject=null;
        closeDetails();
      }
    }
  });

  window.onload = function() {
    initMap();
  };

  window.showHome = showHome;
  window.showAbout = showAbout;
  window.showProjects = showProjects;
  window.goHome = goHome;
  window.toggleMenu = toggleMenu;
  window.addEventListener('beforeunload',()=>{
    if(viewer && viewer.destroy){viewer.destroy();}
    if(threeRenderer && threeRenderer.dispose){
      threeRenderer.dispose();
      threeScene=null; threeCamera=null; raycaster=null; mouse=null;
    }
  });
})();
