import { useCallback, useEffect, useRef, useState } from "react";

export type Coords = { lat: number; lon: number } | null;

export default function useLocation(initialCoords: Coords = null) {
  const [coords, setCoords] = useState<Coords>(initialCoords);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const requestId = useRef(0);
  useEffect(() => () => { requestId.current++; }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser.");
      return;
    }
    setDetecting(true);
    setError(null);
    const id = ++requestId.current;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (id !== requestId.current) return;
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setAccuracy(pos.coords.accuracy);
        setDetecting(false);
      },
      (err) => {
        if (id !== requestId.current) return;
        setError(err?.message ?? "Unable to retrieve location.");
        setDetecting(false);
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 }
    );
  }, []);

  const setManualCoords = useCallback((lat: number, lon: number) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      setError('Enter a latitude from -90 to 90 and longitude from -180 to 180.'); return;
    }
    setCoords({ lat, lon });
    requestId.current++;
    setDetecting(false);
    setAccuracy(null);
    setError(null);
  }, []);

  return { coords, accuracy, error, detecting, requestLocation, setManualCoords } as const;
}
