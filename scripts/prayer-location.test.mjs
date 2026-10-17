import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('../src/utils/prayerLocation.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function setup() {
  const exports = {};
  let success, failure, deadline, options;
  const cleared = [];
  const navigator = { geolocation: {
    watchPosition(onSuccess, onError, settings) { success = onSuccess; failure = onError; options = settings; return 7; },
    clearWatch(id) { cleared.push(id); },
  } };
  vm.runInNewContext(code, { exports, navigator, window: { isSecureContext: true }, DOMException,
    setTimeout(callback) { deadline = callback; return 1; }, clearTimeout() {},
  });
  return { exports, position: accuracy => success({ coords: { latitude: 17.385, longitude: 78.4867, accuracy } }),
    fail: value => failure(value), expire: () => deadline(), options: () => options, cleared };
}
test('GPS requests a fresh high-accuracy fix and waits past coarse readings', async () => {
  const env = setup();
  const promise = env.exports.currentPrayerLocation({ method: 'gps', useInternet: false }, undefined, 100);
  assert.equal(env.options().enableHighAccuracy, true);
  assert.equal(env.options().maximumAge, 0);
  env.position(800);
  assert.equal(env.cleared.length, 0);
  env.position(12);
  const result = await promise;
  assert.equal(result.accuracy, 12);
  assert.equal(result.lat, 17.385);
  assert.deepEqual(env.cleared, [7]);
});
test('coarse location is rejected instead of being labelled precise', async () => {
  const env = setup();
  const promise = env.exports.currentPrayerLocation({ method: 'gps', useInternet: false }, undefined, 100);
  env.position(800); env.expire();
  await assert.rejects(promise, /only approximate/);
  assert.deepEqual(env.cleared, [7]);
});
test('permission rejection explains how to retry and releases the GPS watch', async () => {
  const env = setup();
  const promise = env.exports.currentPrayerLocation({ method: 'gps', useInternet: false }, undefined, 100);
  env.fail({ code: 1 });
  await assert.rejects(promise, /permission is blocked/);
  assert.deepEqual(env.cleared, [7]);
});
test('leaving the page cancels GPS and releases its watch', async () => {
  const env = setup();
  const controller = new AbortController();
  const promise = env.exports.currentPrayerLocation({ method: 'gps', useInternet: false }, controller.signal, 100);
  controller.abort();
  await assert.rejects(promise, { name: 'AbortError' });
  assert.deepEqual(env.cleared, [7]);
});
