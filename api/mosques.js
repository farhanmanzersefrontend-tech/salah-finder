export default {
  async fetch(request) {
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const origin = request.headers.get('origin');
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    let lat, lon;
    try {
      const text = await request.text();
      if (text.length > 200) throw new Error();
      ({ lat, lon } = JSON.parse(text));
      if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error();
    } catch { return Response.json({ error: 'Invalid coordinates' }, { status: 400 }); }
    const query = `[out:json][timeout:8];(nwr["amenity"="place_of_worship"]["religion"="muslim"](around:1000,${lat},${lon});nwr["building"="mosque"](around:1000,${lat},${lon});nwr["amenity"="place_of_worship"]["name"~"masjid|mosque|مسجد",i](around:1000,${lat},${lon}););out center tags;`;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, request.signal]);
    const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
    try {
      // Race independent mirrors, cancelling the remaining requests after a valid response.
      const elements = await Promise.any(endpoints.map(async endpoint => {
        const response = await fetch(endpoint, { method: 'POST',
          headers: { 'User-Agent': `SalahFinder/1.0 (+${new URL(request.url).origin})`, Accept: 'application/json' },
          body: new URLSearchParams({ data: query }), signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]) });
        if (!response.ok) throw new Error('Upstream unavailable');
        const data = await response.json();
        if (data.remark || !Array.isArray(data.elements)) throw new Error('Incomplete response');
        return data.elements;
      }));
      return Response.json({ elements }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return Response.json({ error: 'Mosque listings are temporarily unavailable. Please retry or open Google Maps.' }, { status: 503 });
    } finally { controller.abort(); }
  },
};
