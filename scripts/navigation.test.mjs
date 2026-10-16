import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function setup() {
  const target = new EventTarget();
  const entries = [null];
  let position = 0;
  const history = {
    get state() { return entries[position]; },
    replaceState(state) { entries[position] = state; },
    pushState(state) { entries.splice(++position); entries.push(state); },
    back() { if (position) { position--; target.dispatchEvent(new Event('popstate')); } },
    forward() { if (position < entries.length - 1) { position++; target.dispatchEvent(new Event('popstate')); } },
  };
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL('../src/hooks/useNavigationState.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, {
    exports, Event,
    window: { history, addEventListener: target.addEventListener.bind(target), removeEventListener: target.removeEventListener.bind(target), dispatchEvent: target.dispatchEvent.bind(target) },
    require: () => ({ useRef: value => ({ current: value }), useCallback: value => value, useSyncExternalStore: (_, snapshot) => snapshot() }),
  });
  return { use: exports.useNavigationState, history, entries };
}

test('device Back retraces visited pages; Forward restores them', () => {
  const { use, history } = setup();
  use('screen', 'home', true)[1]('profile');
  use('screen', 'home', true)[1]('alarm');
  history.back(); assert.equal(use('screen', 'home', true)[0], 'profile');
  history.back(); assert.equal(use('screen', 'home', true)[0], 'home');
  history.forward(); assert.equal(use('screen', 'home', true)[0], 'profile');
});

test('header Back consumes history instead of adding another page', () => {
  const { use, entries } = setup();
  use('screen', 'home', true)[1]('profile');
  use('screen', 'home', true)[1]('alarm');
  use('screen', 'home', true)[2]('home');
  assert.equal(use('screen', 'home', true)[0], 'profile');
  assert.equal(entries.length, 3);
});

test('nested settings close one level at a time before leaving settings', () => {
  const { use, history } = setup();
  const initial = { page: null, trail: [] };
  use('screen', 'home', true)[1]('settings');
  use('settings', initial)[1]({ page: 'prayer', trail: [] });
  use('settings', initial)[1](value => ({ ...value, trail: ['manual'] }));
  history.back(); assert.equal(use('settings', initial)[0].page, 'prayer');
  assert.equal(use('settings', initial)[0].trail.length, 0);
  history.back(); assert.equal(use('settings', initial)[0].page, null);
  history.back(); assert.equal(use('screen', 'home', true)[0], 'home');
});

test('new page clears child routes; Back restores the previous child route', () => {
  const { use, history } = setup();
  use('screen', 'home', true)[1]('dua');
  use('detail', null)[1](3);
  use('screen', 'home', true)[1]('quran');
  assert.equal(use('detail', null)[0], null);
  history.back(); assert.equal(use('detail', null)[0], 3);
});

test('same-page taps add no history and root Back creates no exit trap', () => {
  const { use, entries, history } = setup();
  use('screen', 'home', true)[1]('home');
  assert.equal(entries.length, 1);
  use('screen', 'home', true)[1]('alarm');
  history.back();
  assert.equal(history.state.salahNavigation.depth, 0);
  use('screen', 'home', true)[2]('home');
  assert.equal(entries.length, 2);
});

test('location dialog closes before returning to the previous page', () => {
  const { use, history } = setup();
  use('screen', 'home', true)[1]('profile');
  use('locationDialog', false)[1](true);
  history.back();
  assert.equal(use('locationDialog', false)[0], false);
  assert.equal(use('screen', 'home', true)[0], 'profile');
});
