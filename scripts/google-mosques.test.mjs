import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function setup(searchNearby) {
  const transpile = file => ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const nearby = {};
  vm.runInNewContext(transpile('../src/utils/nearbyMosques.ts'), { exports: nearby });
  const exports = {};
  const google = { maps: { importLibrary: async () => ({ Place: { searchNearby } }), places: { SearchNearbyRankPreference: { DISTANCE: 'DISTANCE' } } } };
  vm.runInNewContext(transpile('../src/utils/googleMosques.ts'), { exports, google, require: () => nearby });
  return exports;
}
const place = (id, lat) => ({ id, displayName: id, location: { lat: () => lat, lng: () => 0 }, formattedAddress: 'Main road', googleMapsURI: 'https://maps.google.com/' });

test('Google search requests mosques within exactly 1000 meters, nearest first', () => {
  const { googleMosqueRequest } = setup();
  const request = googleMosqueRequest(17, 78);
  assert.equal(request.locationRestriction.radius, 1000);
  assert.equal(request.locationRestriction.center.lat, 17);
  assert.equal(request.locationRestriction.center.lng, 78);
  assert.equal(request.includedTypes[0], 'mosque');
  assert.equal(request.rankPreference, 'DISTANCE');
  assert.equal(request.maxResultCount, 20);
});
test('Google results are distance sorted and outside-radius places are excluded', async () => {
  const { googleNearbyMosques } = setup(async () => ({ places: [place('farther', 0.008), place('nearest', 0.001), place('outside', 0.02), { id: 'missing-location' }] }));
  const results = await googleNearbyMosques('configured-key', 0, 0, new AbortController().signal);
  assert.equal(results.length, 2);
  assert.equal(results[0].id, 'nearest');
  assert.ok(results.every(item => item.distance <= 1000));
});
test('a stale Google search cannot replace the results for a newer location', async () => {
  const controller = new AbortController();
  const { googleNearbyMosques } = setup(async () => { controller.abort(); return { places: [place('stale', 0.001)] }; });
  await assert.rejects(googleNearbyMosques('configured-key', 0, 0, controller.signal), { name: 'AbortError' });
});
test('Google authorization and API failures propagate for provider fallback', async () => {
  const { googleNearbyMosques } = setup(async () => { throw new Error('REQUEST_DENIED'); });
  await assert.rejects(googleNearbyMosques('configured-key', 0, 0, new AbortController().signal), /REQUEST_DENIED/);
});
