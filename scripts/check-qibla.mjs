import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const output = path.resolve('node_modules/.tmp/qibla-check.cjs');
await mkdir(path.dirname(output), { recursive: true });
await build({ stdin: {
  contents: `export * from './src/hooks/useQiblaDirection'; export { default as direction } from './src/hooks/useQiblaDirection'; export { compassHeading, compassTurn, smoothCompassHeading } from './src/hooks/useCompass';`,
  resolveDir: process.cwd(), loader: 'ts',
}, bundle: true, platform: 'node', format: 'cjs', outfile: output, packages: 'external' });
try {
  const { default: { calculateBearing, haversineDistanceKm, KAABA, compassHeading, compassTurn, smoothCompassHeading, direction } } = await import(pathToFileURL(output));
  // Independent reference bearings retrieved from AlAdhan's live API.
  for (const [city, lat, lon, expected] of [
    ['Delhi', 28.6139, 77.209, 266.59668813205985],
    ['New York', 40.7128, -74.006, 58.481712034206865],
    ['Sydney', -33.8688, 151.2093, 277.499589412883],
    ['London', 51.5074, -0.1278, 118.98724251452296],
  ]) assert.ok(Math.abs(calculateBearing(lat, lon, KAABA.lat, KAABA.lon) - expected) < 0.01, city);
  const flat = { beta: 0, gamma: 0 };
  assert.equal(compassHeading({ ...flat, alpha: 90, absolute: false }), null, 'Relative readings are not compass headings');
  assert.equal(compassHeading({ ...flat, alpha: 90, absolute: true }), 270);
  assert.equal(compassHeading({ ...flat, alpha: 90, absolute: true }, 90), 0, 'Landscape screen rotation is accounted for');
  assert.equal(compassHeading({ ...flat, webkitCompassHeading: 359, webkitCompassAccuracy: 5 }), 359, 'Safari heading is supported');
  assert.equal(compassHeading({ ...flat, webkitCompassHeading: 45, webkitCompassAccuracy: -1 }), null);
  assert.equal(compassHeading({ ...flat, webkitCompassHeading: 45, webkitCompassAccuracy: 30 }), null, 'Inaccurate readings are rejected');
  assert.equal(compassHeading({ beta: 80, gamma: 0, absolute: true, alpha: 15 }), null, 'Tilted phones do not claim alignment');
  assert.equal(compassHeading({ ...flat, absolute: true, alpha: NaN }), null);
  assert.equal(compassTurn(359, 1), 2, 'Crossing north takes the shortest turn');
  assert.equal(compassTurn(1, 359), -2);
  assert.equal(compassTurn(1080, 90), 90, 'Multiple rotations remain valid');
  assert.ok(smoothCompassHeading(359, 1) > 359, 'Smoothing preserves clockwise rotation across north');
  assert.ok(smoothCompassHeading(1, 359) < 1, 'Smoothing preserves counterclockwise rotation across north');
  assert.equal(smoothCompassHeading(null, 270), 270, 'The first sensor reading is immediate');
  assert.equal(compassHeading({ beta: NaN, gamma: 0, absolute: true, alpha: 90 }), null);
  assert.equal(haversineDistanceKm(KAABA.lat, KAABA.lon, KAABA.lat, KAABA.lon), 0);
  assert.ok(Number.isFinite(haversineDistanceKm(0, 0, 0, 180)), 'Antipodal distance remains finite');
  assert.equal(direction().compute(KAABA).bearing, null, 'At the Kaaba, a singular bearing is not shown');
  assert.equal(direction().compute({ lat: 100, lon: 0 }).bearing, null, 'Invalid coordinates are rejected');
  console.log('PASS: four API reference bearings, Safari/absolute readings, screen rotation, tilt and accuracy rejection, invalid coordinates and distance edge cases.');
} finally { await rm(output, { force: true }); }
