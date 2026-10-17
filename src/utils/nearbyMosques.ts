export type Mosque = { id: string; name: string; lat: number; lon: number; distance: number; address: string; hours?: string; mapsUrl?: string };
type Element = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

export function distanceMeters(lat: number, lon: number, otherLat: number, otherLon: number) {
  const radians = (value: number) => value * Math.PI / 180;
  const a = Math.sin(radians(otherLat - lat) / 2) ** 2 + Math.cos(radians(lat)) * Math.cos(radians(otherLat)) * Math.sin(radians(otherLon - lon) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parseMosques(elements: Element[], lat: number, lon: number): Mosque[] {
  const results: Mosque[] = [];
  for (const element of elements) {
    const point = element.center || element;
    if (typeof point.lat !== 'number' || typeof point.lon !== 'number') continue;
    const distance = distanceMeters(lat, lon, point.lat, point.lon);
    if (!Number.isFinite(distance) || distance > 1000) continue;
    const tags = element.tags || {};
    const name = tags['name:en'] || tags.name || 'Local mosque';
    if (results.some(item => item.name === name && distanceMeters(item.lat, item.lon, point.lat!, point.lon!) < 50)) continue;
    results.push({ id: `${element.type}/${element.id}`, name, lat: point.lat, lon: point.lon, distance,
      address: tags['addr:full'] || [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(', '), hours: tags.opening_hours });
  }
  return results.sort((a, b) => a.distance - b.distance);
}

export function mosqueSearchQuery(lat: number, lon: number) {
  return `[out:json][timeout:20];(nwr["amenity"="place_of_worship"]["religion"="muslim"](around:1000,${lat},${lon});nwr["building"="mosque"](around:1000,${lat},${lon});nwr["amenity"="place_of_worship"]["name"~"masjid|mosque|مسجد",i](around:1000,${lat},${lon}););out center tags;`;
}

export async function nearbyMosques(lat: number, lon: number, signal: AbortSignal) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('Choose a valid location first.');
  try {
    const response = await fetch('/api/mosques', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat, lon }), signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.elements)) return parseMosques(data.elements, lat, lon);
    }
  } catch { signal.throwIfAborted(); }
  const query = mosqueSearchQuery(lat, lon);
  // A busy public server should not leave the radius map without results.
  for (const endpoint of ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter']) {
    signal.throwIfAborted();
    try {
      const response = await fetch(endpoint, {
        method: 'POST', body: new URLSearchParams({ data: query }), signal: AbortSignal.any([signal, AbortSignal.timeout(25000)]),
      });
      if (!response.ok) continue;
      const data = await response.json();
      if (data.remark || !Array.isArray(data.elements)) continue;
      return parseMosques(data.elements, lat, lon);
    } catch {
      signal.throwIfAborted();
    }
  }
  throw new Error('Nearby mosques could not load. Check your connection and tap Try again.');
}
