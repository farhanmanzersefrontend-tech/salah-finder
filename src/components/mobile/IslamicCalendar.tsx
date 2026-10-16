import { useState } from 'react';
import { CaretLeft, CaretRight, Moon } from 'phosphor-react';
import { dayKey } from './useJournal';
import { formatHijri, hijriMonth, shiftDate } from '../../utils/islamicCalendar';
import './guides.css';

const gregorian = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const shortGregorian = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function IslamicCalendar({ today, hijriOffset }: { today: Date; hijriOffset: number }) {
  const [selected, setSelected] = useState(() => shiftDate(today, 0));
  const [view, setView] = useState(() => shiftDate(today, 0));
  const { start, length } = hijriMonth(view, hijriOffset);
  const selectDate = (date: Date) => { setSelected(date); setView(date); };

  return <div className="islamic-calendar">
    <section className="hijri-date-card" aria-label="Selected date" aria-live="polite">
      <Moon size={28} weight="duotone" aria-hidden="true" />
      <h2>{formatHijri(selected, hijriOffset)}</h2>
      <time dateTime={dayKey(selected)}>{gregorian.format(selected)}</time>
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
          return <button key={index} className={`hijri-day${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}`}
            aria-label={`${formatHijri(date, hijriOffset)}, ${gregorian.format(date)}`}
            aria-current={isToday ? 'date' : undefined} aria-pressed={isSelected}
            onClick={() => setSelected(date)}>
            <strong>{index + 1}</strong><small>{date.getDate()}</small>
          </button>;
        })}
      </div>
      <div className="hijri-calendar-key"><span><i /> Today</span><span>Hijri day · Gregorian day below</span></div>
    </section>
    <p className="hijri-calendar-note">Umm al-Qura calendar{hijriOffset ? ` · ${hijriOffset > 0 ? '+' : ''}${hijriOffset} day adjustment` : ''}. Dates follow your Hijri settings.</p>
  </div>;
}
