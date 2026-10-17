import { test } from 'node:test';
import assert from 'node:assert/strict';
import api from '../api/mosques.js';

const request = body => new Request('https://example.com/api/mosques', { method: 'POST', body: JSON.stringify(body) });
test('mosque endpoint validates coordinates before requesting external data', async () => {
  const response = await api.fetch(request({ lat: 200, lon: 78 }));
  assert.equal(response.status, 400);
});
test('mosque endpoint rejects cross-site requests', async () => {
  const response = await api.fetch(new Request('https://example.com/api/mosques', { method: 'POST', headers: { origin: 'https://other.example' }, body: '{}' }));
  assert.equal(response.status, 403);
});
test('a failing mirror does not hide a successful mosque result', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.match(options.headers['User-Agent'], /SalahFinder/);
    assert.match(options.body.get('data'), /around:1000,17,78/);
    if (!url.includes('mail.ru')) return Response.json({ error: 'busy' }, { status: 500 });
    return Response.json({ elements: [{ type: 'node', id: 1, lat: 17, lon: 78, tags: { name: 'Nearby masjid' } }] });
  };
  try {
    const response = await api.fetch(request({ lat: 17, lon: 78 }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).elements[0].tags.name, 'Nearby masjid');
    assert.equal(calls, 3);
  } finally { globalThis.fetch = original; }
});
test('all failed mirrors return an explicit failure rather than an empty mosque list', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ remark: 'timed out' });
  try {
    const response = await api.fetch(request({ lat: 17, lon: 78 }));
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /temporarily unavailable/);
  } finally { globalThis.fetch = original; }
});
