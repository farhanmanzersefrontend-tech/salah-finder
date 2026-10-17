import { useEffect, useMemo, useState } from 'react';
import { Bicycle, Car, X, Plus, ShareNetwork, NavigationArrow, MapPin, Clock } from 'phosphor-react';
import { fetchMosqueRoute, routeLink, durationLabel } from '../../utils/mosqueRoute';
import type { MosqueRoute, TravelMode } from '../../utils/mosqueRoute';
import type { Mosque } from '../../utils/nearbyMosques';
import DraggableMapSheet from './DraggableMapSheet';

export default function MosqueRoutePlanner({ origin, originLabel, destination, mosques, onClose, onRoute }: {
  origin: { lat: number; lon: number }; originLabel: string; destination: Mosque; mosques: Mosque[];
  onClose: () => void; onRoute: (route: MosqueRoute | null) => void;
}) {
  const [mode, setMode] = useState<TravelMode>('car');
  const [stops, setStops] = useState<Mosque[]>([]);
  const [prayerMinutes, setPrayerMinutes] = useState(15);
  const [expanded, setExpanded] = useState(false);
  const [addingStops, setAddingStops] = useState(false);
  const [route, setRoute] = useState<MosqueRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [leave, setLeave] = useState(() => { const now = new Date(); return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; });
  const originLat = origin.lat;
  const originLon = origin.lon;
  const destinationLat = destination.lat;
  const destinationLon = destination.lon;
  const validStops = useMemo(() => stops.filter(stop => stop.id !== destination.id), [stops, destination.id]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setRoute(null); onRoute(null);
    fetchMosqueRoute([{ lat: originLat, lon: originLon }, ...validStops, { lat: destinationLat, lon: destinationLon }], mode, controller.signal)
      .then(result => { if (!controller.signal.aborted) { setRoute(result); onRoute(result); } })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to calculate route.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [originLat, originLon, destinationLat, destinationLon, mode, validStops, onRoute]);

  const link = routeLink(origin, destination, mode, validStops);
  const totalPrayer = prayerMinutes * (validStops.length + 1);
  const travelMinutes = route ? route.duration / 60 : 0;
  function timeAfter(minutes: number) {
    const [hour, minute] = leave.split(':').map(Number);
    const date = new Date(); date.setHours(hour || 0, (minute || 0) + Math.ceil(minutes), 0, 0);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  async function share() {
    setShareMessage('');
    try {
      if (navigator.share) await navigator.share({ title: `Route to ${destination.name}`, url: link });
      else { await navigator.clipboard.writeText(link); setShareMessage('Route link copied.'); }
    } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setShareMessage('Could not share. Open directions and copy the link from Google Maps.'); }
  }
  let elapsed = 0;
  return <DraggableMapSheet className={`route-planner ${expanded ? 'route-expanded' : ''}`} title="Journey details">
    <div className="route-title"><h2>{mode === 'car' ? 'Car – Four Wheeler' : 'Bike – Bicycle'}</h2><button className="icon-button" onClick={onClose} aria-label="Close route planner"><X size={22} /></button></div>
    <div className="route-modes" role="group" aria-label="Travel mode"><button aria-pressed={mode === 'bike'} onClick={() => setMode('bike')}><Bicycle size={19} />Bike</button><button aria-pressed={mode === 'car'} onClick={() => setMode('car')}><Car size={19} />Car</button></div>
    <label className="route-duration">Prayer stop duration<select value={prayerMinutes} onChange={event => setPrayerMinutes(Number(event.target.value))}>{[5, 10, 15, 20, 30, 45, 60].map(minutes => <option key={minutes} value={minutes}>{minutes} minutes per mosque</option>)}</select></label>
    <div aria-live="polite">{loading ? <p className="route-loading">Finding the best route…</p> : route && <><p className="route-total">{durationLabel(travelMinutes + totalPrayer)} <small>({(route.distance / 1000).toFixed(1)} km)</small></p><p className="route-breakdown">{durationLabel(travelMinutes)} <small>travel</small><b>+</b>{totalPrayer} mins <small>prayer</small></p></>}{error && <p className="finder-error">{error}</p>}</div>
    <div className="route-time-row"><label>Leave <input aria-label="Departure time" type="time" value={leave} onChange={event => setLeave(event.target.value)} /></label>{route && <span>Finish {timeAfter(travelMinutes + totalPrayer)}</span>}</div>
    <button className="route-details-toggle" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>{expanded ? 'Hide journey details' : 'View journey details'}<span>{expanded ? '−' : '+'}</span></button>
    {expanded && <div className="route-timeline"><article><span className="route-node"><MapPin size={19} /></span><div><h3>{originLabel}</h3><p>Starting time: {timeAfter(0)}</p></div></article>{[...validStops, destination].map((mosque, index) => {
      elapsed += route ? route.legs[index] / 60 : 0;
      const arrival = route ? timeAfter(elapsed) : null;
      elapsed += prayerMinutes;
      return <article key={mosque.id}><span className="route-node mosque-node">☪</span><div><h3>{mosque.name}</h3><p>{mosque.address || 'Nearby mosque'}</p><p>{arrival ? `Arrival: ${arrival} · ` : ''}{prayerMinutes} min prayer stop</p></div></article>;
    })}</div>}
    {addingStops && <div className="route-stop-list"><h3>Add nearby prayer stops</h3>{mosques.filter(mosque => mosque.id !== destination.id).length === 0 && <p>No additional mapped mosques within 1 km.</p>}{mosques.filter(mosque => mosque.id !== destination.id).map(mosque => <label key={mosque.id}><input type="checkbox" checked={validStops.some(stop => stop.id === mosque.id)} disabled={validStops.length >= 3 && !validStops.some(stop => stop.id === mosque.id)} onChange={event => setStops(items => event.target.checked ? [...items, mosque] : items.filter(stop => stop.id !== mosque.id))} /><span>{mosque.name}<small>{Math.round(mosque.distance)} m from start</small></span></label>)}<small>Up to 3 additional stops, in selection order.</small></div>}
    <div className="route-actions"><a href={link} target="_blank" rel="noreferrer"><NavigationArrow size={18} weight="fill" />Start</a><button onClick={() => setAddingStops(value => !value)} aria-expanded={addingStops}><Plus size={18} />Add stops{validStops.length ? ` (${validStops.length})` : ''}</button><button onClick={share}><ShareNetwork size={18} />Share</button></div>
    {shareMessage && <p className="finder-notice" role="status">{shareMessage}</p>}
    <p className="route-disclaimer"><Clock size={12} />Estimated travel time; live traffic excluded. Start opens Google Maps.</p>
  </DraggableMapSheet>;
}
