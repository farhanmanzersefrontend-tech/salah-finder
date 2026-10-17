import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { ArrowLeft, MapPin, NavigationArrow, Crosshair, MagnifyingGlass, ArrowClockwise, BookmarkSimple, Clock, X, CaretDown } from 'phosphor-react';
import { usePrayerStore } from '../../store/usePrayerStore';
import { nearbyMosques } from '../../utils/nearbyMosques';
import type { Mosque } from '../../utils/nearbyMosques';
import { currentPrayerLocation } from '../../utils/prayerLocation';
import { useSaved } from './useJournal';
import 'leaflet/dist/leaflet.css';
import './mosque-finder.css';
import MosqueRoutePlanner from './MosqueRoutePlanner';
import type { MosqueRoute } from '../../utils/mosqueRoute';

const mosquePin = `<svg viewBox="0 0 38 46" width="38" height="46" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M19 44C14 40 2 29 2 19a17 17 0 1 1 34 0c0 10-12 21-17 25Z" fill="#075b55" stroke="white" stroke-width="2.5"/><g fill="#f1d45c"><path d="M13 20h12v10H13zM13 19c0-4 4-5 6-8 2 3 6 4 6 8Z"/><path d="M8 15h3v15H8zM27 15h3v15h-3zM8 13l1.5-3 1.5 3ZM27 13l1.5-3 1.5 3Z"/></g><path d="M17 30v-6a2 2 0 0 1 4 0v6Z" fill="#075b55"/></svg>`;

