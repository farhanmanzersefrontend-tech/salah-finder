import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/hooks/useNavigationState.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const reactStub = 'data:text/javascript,' + encodeURIComponent('export const useCallback = f => f; export const useRef = value => ({current:value}); export const useSyncExternalStore = (_, read) => read();');
const moduleCode = compiled.replace('from "react"', `from ${JSON.stringify(reactStub)}`);
const { useNavigationState } = await import(`data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`);
const previous = { salahNavigation: { depth: 4, values: { screen: 'dua', duaTab: 'Daily', duaCollection: false, duaCategory: 'family', duaTopic: 72, duaDetail: 2 } } };
const entries = [previous];
globalThis.window = {
  history: {
    get state() { return entries.at(-1); },
    pushState(state) { entries.push(state); },
    replaceState(state) { entries[entries.length - 1] = state; },
    back() { entries.pop(); },
  },
  dispatchEvent() {},
};
const [, open, back] = useNavigationState('duaCollection', false, ['duaCategory', 'duaTopic', 'duaDetail']);
open(true);
assert.deepEqual(window.history.state.salahNavigation.values, { screen: 'dua', duaTab: 'Daily', duaCollection: true });
assert.equal(entries.length, 2, 'Opening the collection should add just one history entry');
back(false);
assert.deepEqual(window.history.state, previous, 'Back should restore the previous daily view');
open(true);
assert.equal(window.history.state.salahNavigation.values.duaTopic, undefined, 'Reopening must clear the previous topic again');
console.log('Dua navigation checks passed: reset stale routes, preserve parent screen, Back, and reopen.');
