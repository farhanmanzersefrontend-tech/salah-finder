import { useEffect, useRef, useState } from 'react';
import { ArrowCounterClockwise, CaretDown, Check, MagnifyingGlass, X } from 'phosphor-react';
import { useSaved } from './useJournal';
import './dhikr.css';

const dhikr = [
  { countIndex: 3, arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', name: 'La ilaha illallah', meaning: 'There is no god but Allah' },
  { countIndex: 0, arabic: 'سُبْحَانَ اللَّهِ', name: 'SubhanAllah', meaning: 'Glory be to Allah' },
  { countIndex: 1, arabic: 'الْحَمْدُ لِلَّهِ', name: 'Alhamdulillah', meaning: 'All praise is due to Allah' },
  { countIndex: 2, arabic: 'اللَّهُ أَكْبَرُ', name: 'Allahu Akbar', meaning: 'Allah is the Greatest' },
  { countIndex: 4, arabic: 'أَسْتَغْفِرُ اللَّهَ', name: 'Astaghfirullah', meaning: 'I seek forgiveness from Allah' },
];

const searchable = (value: string) => value.normalize('NFD').replace(/\p{M}|\s/gu, '').toLowerCase();

export default function MobileDhikr() {
  const [counts, setCounts] = useSaved<number[]>('salah-dhikr-counts', [0, 0, 0, 0, 0]);
  const [dhikrIndex, setDhikrIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const sheet = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const current = dhikr[dhikrIndex];
  const count = counts[current.countIndex] ?? 0;
  const matches = dhikr.map((item, index) => ({ ...item, index }))
    .filter(item => searchable(`${item.name} ${item.arabic} ${item.meaning}`).includes(searchable(query)));

  useEffect(() => {
    if (!open) return;
    const dialog = sheet.current;
    const triggerButton = trigger.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      triggerButton?.focus();
    };
  }, [open]);

  const updateCount = (reset = false) => {
    // Keep saved counters tied to their original dhikr when the list is reordered.
    setCounts(previous => Array.from({ length: dhikr.length }, (_, index) => index === current.countIndex
      ? reset ? 0 : (previous[index] ?? 0) + 1
      : previous[index] ?? 0));
  };

  return (
    <section className="dhikr-panel" aria-label="Dhikr counter">
      <button
        ref={trigger}
        type="button"
        className="dhikr-selector"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="dhikr-list"
        onClick={() => { setQuery(''); setOpen(true); }}
      >
        <span>{current.name} <span className="dhikr-selector-arabic" lang="ar" dir="rtl">({current.arabic})</span></span>
        <CaretDown size={20} aria-hidden="true" />
      </button>
      <p className="arabic-text" lang="ar" dir="rtl">{current.arabic}</p>
      <h2>{current.name}</h2>
      <p>{current.meaning}</p>
      <button className="dhikr-counter" aria-label={`Count ${current.name}, currently ${count}`} onClick={() => updateCount()}>
        <strong>{count}</strong><span>Tap to count</span>
      </button>
      <button className="outline-button" onClick={() => updateCount(true)}>
        <ArrowCounterClockwise size={16} /> Reset counter
      </button>

      <dialog
        ref={sheet}
        id="dhikr-list"
        className="dhikr-sheet"
        aria-labelledby="dhikr-list-title"
        onCancel={event => { event.preventDefault(); setOpen(false); }}
        onClick={event => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setOpen(false);
        }}
      >
        <div className="dhikr-sheet-handle" aria-hidden="true" />
        <div className="dhikr-sheet-heading">
          <h2 id="dhikr-list-title">Dhikr list</h2>
          <button className="icon-button" aria-label="Close dhikr list" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>
        <label className="dhikr-search">
          <MagnifyingGlass size={22} aria-hidden="true" />
          <input autoFocus type="search" placeholder="Search dhikr" aria-label="Search dhikr" value={query} onChange={event => setQuery(event.target.value)} />
        </label>
        <ul className="dhikr-options" aria-label="Choose a dhikr">
          {matches.map(item => (
            <li key={item.name}>
              <button className="dhikr-option" aria-pressed={item.index === dhikrIndex} onClick={() => { setDhikrIndex(item.index); setOpen(false); }}>
                <span className="dhikr-option-number" aria-hidden="true">{item.index + 1}</span>
                <span className="dhikr-option-label">{item.name} <span lang="ar" dir="rtl">({item.arabic})</span></span>
                {item.index === dhikrIndex && <Check className="dhikr-option-check" size={22} weight="bold" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
        {matches.length === 0 && <p className="dhikr-no-results" role="status">No dhikr found. Try another name.</p>}
      </dialog>
    </section>
  );
}
