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

    // Prevent multiple rapid calls
    if (panel && panel.classList.contains('loading')) {
      return;
    }

    title.textContent = project.name;
    panel.classList.remove('hidden');
    panel.classList.add('loading'); // Add loading state

    if (viewer && viewer.destroy) {
      try {
      viewer.destroy();
      } catch (e) {
        console.warn('Error destroying previous viewer:', e);
      }
      viewer = null;
    }
    container.innerHTML = '';
    
    // Debug logging
    console.log('Showing info panel for:', project.name);
    console.log('Virtual tour URL:', project.virtualtour);
    console.log('Pannellum library available:', typeof pannellum !== 'undefined');
    console.log('Container element:', container);
    console.log('Container ID:', container.id);

    distanceEl.textContent = project.footerInfo?.distanceText || '';
    timeEl.textContent = project.footerInfo?.timeText || '';
    if (distanceEl.textContent || timeEl.textContent) {
      meta.style.display = 'flex';
    } else {
      meta.style.display = 'none';
    }

    if (project.virtualtour) {
       // Check if Pannellum is available
       if (typeof pannellum === 'undefined') {
         console.error('Pannellum library not loaded');
         container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280; font-size: 14px;">360° viewer not available</div>';
         return;
       }
       
               // Ensure container exists and is ready
        if (!container || !container.id) {
          console.error('Container element not found or invalid');
          return;
        }
        
        // Check container visibility and dimensions
        const containerStyle = window.getComputedStyle(container);
        console.log('Container display:', containerStyle.display);
        console.log('Container visibility:', containerStyle.visibility);
        console.log('Container dimensions:', container.offsetWidth, 'x', container.offsetHeight);
        console.log('Container position:', containerStyle.position);
        console.log('Container z-index:', containerStyle.zIndex);
        
        // Test if the image URL is accessible
        console.log('Testing image URL accessibility...');
        const testImg = new Image();
        testImg.crossOrigin = 'anonymous';
        testImg.onload = () => {
          console.log('✅ Image URL is accessible and loads successfully');
        };
        testImg.onerror = () => {
          console.error('❌ Image URL failed to load:', project.virtualtour);
        };
        testImg.src = project.virtualtour;
       
                               try {
                  // Clear container completely - don't add placeholder
                  container.innerHTML = '';

                  // Ensure container has proper dimensions before Pannellum initialization
                  container.style.height = '220px';
                  container.style.minHeight = '220px';
                  container.style.width = '100%';

                  // Small delay to ensure DOM is ready
                  setTimeout(() => {
                    // Ensure container is completely clean
                    container.innerHTML = '';
                    container.className = 'pano-small';
                    
                    container.id = 'panoSmall';
            try {
              console.log('Creating Pannellum viewer for container:', container.id);
              console.log('Container dimensions:', container.offsetWidth, 'x', container.offsetHeight);
              
                                                           // Create a simpler Pannellum configuration
      viewer = pannellum.viewer('panoSmall', {
        type: 'equirectangular',
        panorama: project.virtualtour,
        crossOrigin: 'anonymous',
        autoLoad: true,
        showControls: true,
                hfov: 100,
                minHfov: 50,
                maxHfov: 120,
                showZoomCtrl: true,
                showFullscreenCtrl: true,
                showNavCtrl: true,
                autoRotate: -2,
                autoRotateInactivityDelay: 2000,
                autoRotateStopDelay: 2000
              });
              
              console.log('Pannellum viewer created:', viewer);
              
              if (viewer) {
                console.log('Viewer created successfully, setting up event listeners');
                
                                 viewer.on('load', () => {
                   console.log('Pannellum load event fired');
                   console.log('360° image loaded successfully from:', project.virtualtour);
                   
                   // Remove loading state
                   panel.classList.remove('loading');
                   
                   // Force a resize immediately
                   if (viewer && typeof viewer.resize === 'function') {
                     console.log('Calling viewer.resize()');
                     viewer.resize();
                   }
                   
                   // Ensure the container is properly set up
                   container.style.height = '220px';
                   container.style.minHeight = '220px';
                   container.style.width = '100%';
                   
                   // Clean up any leftover loading text
                   const loadingText = container.querySelector('div[style*="Loading 360° viewer"]');
                   if (loadingText) {
                     loadingText.remove();
                   }
                   
                   // Log viewer state
                   console.log('Viewer state after load:', {
                     isLoaded: viewer.isLoaded(),
                     getConfig: viewer.getConfig()
                   });
                   
                                       // Force proper canvas dimensions and ensure image loads
                    setTimeout(() => {
                      const canvas = container.querySelector('canvas');
                      if (canvas) {
                        console.log('Canvas dimensions before fix:', canvas.width, 'x', canvas.height);
                        
                        // Force canvas to proper size
                        canvas.style.height = '100%';
                        canvas.style.width = '100%';
                        canvas.height = container.offsetHeight;
                        canvas.width = container.offsetWidth;
                        
                        // Force container dimensions
                        container.style.height = '220px';
                        container.style.minHeight = '220px';
                        
                        console.log('Canvas dimensions after fix:', canvas.width, 'x', canvas.height);
                        console.log('Canvas computed style:', window.getComputedStyle(canvas).height);
                        
                        // Check if canvas has content
                        const ctx = canvas.getContext('2d');
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const hasContent = imageData.data.some(pixel => pixel !== 0);
                        console.log('Canvas has content:', hasContent);
                        
                        if (!hasContent) {
                          console.warn('Canvas appears to be empty, forcing image reload');
                          // Try to reload the panorama
                          if (viewer && typeof viewer.loadScene === 'function') {
                            viewer.loadScene({
                              type: 'equirectangular',
                              panorama: project.virtualtour
                            });
                          }
                        }
                      }
                      
                      if (viewer && typeof viewer.resize === 'function') {
                        console.log('Calling viewer.resize() after canvas fix');
                        viewer.resize();
                      }
                    }, 100);
                   
                                           // Additional resize after a longer delay
                        setTimeout(() => {
                          if (viewer && typeof viewer.resize === 'function') {
                            console.log('Final viewer.resize() call');
                            viewer.resize();
                          }
                          
                          // Continuously monitor and fix canvas height
                          const fixCanvasHeight = () => {
                            const canvas = container.querySelector('canvas');
                            if (canvas && canvas.style.height !== '100%') {
                              console.log('Fixing canvas height to 100%');
                              canvas.style.height = '100%';
                              canvas.style.minHeight = '100%';
                              canvas.style.maxHeight = 'none';
                            }
                          };
                          
                          // Check every 500ms for 5 seconds
                          let checkCount = 0;
                          const heightCheckInterval = setInterval(() => {
                            fixCanvasHeight();
                            checkCount++;
                            if (checkCount >= 10) {
                              clearInterval(heightCheckInterval);
                            }
                          }, 500);
                     
                                           // Final canvas dimension check and fix
                      const canvas = container.querySelector('canvas');
                      if (canvas && canvas.height < 200) {
                        console.log('Canvas still too small, forcing dimensions again');
                        canvas.height = container.offsetHeight;
                        canvas.width = container.offsetWidth;
                        canvas.style.height = '100%';
                        canvas.style.width = '100%';
                        
                        if (viewer && typeof viewer.resize === 'function') {
                          viewer.resize();
                        }
                      }
                      
                      // Check if the image is actually visible
                      const ctx = canvas.getContext('2d');
                      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                      const hasVisibleContent = imageData.data.some((pixel, index) => {
                        // Check for non-transparent pixels (every 4th value is alpha)
                        return index % 4 === 3 && pixel > 0;
                      });
                      console.log('Canvas has visible content after 500ms:', hasVisibleContent);
                      
                      if (!hasVisibleContent) {
                        console.warn('Canvas still appears empty, trying alternative approach');
                        // Try to force a complete reload
                        if (viewer && typeof viewer.destroy === 'function') {
                          viewer.destroy();
                          setTimeout(() => {
                            viewer = pannellum.viewer('panoSmall', {
                              type: 'equirectangular',
                              panorama: project.virtualtour,
                              crossOrigin: 'anonymous',
                              autoLoad: true,
                              showControls: true
                            });
                          }, 100);
                        }
                      }
                   }, 500);
                 });
                
                                        viewer.on('error', (error) => {
                          console.error('360° image failed to load:', error);
                          container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280; font-size: 14px;">360° image not available</div>';
                          panel.classList.remove('loading'); // Remove loading state on error
                        });

                        // Handle fullscreen toggle
                        viewer.on('fullscreenchange', (isFullscreen) => {
                          console.log('Fullscreen changed:', isFullscreen);
                          if (isFullscreen) {
                            // Force fullscreen dimensions
                            const fullscreenContainer = document.querySelector('.pnlm-fullscreen');
                            if (fullscreenContainer) {
                              fullscreenContainer.style.width = '100vw';
                              fullscreenContainer.style.height = '100vh';
                              fullscreenContainer.style.minHeight = '100vh';
                              
                              const fullscreenCanvas = fullscreenContainer.querySelector('canvas');
                              if (fullscreenCanvas) {
                                fullscreenCanvas.style.width = '100%';
                                fullscreenCanvas.style.height = '100%';
                                fullscreenCanvas.style.minHeight = '100vh';
                              }
                              
                              // Force resize after a short delay
                              setTimeout(() => {
                                if (viewer && typeof viewer.resize === 'function') {
                                  viewer.resize();
                                }
                              }, 100);
                            }
                          }
                        });

                        // Add manual fullscreen handling as fallback
                        const fullscreenButton = container.querySelector('.pnlm-fullscreen-toggle-button');
                        if (fullscreenButton) {
                          fullscreenButton.addEventListener('click', () => {
                            setTimeout(() => {
                              const fullscreenContainer = document.querySelector('.pnlm-fullscreen');
                              if (fullscreenContainer) {
                                console.log('Manual fullscreen fix applied');
                                fullscreenContainer.style.width = '100vw';
                                fullscreenContainer.style.height = '100vh';
                                fullscreenContainer.style.minHeight = '100vh';
                                fullscreenContainer.style.position = 'fixed';
                                fullscreenContainer.style.top = '0';
                                fullscreenContainer.style.left = '0';
                                fullscreenContainer.style.zIndex = '9999';
                                
                                const canvas = fullscreenContainer.querySelector('canvas');
                                if (canvas) {
                                  canvas.style.width = '100%';
                                  canvas.style.height = '100%';
                                  canvas.style.minHeight = '100vh';
                                }
                                
                                if (viewer && typeof viewer.resize === 'function') {
                                  viewer.resize();
                                }
                              }
                            }, 50);
                          });
                        }
                
                // Add a timeout to check if the viewer is actually rendering
                setTimeout(() => {
                  const canvas = container.querySelector('canvas');
                  if (!canvas) {
                    console.warn('No canvas found in container after viewer creation');
                    container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280; font-size: 14px;">360° viewer not rendering</div>';
                    panel.classList.remove('loading');
                  } else {
                    console.log('Canvas found in container:', canvas);
                  }
                }, 1000);
              } else {
                console.error('Failed to create Pannellum viewer');
                container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280; font-size: 14px;">360° viewer creation failed</div>';
                panel.classList.remove('loading'); // Remove loading state on failure
              }
            } catch (viewerError) {
              console.error('Error creating Pannellum viewer:', viewerError);
              container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280; font-size: 14px;">360° viewer error</div>';
              panel.classList.remove('loading'); // Remove loading state on error
            }
          }, 200); // Increased delay to ensure DOM is fully ready
                } catch (error) {
           console.error('Failed to initialize 360° viewer:', error);
           container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280; font-size: 14px;">360° image not available</div>';
           panel.classList.remove('loading'); // Remove loading state on error
         }
         } else {
       container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280; font-size: 14px;">No 360° image available</div>';
       panel.classList.remove('loading'); // Remove loading state when no image
    }
  }

  function hideInfoPanel() {
    const panel = document.getElementById('infoPanel');
    panel.classList.add('hidden');
    if (viewer && viewer.destroy) {
      try {
      viewer.destroy();
      } catch (e) {
        console.warn('Error destroying viewer:', e);
      }
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
