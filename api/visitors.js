const recordVisit = `
  if redis.call('SET', KEYS[2], '1', 'NX', 'EX', 86400) then
    return redis.call('INCR', KEYS[1])
  end
  return tonumber(redis.call('GET', KEYS[1]) or '0')
`;

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export default {
  async fetch(request) {
    if (!['GET', 'POST'].includes(request.method)) {
      return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST' });
    }
    const origin = request.headers.get('origin');
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
      return json({ error: 'Origin not allowed' }, 403);
    }

    let visitId;
    if (request.method === 'POST') {
      if (!request.headers.get('content-type')?.startsWith('application/json')) {
        return json({ error: 'Expected JSON' }, 415);
      }
      try {
        const body = await request.text();
        if (body.length > 200) return json({ error: 'Request too large' }, 413);
        visitId = JSON.parse(body)?.visitId;
      } catch {
        return json({ error: 'Invalid request' }, 400);
      }
      if (typeof visitId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(visitId)) {
        return json({ error: 'Invalid visit ID' }, 400);
      }
    }

    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    if (!url || !token) return json({ error: 'Visitor count is unavailable' }, 503);

    // Keep preview/development traffic separate from the production total.
    const namespace = process.env.VISITOR_COUNTER_KEY || `awqat-visitors:${process.env.VERCEL_ENV || 'development'}`;
    const key = `{${namespace}}:total`;
    const command = visitId
      ? ['EVAL', recordVisit, '2', key, `{${namespace}}:visit:${visitId}`]
      : ['GET', key];
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('Counter storage unavailable');
      const data = await response.json();
      const count = data.result === null && !visitId ? 0 : Number(data.result);
      if (data.error || data.result === undefined || (visitId && data.result === null) || !Number.isSafeInteger(count) || count < 0) {
        throw new Error('Invalid counter response');
      }
      return json({ count });
    } catch {
      return json({ error: 'Visitor count is unavailable' }, 503);
    }
  },
};
