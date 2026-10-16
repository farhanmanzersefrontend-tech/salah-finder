import { useCallback, useEffect, useRef, useState } from 'react';

type CompassEvent = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
type OrientationPermission = typeof DeviceOrientationEvent & { requestPermission?: (absolute?: boolean) => Promise<string> };
const normalize = (angle: number) => ((angle % 360) + 360) % 360;

export function compassHeading(event: CompassEvent, screenAngle = 0): number | null {
  if (event.beta == null || event.gamma == null || Math.abs(event.beta) > 35 || Math.abs(event.gamma) > 35) return null;
  if (typeof event.webkitCompassHeading === 'number' && Number.isFinite(event.webkitCompassHeading)) {
    if (typeof event.webkitCompassAccuracy === 'number' && (event.webkitCompassAccuracy < 0 || event.webkitCompassAccuracy > 20)) return null;
    return normalize(event.webkitCompassHeading + screenAngle);
  }
  if (event.absolute === true && typeof event.alpha === 'number' && Number.isFinite(event.alpha)) return normalize(360 - event.alpha + screenAngle);
  return null;
}

export default function useCompass() {
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const removeListeners = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  const stop = useCallback(() => {
    generation.current++;
    removeListeners.current?.(); removeListeners.current = null;
    setEnabled(false); setDeviceHeading(null);
  }, []);
  const start = useCallback(async () => {
    stop(); setError(null);
    const version = generation.current;
    if (!window.isSecureContext) { setError('The compass needs HTTPS. Open the secure version of this app.'); return; }
    const orientation = window.DeviceOrientationEvent as OrientationPermission | undefined;
    if (!orientation) { setError('This device has no supported compass. Use the bearing from north below.'); return; }
    if (orientation.requestPermission) {
      try {
        const result = await orientation.requestPermission(true);
        if (version !== generation.current) return;
        if (result !== 'granted') { setError('Motion permission was denied. Allow it in your browser settings and try again.'); return; }
      } catch { setError('Could not enable the compass. Check motion permissions and try again.'); return; }
    }
    if (version !== generation.current) return;
    setEnabled(true);
    let lastReading = Date.now();
    let received = false;
    const onEvent = (event: DeviceOrientationEvent) => {
      const heading = compassHeading(event as CompassEvent, window.screen.orientation?.angle ?? 0);
      if (heading === null) {
        if (!event.absolute && !('webkitCompassHeading' in event)) return;
        setDeviceHeading(null); setError('Hold your phone flat and move it in a figure eight to calibrate.'); return;
      }
      lastReading = Date.now(); received = true;
      setDeviceHeading(heading); setError(null);
    };
    window.addEventListener('deviceorientationabsolute', onEvent as EventListener);
    window.addEventListener('deviceorientation', onEvent);
    const timer = window.setInterval(() => {
      if (Date.now() - lastReading > (received ? 4000 : 8000)) {
        setDeviceHeading(null);
        setError('No reliable compass reading. Hold the phone flat, calibrate, or use the bearing from north.');
      }
    }, 1000);
    removeListeners.current = () => {
      window.removeEventListener('deviceorientationabsolute', onEvent as EventListener);
      window.removeEventListener('deviceorientation', onEvent);
      window.clearInterval(timer);
    };
  }, [stop]);
  useEffect(() => () => { generation.current++; removeListeners.current?.(); }, []);
  return { deviceHeading, error, enabled, start, stop } as const;
}
