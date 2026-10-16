// No browser required: validate the shared responsive app and saved streak logic.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const directory = path.resolve('node_modules/.tmp/mobile-check');
await mkdir(directory, { recursive: true });
const output = path.join(directory, 'check.cjs');
await build({
  stdin: {
    contents: `export { default as App } from './src/App';
      export { default as Duas } from './src/components/mobile/MobileDuas';
      export { default as Quran } from './src/components/mobile/MobileQuran';
      export { default as Juz } from './src/components/mobile/MobileJuz';
      export { getStreak, dayKey } from './src/components/mobile/useJournal';`,
    resolveDir: process.cwd(), loader: 'tsx',
  },
  bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', outfile: output,
  packages: 'external', loader: { '.css': 'empty', '.png': 'dataurl', '.jpg': 'dataurl', '.mp3': 'dataurl' },
});
try {
  const saved = new Map();
  globalThis.localStorage = {
    getItem: key => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
    removeItem: key => saved.delete(key),
  };
  globalThis.window = {};
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { createElement } = await import('react');
  const imported = await import(pathToFileURL(output));
  const { App, Duas, Quran, Juz, dayKey, getStreak } = imported.default;
  const html = renderToStaticMarkup(createElement(App));
  assert.ok(html.includes('class="mobile-app'), 'All devices use the shared app');
  assert.ok(html.includes('Awqat Al-Salah'));
  assert.ok(html.includes('Choose your location'));
  assert.ok(html.includes('Main navigation'));
  for (const prayer of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) assert.ok(html.includes(`Mark ${prayer} complete`));
  assert.ok(!html.includes('Until Fajr prayer'), 'No fabricated prayer schedule before location is set');
  assert.ok(renderToStaticMarkup(createElement(Duas)).includes('Family &amp; loved ones'));
  assert.ok(renderToStaticMarkup(createElement(Quran)).includes('Loading the surahs'));
  const juzHtml = renderToStaticMarkup(createElement(Juz, { onRead() {} }));
  assert.equal((juzHtml.match(/Explore this part/g) || []).length, 30);
  const all = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const today = new Date(2026, 9, 16, 12);
  assert.equal(dayKey(today), '2026-10-16');
  assert.equal(getStreak({}, today), 0);
  assert.equal(getStreak({ '2026-10-16': all }, today), 1);
  assert.equal(getStreak({ '2026-10-15': all, '2026-10-14': all }, today), 2, 'Unfinished today preserves yesterday’s streak');
  assert.equal(getStreak({ '2026-10-16': all, '2026-10-15': ['Fajr'], '2026-10-14': all }, today), 1, 'Partial day breaks streak');
  assert.equal(getStreak({ '2026-10-14': all }, today), 0, 'Missed yesterday resets streak');
  assert.equal(getStreak({ '2026-01-01': all, '2025-12-31': all }, new Date(2026, 0, 1)), 2, 'Streak crosses year boundary');
  console.log('PASS: shared responsive app render smoke checks, 30 Juz entries, and 7 date/streak assertions.');
  console.log('These are render and logic checks, not browser layout or network integration tests.');
} finally {
  await rm(output, { force: true });
}
