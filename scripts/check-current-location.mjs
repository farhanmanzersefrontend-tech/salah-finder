import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const output = path.resolve('node_modules/.tmp/current-location-check.cjs');
await mkdir(path.dirname(output), { recursive: true });
await build({ entryPoints: ['src/utils/prayerLocation.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: output });
const originalTimeout = globalThis.setTimeout;
const originalClear = globalThis.clearTimeout;
try {
  const { default: { currentPrayerLocation } } = await import(pathToFileURL(output));
  globalThis.window = { isSecureContext: true };
  let success, failure, options, deadline;
  let clears = 0;
  globalThis.setTimeout = callback => { deadline = callback; return 1; };
  globalThis.clearTimeout = () => {};
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: {
    watchPosition(onSuccess, onError, config) { success = onSuccess; failure = onError; options = config; return 42; },
    clearWatch(id) { assert.equal(id, 42); clears++; },
  } } });
  const position = accuracy => ({ coords: { latitude: 25.2048, longitude: 55.2708, accuracy } });
  const preferences = { method: 'gps', useInternet: false };
  let pending = currentPrayerLocation(preferences);
  assert.equal(options.enableHighAccuracy, true);
  assert.equal(options.maximumAge, 0);
  success(position(800)); success(position(25));
  const result = await pending;
  assert.equal(result.accuracy, 25);
  assert.equal(result.lat, 25.2048);
  assert.equal(clears, 1, 'Stop GPS after obtaining a good fix');

  pending = currentPrayerLocation(preferences);
  success(position(25000)); deadline();
  await assert.rejects(pending, /only approximate/);

  pending = currentPrayerLocation(preferences);
  failure({ code: 1 });
  await assert.rejects(pending, /permission is blocked/);

  pending = currentPrayerLocation(preferences);
  deadline();
  await assert.rejects(pending, /timed out/);

  const controller = new AbortController();
  pending = currentPrayerLocation(preferences, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(clears, 5, 'Success, failure and cancellation all stop watching');

  pending = currentPrayerLocation(preferences);
  success({ coords: { latitude: 100, longitude: 0, accuracy: 10 } });
  await assert.rejects(pending, /invalid location/);

  globalThis.fetch = async () => { throw new Error('Name lookup unavailable'); };
  pending = currentPrayerLocation({ ...preferences, useInternet: true });
  success(position(12));
  assert.equal((await pending).lat, 25.2048, 'Place-name lookup failure preserves GPS coordinates');

  window.isSecureContext = false;
  await assert.rejects(() => currentPrayerLocation(preferences), /HTTPS/);
  console.log('PASS: fresh GPS, improving accuracy, approximate-fix rejection, permissions, timeout, cancellation, invalid coordinates, reverse-lookup fallback and HTTPS guidance.');
} finally {
  globalThis.setTimeout = originalTimeout;
  globalThis.clearTimeout = originalClear;
  await rm(output, { force: true });
}