export default function MosqueFinder({ onBack, onChooseLocation }: { onBack: () => void; onChooseLocation: () => void }) {
  const { coords, location } = usePrayerStore();
  const [mapView, setMapView] = useState<'google' | 'radius'>('google');
  const [googleFocus, setGoogleFocus] = useState<'location' | 'mosques'>('location');
  const [gps, setGps] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [manualLocation, setManualLocation] = useState(false);
  const lat = gps?.lat ?? (manualLocation ? coords.lat : null);
  const lon = gps?.lon ?? (manualLocation ? coords.lon : null);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [routeOpen, setRouteOpen] = useState(false);
  const [route, setRoute] = useState<MosqueRoute | null>(null);
  const [showNearby, setShowNearby] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(true);
  const [error, setError] = useState('');
  const [gpsError, setGpsError] = useState('');
  const [tileError, setTileError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useSaved<string[]>('salah-saved-mosques', []);
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const gpsRequest = useRef<AbortController | null>(null);
  const visible = useMemo(() => mosques.filter(mosque => `${mosque.name} ${mosque.address}`.toLowerCase().includes(query.toLowerCase())), [mosques, query]);
  const active = visible.find(mosque => mosque.id === selected) || visible[0];

  const locate = useCallback(async () => {
    gpsRequest.current?.abort();
    const controller = new AbortController(); gpsRequest.current = controller;
    setLocating(true); setGpsError(''); setGps(null); setManualLocation(false);
    try {
      const result = await currentPrayerLocation({ method: 'gps', useInternet: false }, controller.signal, 100);
      if (!controller.signal.aborted) {
        setGps({ lat: result.lat, lon: result.lon, accuracy: result.accuracy });
        setGoogleFocus('location');
        setMapView('google');
      }
    } catch (error) { if (!controller.signal.aborted) setGpsError(error instanceof Error ? error.message : 'Location is unavailable.'); }
    finally { if (!controller.signal.aborted) setLocating(false); }
  }, []);

  useEffect(() => {
    void locate();
    return () => gpsRequest.current?.abort();
  }, [locate]);
  const chooseLocation = () => {
    gpsRequest.current?.abort();
    setLocating(false); setGpsError(''); setGps(null);
    setManualLocation(true);
    onChooseLocation();
  };
  useEffect(() => {
    const controller = new AbortController();
    setMosques([]); setSelected(null); setError(''); setRoute(null); setRouteOpen(false);
    if (lat === null || lon === null) { setLoading(false); return; }
    setLoading(true);
    nearbyMosques(lat, lon, controller.signal).then(setMosques).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load nearby mosques. Please try again.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [lat, lon, retry]);

  useEffect(() => {
    if (!container.current || lat === null || lon === null) return;
    const instance = L.map(container.current, { zoomControl: false }).setView([lat, lon], 15);
    map.current = instance;
    setTileError(false);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' })
      .on('tileerror', () => setTileError(true)).addTo(instance);
    const radius = L.circle([lat, lon], { radius: 1000, color: '#4d9e90', weight: 1.5, dashArray: '7 7', fillColor: '#79b6a7', fillOpacity: 0.07 }).addTo(instance);
    const frame = radius.getBounds();
    const fitLocation = () => {
      instance.invalidateSize();
      const size = instance.getSize();
      const left = size.x > 650 ? 390 : 25;
      instance.fitBounds(frame, { paddingTopLeft: [left, 125], paddingBottomRight: [25, Math.min(270, size.y * 0.4)] });
    };
    fitLocation();
    if (gps) L.circle([lat, lon], { radius: gps.accuracy, color: '#2d80ed', weight: 1, fillOpacity: 0.12, interactive: false }).addTo(instance);
    L.marker([lat, lon], { title: gps ? 'Your current GPS location' : 'Selected search location', zIndexOffset: 1500, icon: L.divIcon({ className: 'finder-current-location', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 14] }) })
      .bindTooltip(gps ? `You are here · GPS accuracy ±${Math.round(gps.accuracy)} m` : 'Saved search location', { permanent: true, direction: 'bottom', offset: [0, 12], className: 'finder-user-label' }).addTo(instance);
    L.marker([frame.getNorth(), lon], { interactive: false, icon: L.divIcon({ className: 'finder-radius-label', html: '<span>1 km radius</span>', iconSize: [94, 26], iconAnchor: [47, 13] }) }).addTo(instance);
    L.control.zoom({ position: 'bottomright' }).addTo(instance);
    const observer = new ResizeObserver(fitLocation);
    observer.observe(container.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, [lat, lon, gps, mapView]);

  useEffect(() => {
    if (!map.current) return;
    const layer = L.layerGroup().addTo(map.current);
    // Always show every nearby mosque, even when the list is filtered.
    mosques.forEach(mosque => {
      const marker = L.marker([mosque.lat, mosque.lon], { icon: L.divIcon({ className: 'mosque-map-pin', html: mosquePin, iconSize: [38, 46], iconAnchor: [19, 46] }), title: mosque.name });
      const label = document.createElement('span');
      const name = document.createElement('strong'); name.textContent = mosque.name;
      const distance = document.createElement('small'); distance.textContent = `${Math.round(mosque.distance)} m from your location`;
      label.append(name, distance);
      marker.bindTooltip(label, { permanent: true, interactive: true, className: 'mosque-map-label', direction: 'top', offset: [0, -40], opacity: 1 }).on('click', () => { setQuery(''); setSelected(mosque.id); }).addTo(layer);
      marker.getTooltip()?.on('click', () => { setQuery(''); setSelected(mosque.id); });
    });
    return () => { layer.remove(); };
  }, [mosques, lat, lon, gps, mapView]);

  useEffect(() => {
    if (!map.current || !routeOpen || !route) return;
    const instance = map.current;
    const line = L.polyline(route.coordinates, { color: '#ef5655', weight: 5, opacity: 0.95, lineCap: 'round' }).addTo(instance);
    instance.fitBounds(line.getBounds(), { paddingTopLeft: [window.innerWidth >= 800 ? 400 : 40, 150], paddingBottomRight: [50, 290], maxZoom: 17 });
    return () => { line.remove(); };
  }, [route, routeOpen, mapView]);

  const googleQuery = googleFocus === 'location' ? `${lat},${lon}` : `mosques near ${lat},${lon}`;
  const embedKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY;
  const googleMapUrl = embedKey
    ? `https://www.google.com/maps/embed/v1/${googleFocus === 'location' ? 'place' : 'search'}?key=${encodeURIComponent(embedKey)}&q=${encodeURIComponent(googleQuery)}&center=${lat},${lon}&zoom=16`
    : `https://maps.google.com/maps?q=${encodeURIComponent(googleQuery)}&ll=${lat},${lon}&z=16&output=embed`;
  const directions = active && lat !== null && lon !== null ? `https://www.google.com/maps/dir/?api=1&origin=${lat},${lon}&destination=${active.lat},${active.lon}&travelmode=walking` : '';
  return <div className={`mosque-finder ${routeOpen ? 'is-routing' : ''}`}>
    <section className="finder-map-wrap" aria-label="Mosques within one kilometer">
      {lat !== null && lon !== null ? (mapView === 'google' ? <iframe className="finder-map finder-google-map" title={googleFocus === 'location' ? 'Your current location on Google Maps' : 'Nearby mosques on Google Maps'} src={googleMapUrl} allowFullScreen referrerPolicy="no-referrer-when-downgrade" /> : <div className="finder-map" ref={container} />) : <div className="finder-map-placeholder"><MapPin size={46} weight="duotone" /><h2>{locating ? 'Finding your location' : 'Your next place of peace'}</h2><p>{locating ? 'Allow precise location access. We will find mosques within 1 km automatically.' : 'Use GPS to find mosques within 1 km of where you are.'}</p><button className="primary-button" onClick={locate} disabled={locating}>{locating ? 'Finding your location…' : 'Use my location'}</button><button className="outline-button" onClick={chooseLocation}>Choose location</button></div>}
    </section>
    <div className={`finder-floating-header ${routeOpen ? 'route-header' : ''}`}>
      <div className="finder-search-bar"><button onClick={onBack} aria-label="Back"><ArrowLeft size={21} /></button><MagnifyingGlass size={18} /><input aria-label="Filter nearby mosques" placeholder="Mosque near me" value={query} onChange={event => { setQuery(event.target.value); setShowNearby(true); }} /><button aria-label={query ? 'Clear search' : 'Change location'} onClick={() => query ? setQuery('') : chooseLocation()}>{query ? <X size={18} /> : <MapPin size={19} />}</button></div>
      <div className="finder-location-row"><button className="finder-origin" onClick={chooseLocation}><Crosshair size={16} /><span>{gps ? 'Your current GPS location' : locating ? 'Locating you…' : manualLocation ? location || 'Choose your location' : 'Location permission needed'}</span><CaretDown size={14} /></button><span className="finder-radius-pill">1 km radius</span></div>
      {routeOpen && active && <div className="finder-destination"><MapPin size={17} weight="fill" /><span>{active.name}</span></div>}
    </div>
    {mapView === 'google' && gps && <div className="finder-google-focus" role="group" aria-label="Google Maps focus"><button aria-pressed={googleFocus === 'location'} onClick={() => setGoogleFocus('location')}><Crosshair size={15} />My location</button><button aria-pressed={googleFocus === 'mosques'} onClick={() => setGoogleFocus('mosques')}><MapPin size={15} />Nearby mosques</button></div>}
    <div className="finder-map-tools"><button onClick={locate} disabled={locating} aria-label="Find my GPS location" title="Use current GPS location"><Crosshair size={23} /></button><button className={mapView === 'google' ? 'is-active' : ''} aria-label={mapView === 'google' ? 'Show 1 km radius map' : 'Show Google Maps'} onClick={() => { setMapView(value => value === 'google' ? 'radius' : 'google'); }}><MapPin size={22} weight="duotone" /></button></div>
    {routeOpen && active && lat !== null && lon !== null ? <MosqueRoutePlanner key={active.id} origin={{ lat, lon }} originLabel={gps ? 'Your location' : location || 'Search location'} destination={active} mosques={mosques} onClose={() => { setRouteOpen(false); setRoute(null); }} onRoute={setRoute} /> : <section className="finder-sheet">
      <span className="finder-handle" />
      <div className="finder-sheet-heading"><h2>{active ? active.name : 'Find your nearest masjid'}</h2><button className="icon-button" onClick={() => setShowNearby(value => !value)} aria-label={showNearby ? 'Hide nearby mosque list' : 'Show nearby mosque list'}><CaretDown size={20} /></button></div>
      <div role="status" aria-live="polite">{locating && <p className="finder-notice">Step 1: Finding your current GPS location…</p>}{loading && <p className="finder-notice">Finding and marking mosques within 1 km of your location…</p>}{(error || gpsError) && <p className="finder-error">{gpsError || error}</p>}{tileError && mapView === 'radius' && <p className="finder-notice">Map tiles could not load. You can still use the list or Google Maps.</p>}{!loading && !error && lat !== null && !active && <p className="finder-notice">{query ? 'No nearby mosques match your search.' : 'No mapped mosques found within 1 km. Listings may be incomplete.'}</p>}</div>
      {active && <><p className="finder-detail"><MapPin size={17} weight="fill" />{active.address || 'Address not listed · View location on map'}</p><p className="finder-detail"><NavigationArrow size={17} />{Math.round(active.distance)} m <span>· Straight-line distance</span></p><p className="finder-detail"><Clock size={17} />{active.hours || 'Opening hours not listed'}</p><div className="finder-actions"><button className="finder-directions" onClick={() => { setMapView('radius'); setRouteOpen(true); }}><NavigationArrow size={17} weight="fill" />Direction</button><a href={directions} target="_blank" rel="noreferrer"><NavigationArrow size={17} />Start</a><button aria-pressed={saved.includes(active.id)} onClick={() => setSaved(items => items.includes(active.id) ? items.filter(id => id !== active.id) : [...items, active.id])}><BookmarkSimple size={17} weight={saved.includes(active.id) ? 'fill' : 'regular'} />{saved.includes(active.id) ? 'Saved' : 'Save'}</button></div></>}
      <div className="finder-nearby-bar"><button onClick={() => setShowNearby(value => !value)} aria-expanded={showNearby}>{mosques.length} mosques within 1 km <CaretDown size={14} /></button><button onClick={() => setRetry(value => value + 1)} disabled={loading} aria-label="Refresh mosques"><ArrowClockwise size={16} /></button></div>
      {showNearby && <div className="finder-results">{visible.map(mosque => <button className={`finder-result ${active?.id === mosque.id ? 'is-selected' : ''}`} key={mosque.id} onClick={() => { setSelected(mosque.id); setQuery(''); map.current?.panTo([mosque.lat, mosque.lon]); }}><span className="finder-result-icon">☪</span><span><strong>{mosque.name}</strong><small>{mosque.address || 'Nearby mosque'}</small></span><b>{Math.round(mosque.distance)} m</b></button>)}</div>}
      <p className="finder-credit">{mapView === 'google' ? 'Google Maps results may extend beyond 1 km.' : gps ? `Your GPS location · accuracy ±${Math.round(gps.accuracy)} m` : 'Search location shown. Tap the crosshair to use GPS.'} · Mosque data © OpenStreetMap</p>
    </section>}
  </div>;
}
