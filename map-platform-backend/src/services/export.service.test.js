import test from 'node:test';
import assert from 'node:assert';
import { buildExportData } from './export.service.js';
import polyline from 'polyline';

test('buildExportData throws when missing principal', () => {
  assert.throws(() => buildExportData({}), /NoPrincipal/);
});

test('buildExportData returns structured data', () => {
  const doc = {
    _id: '1',
    title: 'Demo',
    principal: {
      _id: 'p',
      name: 'Home',
      latitude: 1,
      longitude: 2,
      category: 'Principal',
      footerInfo: {}
    },
    secondaries: []
  };
  const data = buildExportData(doc);
  assert.equal(data.project.title, 'Demo');
  assert.equal(data.principal.name, 'Home');
});

test('buildExportData includes routes', () => {
  const encoded = polyline.encode([
    [0, 0],
    [0, 1]
  ]);
  const doc = {
    _id: '1',
    title: 'Demo',
    principal: {
      _id: 'p',
      name: 'Home',
      latitude: 0,
      longitude: 0,
      category: 'Principal',
      footerInfo: {}
    },
    secondaries: [
      {
        _id: 's',
        name: 'Sec',
        latitude: 0,
        longitude: 1,
        routesFromBase: [encoded],
        footerInfo: {}
      }
    ]
  };
  const data = buildExportData(doc);
  assert.equal(data.secondaries[0].routes.length, 1);
  assert.equal(
    data.secondaries[0].routes[0].geometry.type,
    'LineString'
  );
});
