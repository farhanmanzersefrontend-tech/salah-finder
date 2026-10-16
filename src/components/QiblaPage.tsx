import { useEffect, useState } from 'react';
import { ArrowUp, Check, Compass, Crosshair, MapPin, NavigationArrow } from 'phosphor-react';
import useLocation from '../hooks/useLocation';
import useQiblaDirection from '../hooks/useQiblaDirection';
import useCompass from '../hooks/useCompass';
import { usePrayerStore } from '../store/usePrayerStore';
import './qibla.css';

function Kaaba() {
  return <svg viewBox="0 0 80 90" className="qibla-kaaba" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
    <path d="m40 7 29 16v43L40 83 11 66V23Z" fill="currentColor" fillOpacity=".08" />
    <path d="m11 23 29 17 29-17M40 40v43M11 33l29 17 29-17M11 41l29 17 29-17M11 57l29 17 29-17M20 62v9m10-3v9m20-9v9m10-15v9" />
    <path d="m48 58 9-5v16l-9 5Z" fill="currentColor" fillOpacity=".25" />
  </svg>;
}

export default function QiblaPage() {
  const saved = usePrayerStore(state => state.coords);
  const initial = saved.lat !== null && saved.lon !== null ? { lat: saved.lat, lon: saved.lon } : null;
  const { coords, accuracy, error: locationError, detecting, requestLocation, setManualCoords } = useLocation(initial);
  const { compute } = useQiblaDirection();
  const { deviceHeading, enabled, error: compassError, start, stop } = useCompass();
  const local = compute(coords);
  const [verified, setVerified] = useState<{ lat: number; lon: number; bearing: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [manualError, setManualError] = useState('');
  const [mode, setMode] = useState<'live' | 'north'>('live');
  const lat = coords?.lat;
  const lon = coords?.lon;

  useEffect(() => {
    if (lat === undefined || lon === undefined) return;
    const controller = new AbortController();
    let active = true;
    setChecking(true); setApiError(false);
    fetch(`https://api.aladhan.com/v1/qibla/${lat}/${lon}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(async response => {
        if (!response.ok) throw new Error('Qibla lookup failed');
        const data = await response.json();
        const bearing: unknown = data?.data?.direction;
        if (data?.code !== 200 || typeof bearing !== 'number' || !Number.isFinite(bearing) || bearing < 0 || bearing >= 360) throw new Error('Invalid Qibla direction');
        if (active) setVerified({ lat, lon, bearing });
      })
      .catch(() => { if (active) setApiError(true); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; controller.abort(); };
  }, [lat, lon]);

  const nearKaaba = local.distanceKm !== null && local.distanceKm < 0.01;
  const bearing = nearKaaba ? null : verified && verified.lat === lat && verified.lon === lon ? verified.bearing : local.bearing;
  const liveHeading = mode === 'live' ? deviceHeading : null;
  const relative = bearing !== null && liveHeading !== null ? ((bearing - liveHeading + 540) % 360) - 180 : null;
  const aligned = relative !== null && Math.abs(relative) <= 5;
  const rotation = mode === 'north' ? bearing ?? 0 : relative ?? 0;
  const status = nearKaaba ? 'You are near the Kaaba' : !coords ? 'Find your Qibla' : aligned ? 'You’re facing Makkah' : relative !== null ? `Turn ${relative > 0 ? 'right' : 'left'} ${Math.round(Math.abs(relative))}°` : mode === 'north' ? 'Direction from north' : 'Enable your compass';

  return <section className={`qibla-experience${aligned ? ' is-aligned' : ''}`} aria-label="Qibla finder">
    <div className="qibla-pattern" aria-hidden="true" />
    <p className="qibla-eyebrow">A direction. A connection.</p>
    <div className="qibla-mode" aria-label="Compass view">
      <button type="button" aria-pressed={mode === 'live'} onClick={() => setMode('live')}><Compass size={17} /> Live compass</button>
      <button type="button" aria-pressed={mode === 'north'} onClick={() => { setMode('north'); stop(); }}><NavigationArrow size={17} /> North-up view</button>
    </div>
    <div className={`qibla-dial${bearing === null || (mode === 'live' && relative === null) ? ' awaiting-heading' : ''}`} role="img" aria-label={bearing === null ? 'Set your location for a Qibla bearing' : `Qibla ${bearing.toFixed(1)} degrees clockwise from north${relative !== null ? `, turn ${Math.abs(relative).toFixed(0)} degrees ${relative >= 0 ? 'right' : 'left'}` : ''}`}>
      <span className="qibla-forward" aria-hidden="true"><ArrowUp size={23} weight="bold" /></span>
      <div className="qibla-dial-middle" />
      <div className="qibla-dial-inner" />
      <div className="qibla-cardinals" style={{ transform: `rotate(${-(liveHeading ?? 0)}deg)` }} aria-hidden="true"><span>N</span><span>E</span><span>S</span><span>W</span></div>
      {bearing !== null && (mode === 'north' || relative !== null) && <div className="qibla-needle" style={{ transform: `rotate(${rotation}deg)` }} aria-hidden="true"><NavigationArrow size={29} weight="fill" /></div>}
      <div className="qibla-center"><Kaaba /><span>MAKKAH</span></div>
    </div>
    <div className="qibla-status" role="status" aria-live="polite">
      <h2>{aligned && <Check size={20} aria-hidden="true" />}{status}</h2>
      <p>{aligned ? 'Approximate alignment · keep your phone flat' : relative !== null ? 'Turn slowly until the arrow points straight ahead.' : mode === 'north' ? 'Align N with north using a trusted compass.' : 'Hold your phone flat, with the top pointing ahead.'}</p>
    </div>
    <div className="qibla-readings">
      <div><span>Qibla bearing</span><strong>{bearing !== null ? `${bearing.toFixed(1)}°` : '—'}</strong><small>Clockwise from north</small></div>
      <div><span>Distance to Makkah</span><strong>{local.distanceKm !== null ? `${Math.round(local.distanceKm).toLocaleString()} km` : '—'}</strong><small>Great-circle distance</small></div>
    </div>
    <div className="qibla-actions">
      <button type="button" className="primary-button" disabled={detecting} onClick={requestLocation}><Crosshair size={18} />{detecting ? 'Finding your location…' : 'Use my current location'}</button>
      {mode === 'live' && <button type="button" className="outline-button" onClick={() => void start()}><Compass size={18} />{enabled ? 'Recalibrate compass' : 'Enable live compass'}</button>}
    </div>
    {coords && <p className="qibla-location"><MapPin size={13} />{coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}{accuracy !== null ? ` · GPS accuracy ±${Math.round(accuracy)} m` : ' · Selected location'}</p>}
    {(locationError || compassError) && <p className="inline-error" role="alert">{locationError || compassError}</p>}
    {checking && <p className="qibla-help" role="status">Checking your Qibla direction…</p>}
    {apiError && <p className="qibla-help" role="status">Online check unavailable. Showing the direction calculated from your coordinates.</p>}
    <details className="qibla-details"><summary>Enter coordinates manually</summary>
      <form onSubmit={event => { event.preventDefault(); const latitude = Number(manualLat); const longitude = Number(manualLon); if (!manualLat.trim() || !manualLon.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) { setManualError('Enter a valid latitude (−90 to 90) and longitude (−180 to 180).'); return; } setManualError(''); setManualCoords(latitude, longitude); }}>
        <label>Latitude<input type="number" step="any" min={-90} max={90} required placeholder="e.g. 25.2048" value={manualLat} onChange={event => setManualLat(event.target.value)} /></label>
        <label>Longitude<input type="number" step="any" min={-180} max={180} required placeholder="e.g. 55.2708" value={manualLon} onChange={event => setManualLon(event.target.value)} /></label>
        <button type="submit" className="outline-button">Use these coordinates</button>
        {manualError && <p className="inline-error" role="alert">{manualError}</p>}
      </form>
    </details>
    <p className="qibla-help">Keep away from magnets, speakers and metal objects. Phone compass accuracy varies; compare with a trusted compass if the direction seems wrong.</p>
  </section>;
}
