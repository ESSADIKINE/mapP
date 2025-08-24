(async function(){
  const data = window.__PROJECT__ || await fetch('./data/project.json').then(r=>r.json());
  const map = new maplibregl.Map({
    container: 'map',
    style: data.project.styleURL,
    center: [data.principal.lon, data.principal.lat],
    zoom: data.principal.zoom || 13
  });

  new maplibregl.Marker({ color: 'red' })
    .setLngLat([data.principal.lon, data.principal.lat])
    .addTo(map);

  const routeLayers = {};

  data.secondaries.forEach(s => {
    new maplibregl.Marker()
      .setLngLat([s.lon, s.lat])
      .addTo(map);

    if (s.routes && s.routes.length) {
      routeLayers[s.id] = [];
      s.routes.forEach((r,i)=>{
        const sourceId = `${s.id}-${i}`;
        const layerId = `${s.id}-${i}`;
        map.addSource(sourceId, { type:'geojson', data:{ type:'Feature', geometry:r.geometry }});
        map.addLayer({ id:layerId, type:'line', source:sourceId, layout:{visibility:'none'}, paint:{'line-color':'#3887be','line-width':3}});
        routeLayers[s.id].push(layerId);
      });
    }
  });

  const menu = document.getElementById('projectsMenu');
  const pano = document.getElementById('pano');
  const routeBtn = document.getElementById('routeBtn');
  const homeLink = document.querySelector('#mainMenu > li:first-child > a');
  if (homeLink) {
    homeLink.addEventListener('click', (e) => {
      e.preventDefault();
      map.flyTo({ center:[data.principal.lon, data.principal.lat], zoom:data.principal.zoom||13 });
      pano.style.display = 'none';
      routeBtn.style.display = 'none';
    });
  }
  let viewer;

  data.secondaries.forEach(s => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = s.name;
    btn.addEventListener('click', () => {
      map.flyTo({ center:[s.lon, s.lat], zoom:14 });

      Object.values(routeLayers).flat().forEach(id => {
        map.setLayoutProperty(id, 'visibility', 'none');
      });

      if (s.virtualtour) {
        pano.style.display = 'block';
        if (viewer && viewer.destroy) viewer.destroy();
        viewer = pannellum.viewer('pano', { type:'equirectangular', panorama:s.virtualtour });
      } else {
        pano.style.display = 'none';
      }

      if (routeLayers[s.id] && routeLayers[s.id].length) {
        routeBtn.style.display = 'block';
        routeBtn.onclick = () => {
          routeLayers[s.id].forEach(id => {
            map.setLayoutProperty(id, 'visibility', 'visible');
          });
        };
      } else {
        routeBtn.style.display = 'none';
        routeBtn.onclick = null;
      }
    });
    li.appendChild(btn);
    menu.appendChild(li);
  });
})();
