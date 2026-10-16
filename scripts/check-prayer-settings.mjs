import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const output = path.resolve('node_modules/.tmp/prayer-settings-check.cjs');
await mkdir(path.dirname(output), { recursive: true });
// Run the scheduler effects with a controlled clock, without playing real audio
// or sending system notifications. Zustand itself remains the real store.
await build({
  stdin: {
    contents: `export { usePrayerStore } from './src/store/usePrayerStore';
      export { useAzan } from './src/hooks/useAzan';
      export * from './src/utils/prayerPreferences';
      export { currentPrayerLocation } from './src/utils/prayerLocation';`,
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'cjs', outfile: output,
  packages: 'external', loader: { '.mp3': 'dataurl' },
  plugins: [{
    name: 'scheduler-effects',
    setup(build) {
      build.onResolve({ filter: /^react$/ }, (args) => args.importer.endsWith('useAzan.ts') ? { path: 'react', namespace: 'scheduler-test' } : undefined);
      build.onLoad({ filter: /.*/, namespace: 'scheduler-test' }, () => ({
        contents: `export const useEffect = effect => globalThis.testEffects.push(effect);
          export const useState = value => [value, next => globalThis.testStateUpdates.push(next)];`,
        loader: 'js',
      }));
    },
  }],
});

try {
  const saved = new Map();
  globalThis.localStorage = {
    getItem: key => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
    removeItem: key => saved.delete(key),
  };
  // Existing v2 installs have no calculation field.
  saved.set('prayer-storage', JSON.stringify({ version: 2, state: { location: 'Saved city', calculation: { method: 1, school: 1 }, reminders: { Fajr: { offset: -10 } } } }));
  const callbacks = new Map();
  let timerId = 0;
  const notifications = [];
  globalThis.Notification = class {
    static permission = 'granted';
    constructor(title, options) { notifications.push({ title, ...options }); }
    close() { this.onclose?.(); }
  };
  globalThis.window = {
    Notification,
    setInterval: (callback, delay) => { callbacks.set(++timerId, { callback, delay }); return timerId; },
    clearInterval: id => callbacks.delete(id),
  };
  const RealDate = Date;
  let clock = [2026, 9, 16, 5, 0, 12];
  globalThis.Date = class extends RealDate {
    constructor(...args) { super(...(args.length ? args : clock)); }
  };
  globalThis.testEffects = [];
  globalThis.testStateUpdates = [];
  const { default: { usePrayerStore: store, useAzan, DEFAULT_CALCULATION, DEFAULT_SILENT, adjustPrayerTimes, validateCalculation, validateCoordinates, shiftTime, preferenceEvents, quietPeriodActive, prayerWallDate, currentPrayerLocation } } = await import(pathToFileURL(output));
  assert.equal(store.getState().location, 'Saved city');
  assert.deepEqual(store.getState().calculation, { ...DEFAULT_CALCULATION, method: 1, school: 1 }, 'Old nested calculation preferences receive new defaults');
  assert.deepEqual(store.getState().reminders.Fajr, { enabled: true, offset: -10 }, 'Partial reminder preferences receive defaults');
  const calculation = { ...store.getState().calculation, daylightOffset: 60, adjustments: { ...DEFAULT_CALCULATION.adjustments, Fajr: -5 } };
  store.getState().setCalculation(calculation);
  assert.deepEqual(JSON.parse(saved.get('prayer-storage')).state.calculation, calculation, 'Calculation preferences persist');
  const raw = { Fajr: '05:00', Dhuhr: '12:00', Asr: '15:30', Maghrib: '18:00', Isha: '19:30' };
  assert.equal(adjustPrayerTimes(raw, calculation, false, false).Fajr, '05:55', 'Manual and DST adjustments combine once');
  assert.equal(adjustPrayerTimes(raw, { ...DEFAULT_CALCULATION, method: 4, ramadanIsha: true }, true, false).Isha, '20:00', 'Ramadan Isha uses 120 minutes after Maghrib');
  assert.equal(adjustPrayerTimes({ ...raw, Isha: '20:00' }, { ...DEFAULT_CALCULATION, method: 4, ramadanIsha: true }, true, false).Isha, '20:00', 'Upstream Ramadan adjustment is not doubled');
  assert.equal(adjustPrayerTimes(raw, { ...calculation, jumuahEnabled: true, jumuahTime: '13:30' }, false, true).Dhuhr, '13:30', 'Friday override is the final local time');
  assert.equal(adjustPrayerTimes(raw, { ...DEFAULT_CALCULATION, jumuahEnabled: true, jumuahTime: '13:30' }, false, false).Dhuhr, '12:00', 'Friday override does not affect other days');
  assert.equal(shiftTime('23:50', 20), '00:10');
  assert.equal(shiftTime('00:10', -20), '23:50');
  assert.throws(() => validateCalculation({ ...calculation, adjustments: { ...calculation.adjustments, Asr: NaN } }));
  assert.throws(() => validateCalculation({ ...calculation, jumuahTime: '25:00' }));
  assert.throws(() => validateCoordinates('', '12'));
  assert.throws(() => validateCoordinates('91', '12'));
  assert.throws(() => validateCoordinates('12', '-181'));
  assert.deepEqual(validateCoordinates('0', '0'), { lat: 0, lon: 0 });
  assert.equal(prayerWallDate(new RealDate('2026-10-16T00:30:00Z'), 'Asia/Dubai').getHours(), 4);
  store.getState().setCalculation(DEFAULT_CALCULATION);
  store.getState().setReminders({ ...store.getState().reminders, Fajr: { enabled: true, offset: 0 } });
  store.getState().setTimings({ Fajr: '05:00', Dhuhr: '12:00', Asr: '15:30', Maghrib: '18:00', Isha: '19:30' });
  store.getState().setAzanSettings({
    autoAzanEnabled: false,
    notificationsEnabled: true,
    perPrayer: { Fajr: false, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  });
  const azanControls = useAzan();
  const cleanup = testEffects.map(effect => effect());
  const tick = () => [...callbacks.values()].find(timer => timer.delay === 1000).callback();
  await tick();
  assert.equal(notifications[0].title, 'Fajr prayer', 'Muted prayers still receive notifications with auto azan off, even after second zero');
  await tick();
  assert.equal(notifications.length, 1, 'A prayer notification is not duplicated');
  clock = [2026, 9, 16, 15, 30, 12];
  store.getState().setAzanSettings({ notificationsEnabled: false });
  await tick();
  assert.equal(notifications.length, 1, 'Disabled reminders stay silent');
  store.getState().setAzanSettings({ notificationsEnabled: true });
  store.getState().setReminders({ ...store.getState().reminders, Asr: { enabled: true, offset: -10 } });
  clock = [2026, 9, 16, 15, 20, 12];
  await tick();
  assert.equal(notifications.at(-1).title, 'Asr prayer', 'Reminder is delivered ten minutes before prayer');
  clock = [2026, 9, 16, 15, 30, 12];
  await tick();
  assert.equal(notifications.length, 2, 'Offset reminder is not repeated at prayer time');
  store.getState().setReminders({ ...store.getState().reminders, Jumuah: { enabled: false, offset: 0 } });
  clock = [2026, 9, 16, 12, 0, 12];
  await tick();
  assert.equal(notifications.length, 2, 'Disabling Friday reminder does not fall back to Dhuhr');
  store.getState().setCalculation({ ...DEFAULT_CALCULATION, jumuahEnabled: true, jumuahTime: '13:30' });
  store.getState().setReminders({ ...store.getState().reminders, Jumuah: { enabled: true, offset: -5 } });
  clock = [2026, 9, 16, 13, 25, 12];
  await tick();
  assert.equal(notifications.at(-1).title, 'Jumuah prayer', 'Friday reminder follows the custom congregation time');
  store.getState().setTimings({ ...raw, Isha: '23:50' });
  const silent = { ...DEFAULT_SILENT, enabled: true, prayers: { ...DEFAULT_SILENT.prayers, Isha: { enabled: true, offset: 0, duration: 30 } } };
  const afterMidnight = new Date(2026, 9, 17, 0, 5);
  assert.equal(quietPeriodActive(preferenceEvents(store.getState().timings, afterMidnight, DEFAULT_CALCULATION), afterMidnight, silent), true, 'Quiet periods continue across midnight');
  store.getState().setSilent(silent);
  let audioDownloads = 0;
  let audioPlays = 0;
  let audioPauses = 0;
  globalThis.fetch = async () => { audioDownloads++; return { ok: true, blob: async () => new Blob(['test audio']) }; };
  globalThis.Audio = class { async play() { audioPlays++; } pause() { audioPauses++; } };
  store.getState().setAzanSettings({ autoAzanEnabled: true });
  clock = [2026, 9, 16, 23, 50, 12];
  await tick();
  assert.equal(store.getState().quietActive, true);
  assert.equal(notifications.at(-1).silent, true, 'Notifications during quiet time are silent');
  assert.match(store.getState().quietMessage, /started/);
  assert.equal(audioDownloads, 0, 'Automatic azan is suppressed during quiet time');
  clock = [2026, 9, 17, 0, 20, 0];
  await tick();
  assert.equal(store.getState().quietActive, false, 'Quiet period ends at the configured time');
  assert.match(store.getState().quietMessage, /ended/);
  store.getState().setSilent({ enabled: false });
  store.getState().setAzanSettings({ perPrayer: { ...store.getState().azan.perPrayer, Fajr: true } });
  clock = [2026, 9, 17, 5, 0, 12];
  await tick();
  assert.equal(audioPlays, 1, 'Azan plays again when quiet mode is disabled');
  assert.equal(testStateUpdates.at(-1), 'Fajr', 'Popup identifies the salah after playback starts');
  await new Promise(resolve => setImmediate(resolve));
  assert.match(notifications.at(-1).title, /Fajr.*Azan is playing/, 'Playing notification identifies the salah');
  const pausesBeforeMute = audioPauses;
  azanControls.stopAzan();
  assert.equal(audioPauses, pausesBeforeMute + 1, 'Mute stops the playing audio');
  assert.equal(testStateUpdates.at(-1), null, 'Mute clears the playing popup');
  await tick();
  assert.equal(audioPlays, 1, 'Repeated ticks do not replay azan');
  const persisted = JSON.parse(saved.get('prayer-storage')).state;
  assert.deepEqual(persisted.silent, { ...silent, enabled: false }, 'Silent rules persist');
  assert.equal('quietActive' in persisted, false, 'Transient quiet status is not persisted');

  let locationOptions;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: { getCurrentPosition(resolve, reject, options) { locationOptions = options; resolve({ coords: { latitude: 25, longitude: 55, accuracy: 20 } }); } } } });
  let locationLookups = 0;
  globalThis.fetch = async () => { locationLookups++; return { ok: true, json: async () => ({ address: { city: 'Dubai', country: 'United Arab Emirates' } }) }; };
  assert.equal((await currentPrayerLocation({ method: 'gps', useInternet: false })).label, 'Current location');
  assert.equal(locationOptions.enableHighAccuracy, true, 'GPS requests high accuracy');
  await currentPrayerLocation({ method: 'network', useInternet: false });
  assert.equal(locationOptions.enableHighAccuracy, false, 'Network requests standard accuracy');
  assert.equal(locationLookups, 0, 'Disabling internet skips the optional place-name lookup');
  assert.equal((await currentPrayerLocation({ method: 'network', useInternet: true })).label, 'Dubai, United Arab Emirates');
  assert.equal(locationLookups, 1, 'Place-name lookup runs only when enabled');
  store.getState().setAzanSettings({ autoAzanEnabled: false });
  cleanup.forEach(fn => fn?.());
  assert.equal(callbacks.size, 0, 'Scheduler timers are cleaned up');
  const cleanupAgain = testEffects.map(effect => effect());
  assert.equal(callbacks.size, 1, 'Scheduler restarts after React Strict Mode effect cleanup');
  clock = [2026, 9, 16, 5, 0, 12];
  const countBeforeRemount = notifications.length;
  await tick();
  assert.equal(notifications.length, countBeforeRemount, 'Delivery history survives scheduler remount');
  cleanupAgain.forEach(fn => fn?.());
  saved.set('salah-mobile-journal', JSON.stringify({ '2026-10-16': ['Fajr'] }));
  store.getState().setCoords({ lat: 25, lon: 55 });
  store.getState().setTimezone('Asia/Dubai');
  store.getState().setLocationPreferences({ method: 'gps', useInternet: false });
  store.getState().setQuietStatus(true, 'Quiet time started');
  store.getState().resetSettings();
  const defaults = store.getInitialState();
  for (const key of ['location', 'coords', 'timings', 'calculation', 'reminders', 'silent', 'locationPreferences', 'azan', 'timezone', 'quietActive', 'quietMessage']) {
    assert.deepEqual(store.getState()[key], defaults[key], `Reset restores ${key}`);
  }
  await store.persist.rehydrate();
  assert.deepEqual(store.getState().calculation, DEFAULT_CALCULATION, 'Reset calculation survives reload');
  assert.equal(store.getState().azan.notificationsEnabled, false, 'Reset notifications remain disabled after reload');
  assert.deepEqual(store.getState().coords, { lat: null, lon: null }, 'Reset location stays cleared after reload');
  assert.deepEqual(JSON.parse(saved.get('salah-mobile-journal')), { '2026-10-16': ['Fajr'] }, 'Reset preserves prayer history');
  console.log('PASS: reset restores defaults, persists across reloads, and preserves prayer history.');
  console.log('PASS: preference migration/persistence, calculation adjustments, Ramadan and Friday rules, invalid inputs, midnight handling, timezone conversion, reminder offsets, quiet transitions, location preferences, and scheduler remount.');
} finally {
  await rm(output, { force: true });
}
