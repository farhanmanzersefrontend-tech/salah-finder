import type { LocationPreferences } from "./prayerPreferences";

export async function currentPrayerLocation(preferences: LocationPreferences) {
  if (!navigator.geolocation) throw new Error("Location is unavailable. Search for a city or enter coordinates instead.");
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error("Location access was unavailable. Search for your city or enter coordinates instead.")), {
      enableHighAccuracy: preferences.method === "gps", timeout: 15000, maximumAge: 0,
    });
  });
  const { latitude: lat, longitude: lon } = position.coords;
  let label = "Current location";
  if (preferences.useInternet) {
    try {
      const params = new URLSearchParams({ lat: String(lat), lon: String(lon), format: "jsonv2", zoom: "10", "accept-language": "en" });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        const { address } = await response.json();
        label = [address?.city || address?.town || address?.village || address?.county, address?.country].filter(Boolean).join(", ") || label;
      }
    } catch { /* Coordinates are still usable when the optional name lookup fails. */ }
  }
  return { lat, lon, label };
}
