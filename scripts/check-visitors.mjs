import assert from 'node:assert/strict';
import { build } from 'esbuild';
import handler from '../api/visitors.js';

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
const originalNow = Date.now;
const envNames = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'VERCEL_ENV', 'VISITOR_COUNTER_KEY'];
const originalEnv = Object.fromEntries(envNames.map(key => [key, process.env[key]]));
const visitId = 'a1b2c3d4-1234-4567-8123-123456789abc';
const request = (method = 'POST', body = { visitId }, headers = {}) => new Request('https://salah.example/api/visitors', {
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
});

try {
  for (const key of envNames) delete process.env[key];
  assert.equal((await handler.fetch(request())).status, 503, 'Missing database does not fabricate a count');
  assert.equal((await handler.fetch(request('DELETE'))).status, 405);
  assert.equal((await handler.fetch(request('POST', {}, { origin: 'https://other.example' }))).status, 403);
  assert.equal((await handler.fetch(request('POST', { visitId: 'bad' }))).status, 400);
  assert.equal((await handler.fetch(request('POST', null))).status, 400);
  assert.equal((await handler.fetch(request('POST', { visitId }, { 'Content-Type': 'text/plain' }))).status, 415);
  assert.equal((await handler.fetch(request('POST', { visitId: 'x'.repeat(300) }))).status, 413);

  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-only';
  process.env.VERCEL_ENV = 'production';
  let command;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://redis.example');
    assert.equal(options.headers.Authorization, 'Bearer test-only');
    command = JSON.parse(options.body);
    return Response.json({ result: 42 });
  };
  const response = await handler.fetch(request());
  assert.deepEqual(await response.json(), { count: 42 });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(command[0], 'EVAL', 'Registration uses one atomic database operation');
  assert.equal(command[2], '2');
  assert.equal(command[3], '{awqat-visitors:production}:total');
  assert.equal(command[4], `{awqat-visitors:production}:visit:${visitId}`);
  await handler.fetch(request('GET'));
  assert.deepEqual(command, ['GET', '{awqat-visitors:production}:total'], 'Reading never increments');
  process.env.VERCEL_ENV = 'preview';
  await handler.fetch(request('GET'));
  assert.equal(command[1], '{awqat-visitors:preview}:total');
  for (const result of [-1, 'bad', null, undefined]) {
    globalThis.fetch = async () => Response.json({ result });
    assert.equal((await handler.fetch(request())).status, 503);
  }
  globalThis.fetch = async () => Response.json({ result: null });
  assert.deepEqual(await (await handler.fetch(request('GET'))).json(), { count: 0 });
  globalThis.fetch = async () => { throw new Error('Offline'); };
  assert.equal((await handler.fetch(request())).status, 503);

  const bundle = await build({ entryPoints: ['src/utils/visitorCount.ts'], bundle: true, write: false, format: 'esm' });
  let moduleNumber = 0;
  const loadClient = () => import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}#${moduleNumber++}`);
  const storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  let now = 1_800_000_000_000;
  Date.now = () => now;
  const ids = new Set();
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/visitors');
    const body = JSON.parse(options.body);
    ids.add(body.visitId);
    calls++;
    return Response.json({ count: ids.size });
  };
  const client = await loadClient();
  assert.deepEqual(await Promise.all([client.registerVisit(), client.registerVisit()]), [1, 1]);
  assert.equal(calls, 1, 'StrictMode shares the in-flight request');
  assert.equal(await (await loadClient()).registerVisit(), 1, 'Reload reuses saved visit');
  now += 30 * 60 * 1000 + 1;
  assert.equal(await (await loadClient()).registerVisit(), 2, 'Return after 30 minutes starts a visit');
  const retryClient = await loadClient();
  globalThis.fetch = async () => new Response('Unavailable', { status: 503 });
  await assert.rejects(retryClient.registerVisit());
  globalThis.fetch = async () => Response.json({ count: 2 });
  assert.equal(await retryClient.registerVisit(), 2, 'Failure allows retry');
  globalThis.localStorage = { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); } };
  assert.equal(await (await loadClient()).registerVisit(), 2, 'Blocked storage does not crash the app');
  console.log('PASS: visitor API validation, error handling, namespaces, request deduplication, session reuse/expiry, retry, and blocked storage.');
  console.log('Redis responses are mocked; live persistence requires a connected database.');
} finally {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
  Date.now = originalNow;
  for (const key of envNames) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
}
