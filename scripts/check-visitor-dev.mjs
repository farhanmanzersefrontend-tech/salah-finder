import assert from 'node:assert/strict';
import { createServer } from 'vite';

const originalFetch = globalThis.fetch;
const oldUrl = process.env.UPSTASH_REDIS_REST_URL;
const oldToken = process.env.UPSTASH_REDIS_REST_TOKEN;
process.env.UPSTASH_REDIS_REST_URL = 'https://counter-storage.example';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-only';
let server;
try {
  globalThis.fetch = async (url, options) => {
    if (String(url) === 'https://counter-storage.example') {
      assert.equal(options.headers.Authorization, 'Bearer test-only');
      return Response.json({ result: 42 });
    }
    return originalFetch(url, options);
  };
  server = await createServer({ logLevel: 'silent', server: { host: '127.0.0.1', port: 0 }, optimizeDeps: { noDiscovery: true, entries: [] } });
  await server.listen();
  const address = server.httpServer.address();
  const base = `http://127.0.0.1:${address.port}`;
  const response = await originalFetch(`${base}/api/visitors`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin: base },
    body: JSON.stringify({ visitId: 'a1b2c3d4-1234-4567-8123-123456789abc' }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { count: 42 });
  assert.equal((await originalFetch(`${base}/api/visitors`, { method: 'DELETE' })).status, 405);
  const rejected = await originalFetch(`${base}/api/visitors`, { method: 'POST', headers: { origin: 'https://other.example' } });
  assert.equal(rejected.status, 403);
  const oversized = await originalFetch(`${base}/api/visitors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitId: 'x'.repeat(300) }) });
  assert.equal(oversized.status, 413);
  console.log('Local visitor API checks passed: Vite routing, JSON responses, methods, and origin validation. Storage is mocked.');
} finally {
  await server?.close();
  globalThis.fetch = originalFetch;
  if (oldUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = oldUrl;
  if (oldToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = oldToken;
}
