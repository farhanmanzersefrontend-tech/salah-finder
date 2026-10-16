import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Check, MagnifyingGlass, MapPin } from 'phosphor-react';

export type CitySuggestion = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
};

export const cityLabel = (city: CitySuggestion) =>
  [...new Set([city.name, city.admin1, city.country].filter(Boolean))].join(', ');

export default function CitySearch({ busy, onSelect }: {
  busy: boolean;
  onSelect: (city: CitySuggestion) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CitySuggestion[]>([]);
  const [selected, setSelected] = useState<CitySuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [attempt, setAttempt] = useState(0);
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const options = useRef<(HTMLLIElement | null)[]>([]);
  const showResults = open && !selected && results.length > 0;

  useEffect(() => {
    if (selected || query.trim().length < 3) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        // This provider supports prefix searches; the public Nominatim API does not allow autocomplete.
        const params = new URLSearchParams({ name: query.trim(), count: '6', language: 'en', format: 'json' });
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
        });
        if (!response.ok) throw new Error('City search failed');
        const body = await response.json();
        if (body.error) throw new Error('City search failed');
        if (!controller.signal.aborted) {
          setResults((body.results ?? []).filter((city: CitySuggestion) =>
            city.name && Number.isFinite(city.latitude) && Number.isFinite(city.longitude)));
        }
      } catch {
        if (!controller.signal.aborted) setError('Could not load cities. Check your connection and try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, selected, attempt]);

  useEffect(() => {
    if (activeIndex >= 0) options.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function choose(city: CitySuggestion) {
    setSelected(city);
    setQuery(cityLabel(city));
    setOpen(false);
    setActiveIndex(-1);
    setError('');
    setLoading(false);
    input.current?.focus();
  }

  return <form className="city-search" onSubmit={event => {
    event.preventDefault();
    if (selected && !busy) void onSelect(selected);
  }} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <label className="search-field">
      <MagnifyingGlass size={19}/>
      <input
        ref={input}
        aria-label="City name"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showResults}
        aria-controls={listId}
        aria-describedby={`${listId}-status`}
        aria-activedescendant={showResults && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder="Enter your city"
        value={query}
        disabled={busy}
        onFocus={() => setOpen(true)}
        onChange={event => {
          setQuery(event.target.value);
          setSelected(null);
          setResults([]);
          setActiveIndex(-1);
          setError('');
          setLoading(event.target.value.trim().length >= 3);
          setOpen(true);
        }}
        onKeyDown={event => {
          if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length && !selected) {
            event.preventDefault();
            setOpen(true);
            setActiveIndex(index => event.key === 'ArrowDown'
              ? (index + 1) % results.length
              : (index <= 0 ? results.length : index) - 1);
          } else if (event.key === 'Enter' && showResults) {
            event.preventDefault();
            choose(results[Math.max(0, activeIndex)]);
          } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
        }}
      />
      {selected && <Check className="city-selected-check" size={18}/>}
    </label>
    <ul id={listId} role="listbox" aria-label="Suggested cities" className="city-suggestions" hidden={!showResults}>
      {results.map((city, index) => <li
        id={`${listId}-${index}`}
        key={city.id}
        ref={element => { options.current[index] = element; }}
        role="option"
        aria-selected={index === activeIndex}
        className={index === activeIndex ? 'highlighted' : ''}
        onMouseDown={event => event.preventDefault()}
        onClick={() => choose(city)}
      >
        <MapPin size={18}/>
        <span><strong>{city.name}</strong><small>{[city.admin1, city.country].filter(Boolean).join(', ')}</small></span>
      </li>)}
    </ul>
    <div className="city-search-status" id={`${listId}-status`} role="status" aria-live="polite">
      {selected ? 'City selected. Find your prayer times below.'
        : loading ? 'Searching for cities…'
        : error || (query.trim().length < 3 ? 'Type at least 3 letters to see matching cities.'
          : results.length ? 'Choose your city from the suggestions.' : 'No cities found. Try another spelling or a nearby city.')}
    </div>
    {error && <button type="button" className="city-search-retry" onClick={() => {
      setError(''); setLoading(true); setAttempt(value => value + 1);
    }}>Try city search again</button>}
    <button type="submit" className="outline-button" disabled={busy || !selected}>
      {busy ? 'Loading prayer times…' : 'Find prayer times'} <ArrowRight size={17}/>
    </button>
    {results.length > 0 && <p className="city-search-credit">City data: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> / <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a></p>}
  </form>;
}
