/**
 * Calculates Qibla bearing and distance between two coordinates.
 *
 * We use the great-circle formulas. The bearing calculation uses the
 * forward azimuth formula on a sphere:
 *
 *   θ = atan2( sin(Δλ) * cos φ2,
 *               cos φ1 * sin φ2 − sin φ1 * cos φ2 * cos(Δλ) )
 *
 * where φ1, φ2 are latitudes and Δλ is difference in longitudes. The
 * result is converted to degrees and normalized to 0..360 (0 = North).
 *
 * Distance uses the haversine formula to compute great-circle distance:
 *
 *   a = sin²(Δφ/2) + cos φ1 cos φ2 sin²(Δλ/2)
 *   c = 2 atan2(√a, √(1−a))
 *   d = R * c
 */

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export type Coords = { lat: number; lon: number };

export const KAABA: Coords = { lat: 21.4224779, lon: 39.8251832 };

export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  const bearing = (toDeg(theta) + 360) % 360; // normalize to 0..360
  return bearing;
}

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const clamped = Math.max(0, Math.min(1, a));
  const c = 2 * Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped));
  return R * c;
}

export default function useQiblaDirection() {
  const compute = (coords: Coords | null) => {
    if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lon) || Math.abs(coords.lat) > 90 || Math.abs(coords.lon) > 180) return { bearing: null as number | null, distanceKm: null as number | null };
    const bearing = calculateBearing(coords.lat, coords.lon, KAABA.lat, KAABA.lon);
    const distanceKm = haversineDistanceKm(coords.lat, coords.lon, KAABA.lat, KAABA.lon);
    return { bearing: distanceKm < 0.01 ? null : bearing, distanceKm };
  };

  return { compute, calculateBearing, haversineDistanceKm, KAABA } as const;
}
