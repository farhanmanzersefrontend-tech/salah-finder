export type TravelMode = 'car' | 'bike';
export type RoutePoint = { lat: number; lon: number };
export type MosqueRoute = { distance: number; duration: number; coordinates: [number, number][]; legs: number[] };

export async function fetchMosqueRoute(points: RoutePoint[], mode: TravelMode, signal: AbortSignal): Promise<MosqueRoute> {
  if (points.length < 2 || points.some(point => !Number.isFinite(point.lat) || !Number.isFinite(point.lon))) throw new Error('Choose a start and destination.');
  const coordinates = points.map(point => `${point.lon},${point.lat}`).join(';');
  const response = await fetch(`https://routing.openstreetmap.de/routed-${mode}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
  if (!response.ok) throw new Error('Route service is unavailable. You can still start directions in Google Maps.');
  const data = await response.json();
  const route = data.routes?.[0];
  if (data.code !== 'Ok' || !route?.geometry?.coordinates?.length || !Number.isFinite(route.duration) || !Number.isFinite(route.distance)) throw new Error('No route found. Try another travel mode or open Google Maps.');
  return { distance: route.distance, duration: route.duration, coordinates: route.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]), legs: route.legs.map((leg: { duration: number }) => leg.duration) };
}

export function routeLink(origin: RoutePoint, destination: RoutePoint, mode: TravelMode, stops: RoutePoint[] = []) {
  const params = new URLSearchParams({ api: '1', origin: `${origin.lat},${origin.lon}`, destination: `${destination.lat},${destination.lon}`, travelmode: mode === 'bike' ? 'bicycling' : 'driving' });
  if (stops.length) params.set('waypoints', stops.map(stop => `${stop.lat},${stop.lon}`).join('|'));
  return `https://www.google.com/maps/dir/?${params}`;
}

export function durationLabel(minutes: number) {
  const rounded = Math.max(1, Math.ceil(minutes));
  return rounded >= 60 ? `${Math.floor(rounded / 60)} hr ${rounded % 60} mins` : `${rounded} min${rounded === 1 ? '' : 's'}`;
}
