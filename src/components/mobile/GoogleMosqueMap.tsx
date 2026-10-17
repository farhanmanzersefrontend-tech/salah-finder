import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../../utils/googleMosques';
import type { Mosque } from '../../utils/nearbyMosques';
import type { MosqueRoute } from '../../utils/mosqueRoute';

export default function GoogleMosqueMap({ apiKey, lat, lon, accuracy, mosques, selected, route, bottomInset, onSelect, onError }: {
  apiKey: string; lat: number; lon: number; accuracy?: number; mosques: Mosque[];
  selected: string | null; route: MosqueRoute | null;
  bottomInset: number;
  onSelect: (id: string) => void; onError: (message: string) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    const overlays: google.maps.Circle[] = [];
    let marker: google.maps.marker.AdvancedMarkerElement | undefined;
    let observer: ResizeObserver | undefined;
    setReady(false);
    void (async () => {
      await loadGoogleMaps(apiKey);
      const [{ Map, Circle }, { AdvancedMarkerElement }] = await Promise.all([
        google.maps.importLibrary('maps') as Promise<google.maps.MapsLibrary>,
        google.maps.importLibrary('marker') as Promise<google.maps.MarkerLibrary>,
      ]);
      if (disposed || !element.current) return;
      const center = { lat, lng: lon };
      const instance = new Map(element.current, { center, zoom: 16, mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
        mapTypeControl: false, streetViewControl: false, fullscreenControl: true, clickableIcons: false, gestureHandling: 'greedy', zoomControl: false });
      map.current = instance;
      const radius = new Circle({ map: instance, center, radius: 1000, strokeColor: '#267f73', strokeWeight: 2, fillColor: '#4caa98', fillOpacity: 0.09 });
      overlays.push(radius);
      if (accuracy !== undefined) overlays.push(new Circle({ map: instance, center, radius: accuracy, strokeColor: '#267bed', strokeOpacity: 0.4, fillColor: '#267bed', fillOpacity: 0.12, strokeWeight: 1 }));
      const content = document.createElement('div'); content.className = 'google-user-marker';
      const label = document.createElement('span'); label.textContent = accuracy === undefined ? 'Search location' : 'You are here'; content.append(label);
      marker = new AdvancedMarkerElement({ map: instance, position: center, content, title: accuracy === undefined ? 'Selected location' : `Your location · accuracy ±${Math.round(accuracy)} m`, zIndex: 1000 });
      const fit = () => {
        const bounds = radius.getBounds();
        if (bounds) instance.fitBounds(bounds, { top: element.current && element.current.clientWidth > 500 ? 40 : 125, right: 25, bottom: 25, left: 25 });
      };
      fit(); observer = new ResizeObserver(fit); observer.observe(element.current);
      setReady(true);
    })().catch(error => { if (!disposed) onError(error instanceof Error ? error.message : 'Google Maps could not load.'); });
    return () => {
      disposed = true; observer?.disconnect(); overlays.forEach(overlay => overlay.setMap(null));
      if (marker) marker.map = null;
      map.current = null;
    };
  }, [apiKey, lat, lon, accuracy, onError]);

  useEffect(() => {
    if (!ready || !map.current) return;
    const instance = map.current;
    const markers = mosques.map(mosque => {
      const content = document.createElement('button'); content.type = 'button'; content.className = 'google-mosque-marker';
      content.setAttribute('aria-label', `${mosque.name}, ${Math.round(mosque.distance)} meters away`);
      const symbol = document.createElement('span'); symbol.textContent = '☪';
      const label = document.createElement('strong'); label.textContent = mosque.name;
      const distance = document.createElement('small'); distance.textContent = `${Math.round(mosque.distance)} m`;
      content.append(label, distance, symbol);
      content.onclick = () => onSelect(mosque.id);
      return new google.maps.marker.AdvancedMarkerElement({ map: instance, position: { lat: mosque.lat, lng: mosque.lon }, content, title: mosque.name });
    });
    return () => markers.forEach(marker => { marker.map = null; });
  }, [mosques, ready, onSelect]);

  useEffect(() => {
    if (!ready || !selected) return;
    const mosque = mosques.find(item => item.id === selected);
    if (mosque) map.current?.panTo({ lat: mosque.lat, lng: mosque.lon });
  }, [ready, selected, mosques]);

  useEffect(() => {
    if (!ready || !map.current || !route) return;
    const line = new google.maps.Polyline({ map: map.current, path: route.coordinates.map(([lat, lng]) => ({ lat, lng })), strokeColor: '#ef5655', strokeWeight: 5 });
    const bounds = new google.maps.LatLngBounds(); route.coordinates.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    map.current.fitBounds(bounds, { top: 30, right: 25, bottom: 25, left: 25 });
    return () => line.setMap(null);
  }, [ready, route]);
  return <div className="finder-map finder-google-canvas" style={{ height: `calc(100% - ${bottomInset}px)` }} ref={element} aria-label="Your location, mosque markers, and one kilometer radius on Google Maps" />;
}
