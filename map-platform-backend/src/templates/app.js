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
  const detailLinks = document.getElementById('detailLinks');
  const routeToggle = document.getElementById('routeToggle');
  const backBtn = document.getElementById('backBtn');
  const TOUR_WHITELIST = ['my.matterport.com','kuula.co','youzvirtualtour.com'];
  const logoEl = document.getElementById('logo');
  const placesMenu = document.getElementById('placesMenu');
  const placesButton = document.getElementById('placesMenuButton');
  const placesDropdown = document.getElementById('placesDropdown');
  let placesDropdownOpen = false;

  if (logoEl) {
    logoEl.addEventListener('click', () => {
      if (!map) return;
      const { lon, lat, zoom } = data.principal || {};
      if (isFinite(lon) && isFinite(lat)) {
        map.flyTo({ center: [lon, lat], zoom: zoom || map.getZoom() });
      }
    });
  }

  function closePlacesDropdown() {
    if (!placesMenu || !placesDropdownOpen) return;
    placesMenu.classList.remove('open');
    placesDropdownOpen = false;
  }

  function openPlacesDropdown() {
    if (!placesMenu || placesDropdownOpen) return;
    placesMenu.classList.add('open');
    placesDropdownOpen = true;
  }

  function togglePlacesDropdown() {
    if (placesDropdownOpen) closePlacesDropdown();
    else openPlacesDropdown();
  }

  if (placesButton) {
    placesButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      togglePlacesDropdown();
    });
  }

  document.addEventListener('click', (event) => {
    if (!placesMenu) return;
    if (placesMenu.contains(event.target)) return;
    closePlacesDropdown();
  });

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
    console.log('Ensuring Three.js is loaded...');
    if(window.THREE && window.THREE.GLTFLoader && window.THREE.DRACOLoader) {
      console.log('Three.js already loaded');
      return window.THREE;
    }
    
    const base=window.THREE_SRC||'https://cdn.jsdelivr.net/npm/three@0.137.0/build/three.min.js';
    console.log('Loading Three.js from:', base);
    
    try {
      if(base.startsWith('http')){
        console.log('Loading from CDN...');
        // Load Three.js directly from CDN
        await loadScript(base);
        // Load loaders from the same CDN
        const baseUrl = base.replace('/build/three.min.js', '');
        await loadScript(`${baseUrl}/examples/js/loaders/GLTFLoader.js`);
        await loadScript(`${baseUrl}/examples/js/loaders/DRACOLoader.js`);
      }else{
        console.log('Loading from local files...');
        await loadScript(`${base}/three.min.js`);
        await loadScript(`${base}/GLTFLoader.js`);
        await loadScript(`${base}/DRACOLoader.js`);
      }
      
      if(window.THREE && window.THREE.GLTFLoader) {
        console.log('Three.js loaded successfully');
        return window.THREE;
      } else {
        console.error('Three.js failed to load properly');
        return null;
      }
    } catch (error) {
      console.error('Error loading Three.js:', error);
      return null;
    }
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

  function focusPlaceOnMap(place) {
    if (!map || !place) return;
    if (!isFinite(place.lon) || !isFinite(place.lat)) return;
    const zoom = isFinite(place.zoom) ? Math.min(place.zoom, 18) : Math.min(data.principal.zoom || 15, 18);
    map.flyTo({ center: [place.lon, place.lat], zoom, duration: 1000 });
  }

  function renderPlacesDropdown() {
    if (!placesDropdown) return;
    placesDropdown.innerHTML = '';
    const places = (data.secondaries || []).filter((s) => isFinite(s.lon) && isFinite(s.lat));
    if (!places.length) {
      const empty = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'dropdown-empty';
      span.textContent = 'No secondary places yet';
      empty.appendChild(span);
      placesDropdown.appendChild(empty);
      return;
    }

    places.forEach((place) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = place.name || 'Unnamed place';
      btn.addEventListener('click', () => {
        closePlacesDropdown();
        focusPlaceOnMap(place);
        openDetails(place, true);
      });
      li.appendChild(btn);
      placesDropdown.appendChild(li);
    });
  }

  function openPlaceMedia(place) {
    if (!place || !place.media) return;
    if (place.media.type === 'panorama' && place.media.panoramaUrl) {
      openPanoModal(place.media.panoramaUrl, place.name);
    } else if (place.media.type === 'tour' && place.media.tourUrl) {
      openTourModal(place.media.tourUrl, place.name);
    }
  }

  renderPlacesDropdown();

  function loadModel(place) {
    if (!place.model3d || !place.model3d.url || !window.THREE) {
      console.log('Model loading skipped for:', place.name, '- model3d:', !!place.model3d, 'url:', place.model3d?.url, 'THREE:', !!window.THREE);
      return;
    }
    
    // Validate URL format
    let modelUrl = place.model3d.url;
    if (!modelUrl.startsWith('http') && !modelUrl.startsWith('./') && !modelUrl.startsWith('models/')) {
      modelUrl = `models/${modelUrl}`;
      console.log('Fixed model URL for', place.name, ':', modelUrl);
    }
    
    console.log('Loading 3D model for:', place.name, 'URL:', modelUrl);
    console.log('Place coordinates:', place.lon, place.lat);
    console.log('Model settings:', place.model3d);
    
    const loader = new THREE.GLTFLoader();
    if (THREE.DRACOLoader) {
      const dracoLoader = new THREE.DRACOLoader();
      if (window.DRACO_DECODER_PATH) dracoLoader.setDecoderPath(window.DRACO_DECODER_PATH);
      loader.setDRACOLoader(dracoLoader);
    }
    
    loader.load(
      modelUrl, 
      (gltf) => {
        console.log('3D model loaded successfully for:', place.name);
        const scene = gltf.scene;
        
        // Calculate position in Mercator coordinates
        const mc = maplibregl.MercatorCoordinate.fromLngLat([place.lon, place.lat], place.model3d.altitude || 0);
        console.log('Mercator coordinates for', place.name, ':', mc.x, mc.y, mc.z);
        
        // Set scale
        const scale = mc.meterInMercatorCoordinateUnits() * (place.model3d.scale || 1);
        scene.scale.set(scale, scale, scale);
        console.log('Model scale for', place.name, ':', scale);
        
        // Set rotation
        const rot = place.model3d.rotation || [0, 0, 0];
        scene.rotation.set(
          THREE.MathUtils.degToRad(rot[0] || 0),
          THREE.MathUtils.degToRad(rot[1] || 0),
          THREE.MathUtils.degToRad(rot[2] || 0)
        );
        console.log('Model rotation for', place.name, ':', rot);
        
        // Set position
        scene.position.set(mc.x, mc.y, mc.z);
        console.log('Model position set for', place.name, ':', mc.x, mc.y, mc.z);
        
        // Store place ID for interaction
        scene.userData.placeId = place.id || place._id || place.name;
        
        // Update matrix and disable auto-update for performance
        scene.updateMatrix();
        scene.matrixAutoUpdate = false;
        
        // Add to scene
        threeScene.add(scene);
        modelMeshes.push(scene);
        place._model = scene;
        
        console.log('3D model added to scene for:', place.name);
        console.log('Total models in scene:', modelMeshes.length);
      },
      (progress) => {
        console.log('Loading progress for', place.name, ':', (progress.loaded / progress.total * 100).toFixed(1) + '%');
      },
      (error) => {
        console.error('Error loading 3D model for', place.name, ':', error);
        console.error('Model URL was:', modelUrl);
        console.error('Full error details:', error);
      }
    );
  }

  function setupModels() {
    console.log('Setting up 3D models...');
    if (!window.THREE) {
      console.error('Three.js not available for model setup');
      return;
    }
    
    console.log('Creating Three.js scene and renderer...');
    threeScene = new THREE.Scene();
    threeCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
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
      onAdd: function () {
        console.log('Three.js custom layer added');
      },
      render: function (gl, matrix) {
        const m = new THREE.Matrix4().fromArray(matrix);
        threeCamera.projectionMatrix = m;
        if (threeRenderer.resetState) threeRenderer.resetState();
        threeRenderer.render(threeScene, threeCamera);
        map.triggerRepaint();
      }
    };
    map.addLayer(customLayer);
    console.log('Three.js custom layer added to map');

    // Add some lighting to make models visible
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    threeScene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 0);
    threeScene.add(directionalLight);
    console.log('Lighting added to Three.js scene');

    console.log('Loading models for principal place...');
    loadModel(data.principal);
    
    console.log('Loading models for secondary places...');
    data.secondaries.forEach((place, index) => {
      console.log(`Loading model ${index + 1}/${data.secondaries.length} for:`, place.name);
      loadModel(place);
    });

    const canvas = map.getCanvas();
    canvas.addEventListener('mousemove', (e) => handlePointer(e, 'move'));
    canvas.addEventListener('click', (e) => handlePointer(e, 'click'));
    canvas.addEventListener('mouseleave', () => handlePointer(null, 'leave'));
    console.log('3D model setup complete');
  }

  function handlePointer(e, type) {
    if (!raycaster || !mouse || !threeCamera) return;
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
    
    try {
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
    } catch (error) {
      console.error('Error in handlePointer:', error);
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

      if (isFinite(data.principal.lon) && isFinite(data.principal.lat)) {
        let principalEl = null;
        if (data.principal.logoUrl) {
          principalEl = document.createElement('div');
          principalEl.style.width = '40px';
          principalEl.style.height = '40px';
          principalEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
          const img = document.createElement('img');
          img.src = data.principal.logoUrl;
          img.alt = data.principal.name || 'logo';
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'contain';
          principalEl.appendChild(img);
        }
        const pm = principalEl
          ? new maplibregl.Marker({ element: principalEl, anchor: 'bottom' })
          : new maplibregl.Marker({ color: '#111827' });
        pm.setLngLat([data.principal.lon, data.principal.lat])
          .setPopup(new maplibregl.Popup().setHTML(`<div><b>${data.principal.name}</b><br/>Principal Place</div>`))
          .addTo(map);
        const principalMarkerEl = pm.getElement();
        if (principalMarkerEl) {
          principalMarkerEl.style.cursor = 'pointer';
          principalMarkerEl.addEventListener('click', () => {
            closePlacesDropdown();
            openPlaceMedia(data.principal);
            openDetails(data.principal, true);
          });
        }
        console.log('Added marker for principal place:', data.principal.name, 'with logo:', !!data.principal.logoUrl);
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
    renderPlacesDropdown();
    data.secondaries.forEach((s) => {
      if (!isFinite(s.lon) || !isFinite(s.lat)) return;
      let marker = null;
      
      // Create marker with logo if available
      let markerEl = null;
      if (s.logoUrl) {
        markerEl = document.createElement('div');
        markerEl.style.width = '36px';
        markerEl.style.height = '36px';
        markerEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
        const img = document.createElement('img');
        img.src = s.logoUrl;
        img.alt = s.name || 'logo';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        markerEl.appendChild(img);
      }
      marker = markerEl
        ? new maplibregl.Marker({ element: markerEl, anchor: 'bottom' })
        : new maplibregl.Marker({ color: '#2563eb' });
      marker.setLngLat([s.lon, s.lat]).addTo(map);
      s._marker = marker;
      console.log('Added marker for:', s.name, 'with logo:', !!s.logoUrl);

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
        const markerEl = marker.getElement();
        markerEl.style.cursor = 'pointer';
        markerEl.addEventListener('mouseenter', () => showPreview(s));
        markerEl.addEventListener('mouseleave', () => cancelPreview());
        markerEl.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          closePlacesDropdown();
          openPlaceMedia(s);
          open();
        });
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
    if (detailLinks) {
      detailLinks.innerHTML = '';
      if (project.googleMapsUrl) {
        const mapsLink = document.createElement('a');
        mapsLink.href = project.googleMapsUrl;
        mapsLink.target = '_blank';
        mapsLink.rel = 'noopener noreferrer';
        mapsLink.className = 'maps-link';
        mapsLink.innerHTML = 'Open in Google Maps';
        detailLinks.appendChild(mapsLink);
      }
    }
    detailMedia.innerHTML = '';
    if (viewer && viewer.destroy) {
      viewer.destroy();
      viewer = null;
    }
    
    // Create media preview with modal buttons
    if (project.media?.type === 'panorama' && project.media.panoramaUrl) {
      const panoBtn = document.createElement('button');
      panoBtn.textContent = 'View 360° Panorama';
      panoBtn.className = 'media-btn pano-btn';
      panoBtn.onclick = () => openPanoModal(project.media.panoramaUrl, project.name);
      detailMedia.appendChild(panoBtn);
    } else if (project.media?.type === 'tour' && project.media.tourUrl) {
      const tourBtn = document.createElement('button');
      tourBtn.textContent = 'Open Virtual Tour';
      tourBtn.className = 'media-btn tour-btn';
      tourBtn.onclick = () => openTourModal(project.media.tourUrl, project.name);
      detailMedia.appendChild(tourBtn);
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

  // Modal functions
  function openTourModal(url, title) {
    const modal = document.getElementById('tourModal');
    const iframe = document.getElementById('tourIframe');
    const modalTitle = document.getElementById('tourModalTitle');
    
    iframe.src = url;
    modalTitle.textContent = title || 'Virtual Tour';
    modal.classList.remove('hidden');
  }

  function closeTourModal() {
    const modal = document.getElementById('tourModal');
    const iframe = document.getElementById('tourIframe');
    
    iframe.src = '';
    modal.classList.add('hidden');
  }

  function openPanoModal(url, title) {
    const modal = document.getElementById('panoModal');
    const container = document.getElementById('panoContainer');
    const modalTitle = document.getElementById('panoModalTitle');
    
    modalTitle.textContent = title || '360° View';
    modal.classList.remove('hidden');
    
    // Initialize Pannellum
    ensurePannellum().then(() => {
      if (viewer && viewer.destroy) {
        viewer.destroy();
      }
      viewer = pannellum.viewer(container, {
        type: 'equirectangular',
        panorama: url,
        autoLoad: true,
        showControls: true,
        showFullscreenCtrl: true,
        showZoomCtrl: true
      });
    });
  }

  function closePanoModal() {
    const modal = document.getElementById('panoModal');
    if (viewer && viewer.destroy) {
      viewer.destroy();
      viewer = null;
    }
    modal.classList.add('hidden');
  }

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
      } else if(!detailsView.classList.contains('hidden')){
        stickyProject = null;
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
  window.openTourModal = openTourModal;
  window.closeTourModal = closeTourModal;
  window.openPanoModal = openPanoModal;
  window.closePanoModal = closePanoModal;
  window.addEventListener('beforeunload',()=>{
    if(viewer && viewer.destroy){viewer.destroy();}
    if(threeRenderer && threeRenderer.dispose){
      threeRenderer.dispose();
      threeScene=null; threeCamera=null; raycaster=null; mouse=null;
    }
  });
})();
