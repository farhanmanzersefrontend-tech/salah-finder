import type { LocationPreferences } from "./prayerPreferences";

function locationFailure(error: Pick<GeolocationPositionError, 'code'>) {
  if (error.code === 1) return new Error('Location permission is blocked. Allow location for this site and enable Precise Location in your phone settings, then try again.');
  if (error.code === 3) return new Error('Finding your location timed out. Turn on Location/GPS, move near a window or outdoors, and try again.');
  return new Error('Your phone could not determine its location. Turn on Location/GPS and try again, or search for your city.');
}

export function requestPrayerPosition(preferences: LocationPreferences, signal?: AbortSignal, maxAccuracyMeters = 1000, onProgress?: (position: GeolocationPosition) => void) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    let best: GeolocationPosition | undefined;
    let watchId: number | undefined;
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      signal?.removeEventListener('abort', cancel);
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true; cleanup();
      if (error) reject(error);
      else if (best) resolve(best);
      else reject(locationFailure({ code: 3 }));
    };
    const cancel = () => finish(new DOMException('Location request cancelled', 'AbortError'));
    const timer = setTimeout(() => {
      if (best && preferences.method === 'gps' && best.coords.accuracy > maxAccuracyMeters) finish(new Error(`Your location is only approximate (accuracy ±${Math.round(best.coords.accuracy)} m). Enable Precise Location for this browser and try again outdoors or near a window.`));
      else finish();
    }, 20000);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) { cancel(); return; }
    const onPosition = (position: GeolocationPosition) => {
      if (settled) return;
      const { latitude, longitude, accuracy } = position.coords;
      if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180 || !Number.isFinite(accuracy) || accuracy < 0) {
        finish(new Error('Your device returned an invalid location. Please try again.')); return;
      }
      if (!best || accuracy < best.coords.accuracy) {
        best = position;
        onProgress?.(position);
      }
      if (preferences.method !== 'gps' || accuracy <= Math.min(100, maxAccuracyMeters)) finish();
    };
    const onError = (error: GeolocationPositionError) => {
      if (error.code === 1 || !best) finish(locationFailure(error));
      // A watch timeout can be followed by a better fix; keep the best until our deadline.
    };
    const options = { enableHighAccuracy: preferences.method === 'gps', timeout: 20000, maximumAge: 0 };
    try {
      if (preferences.method === 'gps' && navigator.geolocation.watchPosition) {
        watchId = navigator.geolocation.watchPosition(onPosition, onError, options);
        if (settled) navigator.geolocation.clearWatch(watchId);
      } else navigator.geolocation.getCurrentPosition(onPosition, onError, options);
    } catch { finish(new Error('Location access could not start. Check your browser permissions and try again.')); }
  });
}

export async function currentPrayerLocation(preferences: LocationPreferences, signal?: AbortSignal, maxAccuracyMeters = 1000, onProgress?: (position: GeolocationPosition) => void) {
  if (window.isSecureContext === false) throw new Error('Location needs a secure connection. Open this app using HTTPS, or search for your city.');
  if (!navigator.geolocation) throw new Error("Location is unavailable. Search for a city or enter coordinates instead.");
  const position = await requestPrayerPosition(preferences, signal, maxAccuracyMeters, onProgress);
  const { latitude: lat, longitude: lon } = position.coords;
  let label = "Current location";
  if (preferences.useInternet) {
    try {
      const params = new URLSearchParams({ lat: String(lat), lon: String(lon), format: "jsonv2", zoom: "10", "accept-language": "en" });
      const controller = new AbortController();
      const cancel = () => controller.abort();
      const timeout = setTimeout(cancel, 3000);
      signal?.addEventListener('abort', cancel, { once: true });
      let response: Response;
      try { response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { signal: controller.signal }); }
      finally { clearTimeout(timeout); signal?.removeEventListener('abort', cancel); }
      if (response.ok) {
        const { address } = await response.json();
        label = [address?.city || address?.town || address?.village || address?.county, address?.country].filter(Boolean).join(", ") || label;
      }
    } catch { /* Coordinates are still usable when the optional name lookup fails. */ }
  }
  signal?.throwIfAborted();
  return { lat, lon, label, accuracy: position.coords.accuracy };
}
