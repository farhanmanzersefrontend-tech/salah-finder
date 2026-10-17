import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/utils/duaApi.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { loadDuaData, loadBilingualTopics, loadBilingualDua } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const cache = new Map();
globalThis.sessionStorage = { getItem: key => cache.get(key), setItem: (key, value) => cache.set(key, value) };
let requests = 0;
const topic = [{ id: 1, title: 'Morning', category: 'morning-and-evening', 'dua-ids': [100] }];
globalThis.fetch = async () => { requests++; return { ok: true, json: async () => topic }; };
const signal = new AbortController().signal;
assert.deepEqual(await loadDuaData('sub-categories/en.json', signal), topic);
assert.deepEqual(await loadDuaData('sub-categories/en.json', signal), topic);
assert.equal(requests, 1, 'A cached response should avoid another network request');
globalThis.fetch = async () => ({ ok: true, json: async () => ({ title: 'Incomplete dua' }) });
await assert.rejects(loadDuaData('translation/en/dua_1.json', signal), /unavailable/);
globalThis.fetch = async () => ({ ok: false });
await assert.rejects(loadDuaData('translation/en/dua_2.json', signal), /could not be loaded/);
globalThis.sessionStorage = { getItem() { throw Error('Storage disabled'); }, setItem() { throw Error('Storage disabled'); } };
const dua = { dua_id: 100, title: 'Morning', arabic: 'اللهم', translation: 'O Allah' };
globalThis.fetch = async () => ({ ok: true, json: async () => dua });
assert.deepEqual(await loadDuaData('translation/en/dua_100.json', signal), dua);
console.log('Dua API checks passed: response validation, caching, HTTP failures, and disabled storage.');

globalThis.fetch = async url => ({ ok: true, json: async () => url.includes('sub-categories')
  ? [{ id: 1, title: url.includes('/ur.') ? '???? ???? ?? ?? ????? ??' : 'The servant is dependent on his Lord', category: 'duas-importance', 'dua-ids': [100] }]
  : { ...dua, translation: url.includes('/ur/') ? '\u0627\u06d2 \u0627\u0644\u0644\u06c1' : dua.translation, title: url.includes('/ur/') ? '??? ? ??? ?? ???' : 'Morning dua' } });
const bilingualTopics = await loadBilingualTopics(signal);
assert.equal(bilingualTopics[0].urduTitle, '???? ???? ?? ?? ????? ??');
assert.equal(bilingualTopics[0].title, 'The servant is dependent on his Lord');
const bilingualDua = await loadBilingualDua(100, signal);
assert.equal(bilingualDua.urduTitle, '??? ? ??? ?? ???');
assert.equal(bilingualDua.title, 'Morning dua');
assert.equal(bilingualDua.translation, dua.translation);
console.log('Urdu checks passed: topic matching by ID and bilingual dua titles.');

assert.equal(bilingualDua.urduTranslation, '\u0627\u06d2 \u0627\u0644\u0644\u06c1');
