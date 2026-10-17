import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/utils/nearbyMosques.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports });
const { distanceMeters, parseMosques } = exports;

test('distance uses meters and handles identical coordinates', () => {
  assert.equal(distanceMeters(13, 80, 13, 80), 0);
  assert.ok(Math.abs(distanceMeters(0, 0, 0.009, 0) - 1000.75) < 1);
});

test('filters outside 1 km and sorts nearest first, including building centers', () => {
  const results = parseMosques([
    { type: 'way', id: 1, center: { lat: 0.008, lon: 0 }, tags: { name: 'Farther mosque' } },
    { type: 'node', id: 2, lat: 0.002, lon: 0, tags: { name: 'Near mosque', 'addr:street': 'Main Road' } },
    { type: 'node', id: 3, lat: 0.01, lon: 0 },
    { type: 'way', id: 4 },
  ], 0, 0);
  assert.equal(results.length, 2);
  assert.equal(results[0].name, 'Near mosque');
  assert.equal(results[0].address, 'Main Road');
  assert.ok(results.every(mosque => mosque.distance <= 1000));
});

test('deduplicates nearby named node and building records and preserves distinct mosques', () => {
  const results = parseMosques([
    { type: 'node', id: 1, lat: 0, lon: 0, tags: { name: 'Mosque A' } },
    { type: 'way', id: 2, center: { lat: 0.0001, lon: 0 }, tags: { name: 'Mosque A' } },
    { type: 'node', id: 3, lat: 0.0001, lon: 0, tags: { name: 'Mosque B' } },
  ], 0, 0);
  assert.equal(results.length, 2);
});
