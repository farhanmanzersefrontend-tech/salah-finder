import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('../src/utils/mosqueRoute.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function setup(fetch) {
  const exports = {};
  vm.runInNewContext(code, { exports, fetch, URLSearchParams, AbortSignal });
  return exports;
}
test('Google Maps directions preserve origin, destination, mode, and ordered stops', () => {
  const { routeLink } = setup();
  const url = new URL(routeLink({ lat: 17, lon: 78 }, { lat: 18, lon: 79 }, 'bike', [{ lat: 17.5, lon: 78.5 }]));
  assert.equal(url.searchParams.get('origin'), '17,78');
  assert.equal(url.searchParams.get('destination'), '18,79');
  assert.equal(url.searchParams.get('waypoints'), '17.5,78.5');
  assert.equal(url.searchParams.get('travelmode'), 'bicycling');
});
test('bike routing uses bike endpoint and converts GeoJSON to map coordinates', async () => {
  let requestUrl;
  const { fetchMosqueRoute } = setup(async url => {
    requestUrl = url;
    return { ok: true, json: async () => ({ code: 'Ok', routes: [{ duration: 180, distance: 900, geometry: { coordinates: [[78, 17], [78.1, 17.1]] }, legs: [{ duration: 180 }] }] }) };
  });
  const route = await fetchMosqueRoute([{ lat: 17, lon: 78 }, { lat: 17.1, lon: 78.1 }], 'bike', new AbortController().signal);
  assert.match(requestUrl, /routed-bike\/route\/v1\/driving\/78,17;78.1,17.1/);
  assert.equal(JSON.stringify(route.coordinates), '[[17,78],[17.1,78.1]]');
  assert.equal(route.duration, 180);
});
test('missing route produces a useful error instead of a fabricated estimate', async () => {
  const { fetchMosqueRoute } = setup(async () => ({ ok: true, json: async () => ({ code: 'NoRoute', routes: [] }) }));
  await assert.rejects(fetchMosqueRoute([{ lat: 17, lon: 78 }, { lat: 18, lon: 79 }], 'car', new AbortController().signal), /No route found/);
});
test('travel duration formats both short and long journeys', () => {
  const { durationLabel } = setup();
  assert.equal(durationLabel(5.2), '6 mins');
  assert.equal(durationLabel(105), '1 hr 45 mins');
});
