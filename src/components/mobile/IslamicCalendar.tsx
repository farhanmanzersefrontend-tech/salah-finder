import { useEffect, useState } from 'react';
import { CaretLeft, CaretRight, Moon } from 'phosphor-react';
import { dayKey } from './useJournal';
import { formatHijri, hijriMonth, shiftDate } from '../../utils/islamicCalendar';
import { islamicObservances, loadIslamicObservances, observancesInRange } from '../../utils/islamicObservances';
import type { IslamicObservance } from '../../utils/islamicObservances';
import './guides.css';

const gregorian = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const shortGregorian = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function IslamicCalendar({ today, hijriOffset }: { today: Date; hijriOffset: number }) {
  const [selected, setSelected] = useState(() => shiftDate(today, 0));
  const [view, setView] = useState(() => shiftDate(today, 0));
  const { start, length } = hijriMonth(view, hijriOffset);
  const [events, setEvents] = useState<IslamicObservance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true); setError('');
    loadIslamicObservances(AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]))
      .then(result => { if (active) setEvents(result); })
      .catch(() => { if (active) setError('Could not load Islamic dates. Check your connection and try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [attempt]);
  const selectedEvents = islamicObservances(selected, hijriOffset, events);
  const monthEvents = observancesInRange(start, length, hijriOffset, events);
  const selectDate = (date: Date) => { setSelected(date); setView(date); };

  return <div className="islamic-calendar">
    <section className="hijri-date-card" aria-label="Selected date" aria-live="polite">
      <Moon size={28} weight="duotone" aria-hidden="true" />
      <h2>{formatHijri(selected, hijriOffset)}</h2>
      <time dateTime={dayKey(selected)}>{gregorian.format(selected)}</time>
      {selectedEvents.map(event => <p className="hijri-observance-name" key={event.id}>{event.name}</p>)}
    </section>
    <div className="hijri-calendar-tools">
      <button className="outline-button" onClick={() => selectDate(shiftDate(today, 0))}>View today</button>
      <label className="hijri-date-input">Gregorian to Hijri
        <input type="date" aria-label="Choose Gregorian date to convert to Hijri" value={dayKey(selected)} onChange={event => {
          if (!event.target.value) return;
          const date = new Date(`${event.target.value}T12:00:00`);
          if (!Number.isNaN(date.getTime())) selectDate(date);
        }} />
      </label>
    </div>
    <section className="hijri-month-card" aria-label="Islamic month calendar">
      <div className="hijri-month-heading">
        <button className="icon-button" aria-label="Previous Hijri month" onClick={() => setView(shiftDate(start, -1))}><CaretLeft size={20} /></button>
        <h2 aria-live="polite">{formatHijri(start, hijriOffset, true)}</h2>
        <button className="icon-button" aria-label="Next Hijri month" onClick={() => setView(shiftDate(start, length))}><CaretRight size={20} /></button>
      </div>
      <p className="hijri-month-range">{shortGregorian.format(start)} – {gregorian.format(shiftDate(start, length - 1))}</p>
      <div className="hijri-days">
        {weekdays.map(day => <span className="hijri-weekday" key={day}>{day}</span>)}
        {Array.from({ length: start.getDay() }, (_, index) => <span key={`empty-${index}`} aria-hidden="true" />)}
        {Array.from({ length }, (_, index) => {
          const date = shiftDate(start, index);
          const isToday = dayKey(date) === dayKey(today);
          const isSelected = dayKey(date) === dayKey(selected);
          const dayEvents = islamicObservances(date, hijriOffset, events);
          return <button key={index} className={`hijri-day${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}${dayEvents.length ? ' is-observance' : ''}`}
            aria-label={`${formatHijri(date, hijriOffset)}, ${gregorian.format(date)}${dayEvents.length ? `, ${dayEvents.map(event => event.name).join(', ')}` : ''}`}
            title={dayEvents.map(event => event.name).join(', ') || undefined}
            aria-current={isToday ? 'date' : undefined} aria-pressed={isSelected}
            onClick={() => setSelected(date)}>
            <strong>{index + 1}</strong><small>{date.getDate()}</small>
            {dayEvents.length > 0 && <i className="hijri-observance-dot" aria-hidden="true" />}
          </button>;
        })}
      </div>
      <div className="hijri-calendar-key"><span><i /> Today</span><span className="hijri-observance-legend"><i /> Islamic observance</span><span>Hijri day · Gregorian day below</span></div>
    </section>
    <section className="hijri-observances" aria-labelledby="hijri-observances-title">
      <h2 id="hijri-observances-title">Important dates this month</h2>
      <p aria-live="polite">{formatHijri(start, hijriOffset, true)}</p>
      {loading && <p role="status">Loading Islamic dates…</p>}
      {error && <div className="inline-error" role="alert"><p>{error}</p><button className="outline-button" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>}
      {!loading && !error && monthEvents.length === 0 && <p>No major Islamic dates in this month. Use the arrows above to explore another month.</p>}
      {monthEvents.map(event => <button key={`${event.id}-${dayKey(event.date)}`} onClick={() => selectDate(event.date)}>
        <span><strong>{event.name}</strong><small>{formatHijri(event.date, hijriOffset)}</small></span>
        <time dateTime={dayKey(event.date)}>{gregorian.format(event.date)}</time>
      </button>)}
    </section>
    <p className="hijri-calendar-note">Umm al-Qura calendar{hijriOffset ? ` · ${hijriOffset > 0 ? '+' : ''}${hijriOffset} day adjustment` : ''}. Dates follow your Hijri settings. Local moon sightings may shift these dates. Islamic dates begin at sunset on the preceding evening.</p>
  </div>;
}
