import test from 'node:test';
import assert from 'node:assert';
import { buildExportData } from './export.service.js';

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
