(async function(){
  const data = window.__PROJECT__ || await fetch('./data/project.json').then(r=>r.json());
  const map = new maplibregl.Map({
    container: 'map',
    style: data.project.styleURL,
    center: [data.principal.lon, data.principal.lat],
    zoom: data.principal.zoom || 13
  });
  // markers
  new maplibregl.Marker({ color: 'red' })
    .setLngLat([data.principal.lon, data.principal.lat])
    .addTo(map);
  data.secondaries.forEach(s => {
    new maplibregl.Marker()
      .setLngLat([s.lon, s.lat])
      .addTo(map);
    (s.routes||[]).forEach((r,i)=>{
      map.addSource(`${s.id}-${i}`, { type:'geojson', data:{ type:'Feature', geometry:r.geometry }});
      map.addLayer({ id:`${s.id}-${i}`, type:'line', source:`${s.id}-${i}`, paint:{'line-color':'#3887be','line-width':3}});
    });
  });
})();
