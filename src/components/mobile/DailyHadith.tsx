import { useEffect, useState } from 'react';
import { CaretRight, BookOpen, CheckCircle } from 'phosphor-react';
import { hadithDay, loadDailyHadith } from '../../utils/dailyHadith';
import type { DailyHadith as Hadith } from '../../utils/dailyHadith';
import './daily-hadith.css';

export default function DailyHadith({ journal, onMarkRead }: { journal: Record<string, string[]>; onMarkRead: (day: string, number: number) => void }) {
  const [day, setDay] = useState(() => hadithDay(new Date()));
  const [result, setResult] = useState<{ day: string; items: Hadith[] } | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const refresh = () => setDay(hadithDay(new Date()));
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setError('');
    loadDailyHadith(day, controller.signal).then(items => { if (!controller.signal.aborted) setResult({ day, items }); })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load today’s Hadiths.'); });
    return () => controller.abort();
  }, [day, attempt]);
  const readToday = journal[day] || [];
  const items = result?.day === day ? result.items : [];
  return <section className="daily-hadith" aria-label="Two daily Hadiths">
    <div className="daily-hadith-heading"><div><h2>Today’s Hadiths</h2><p>Read both daily Hadiths to grow your streak.</p></div><BookOpen size={24} weight="duotone"/></div>
    <time className="daily-hadith-date" dateTime={day}>{new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
    {!items.length && !error && <p className="loading-state" role="status">Loading today’s Hadiths…</p>}
    {error && <div className="daily-hadith-error" role="alert"><p>{error}</p><button className="outline-button" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>}
    <div className="hadith-list">{items.map(item => <article key={item.number}>
      <span className="small-pill">{item.narrator ? `Narrated by ${item.narrator}` : 'Sahih al-Bukhari'}</span>
      <h2>{item.section}</h2>
      <p className="hadith-english" lang="en">{item.english}</p>
      <p className="hadith-urdu" lang="ur" dir="rtl">{item.urdu}</p>
      <small>Sahih al-Bukhari · Book {item.book}, Hadith {item.bookHadith}</small>
      <a href={item.sourceUrl} target="_blank" rel="noreferrer">Sahih al-Bukhari {item.referenceNumber}<CaretRight size={15}/></a>
      <button className={`outline-button hadith-mark-read ${readToday.includes(String(item.number)) ? 'is-read' : ''}`} aria-pressed={readToday.includes(String(item.number))} onClick={() => onMarkRead(day, item.number)}><CheckCircle size={18} weight={readToday.includes(String(item.number)) ? 'fill' : 'regular'}/>{readToday.includes(String(item.number)) ? 'Read today' : 'Mark read'}</button>
    </article>)}</div>
    <p className="daily-hadith-credit">Translations: <a href="https://github.com/fawazahmed0/hadith-api" target="_blank" rel="noreferrer">Hadith API</a> · References: Sunnah.com</p>
  </section>;
}
