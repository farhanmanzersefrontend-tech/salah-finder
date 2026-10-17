import { distanceMeters } from './nearbyMosques';
import type { Mosque } from './nearbyMosques';

let loading: Promise<void> | null = null;
declare global {
  interface Window { salahGoogleMapsReady?: () => void }
}

export function loadGoogleMaps(key: string): Promise<void> {
  if (typeof google !== 'undefined' && typeof google.maps?.importLibrary === 'function') return Promise.resolve();
  if (!key) return Promise.reject(new Error('Google Maps is not configured.'));
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => fail(), 20000);
    const cleanup = () => { window.clearTimeout(timer); delete window.salahGoogleMapsReady; };
    const fail = () => {
      cleanup(); script.remove(); loading = null;
      reject(new Error('Google Maps could not load. Showing the alternative map.'));
    };
    window.salahGoogleMapsReady = () => { cleanup(); resolve(); };
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key, v: 'weekly', loading: 'async', callback: 'salahGoogleMapsReady' })}`;
    script.async = true; script.onerror = fail;
    document.head.append(script);
  });
  return loading;
}

export function googleMosqueRequest(lat: number, lon: number): google.maps.places.SearchNearbyRequest {
  return { fields: ['id', 'displayName', 'location', 'formattedAddress', 'googleMapsURI'],
    locationRestriction: { center: { lat, lng: lon }, radius: 1000 },
    includedTypes: ['mosque'], maxResultCount: 20,
    rankPreference: google.maps.places.SearchNearbyRankPreference.DISTANCE };
}

export async function googleNearbyMosques(key: string, lat: number, lon: number, signal: AbortSignal): Promise<Mosque[]> {
  signal.throwIfAborted();
  await loadGoogleMaps(key);
  const { Place } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
  signal.throwIfAborted();
  const { places } = await Place.searchNearby(googleMosqueRequest(lat, lon));
  signal.throwIfAborted();
  return places.flatMap(place => {
    if (!place.location) return [];
    const pointLat = place.location.lat(); const pointLon = place.location.lng();
    const distance = distanceMeters(lat, lon, pointLat, pointLon);
    if (!Number.isFinite(distance) || distance > 1000) return [];
    return [{ id: place.id, name: place.displayName || 'Mosque', lat: pointLat, lon: pointLon,
      distance, address: place.formattedAddress || '', mapsUrl: place.googleMapsURI || undefined }];
  }).sort((a, b) => a.distance - b.distance);
}
