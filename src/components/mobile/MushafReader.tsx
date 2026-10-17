import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookmarkSimple, BookOpen, CaretLeft, CaretRight, List } from 'phosphor-react';
import type { SurahMeta } from '../../hooks/useQuranData';
import { fetchMushafPage, printedMushafImageUrl, findMushafPage, MUSHAF_PAGES, validMushafPage } from '../../utils/mushafApi';
import type { MushafAyah } from '../../utils/mushafApi';
import { useSaved } from './useJournal';
import './mushaf-reader.css';

type Props = { onLoaded: (page: number) => void; page: number; onPage: (page: number) => void; onBack: () => void; surahs: SurahMeta[]; readToday: string[]; onMarkRead?: (surah: number, ayah: number) => void };
export default function MushafReader({ onLoaded, page, onPage, onBack, surahs, readToday, onMarkRead }: Props) {
  const [content, setContent] = useState<{ page: number; ayahs: MushafAyah[] } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [pageInput, setPageInput] = useState(String(page));
  const [inputError, setInputError] = useState('');
  const [index, setIndex] = useState<'surah' | 'juz' | 'saved' | null>(null);
  const [indexQuery, setIndexQuery] = useState('');
  const [finding, setFinding] = useState(false);
  const lookup = useRef<AbortController | null>(null);
  const paper = useRef<HTMLElement | null>(null);
  const [saved, setSaved] = useSaved<number[]>('salah-mushaf-bookmarks', []);
  useEffect(() => {
    const controller = new AbortController();
    setError(''); setPageInput(String(page)); setInputError('');
    fetchMushafPage(page, controller.signal).then(ayahs => {
      if (!controller.signal.aborted) { setContent({ page, ayahs }); onLoaded(page); }
    }).catch(() => { if (!controller.signal.aborted) setError('Unable to load this page. Check your connection and try again.'); });
    return () => controller.abort();
  }, [page, retry, onLoaded]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => paper.current?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    return () => window.cancelAnimationFrame(frame);
  }, [page]);
  useEffect(() => () => lookup.current?.abort(), []);
  const ayahs = content?.page === page ? content.ayahs : [];
  const loading = !ayahs.length && !error;
  const bookmarked = saved.includes(page);
  function go(value: number) {
    if (!validMushafPage(value)) return;
    if (value === page) window.requestAnimationFrame(() => paper.current?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    lookup.current?.abort(); setFinding(false); setIndex(null); setIndexQuery(''); if (value === page && error) setRetry(attempt => attempt + 1); setError(''); onPage(value);
  }
  async function openIndex(kind: 'surah' | 'juz', number: number) {
    lookup.current?.abort();
    const controller = new AbortController(); lookup.current = controller;
    setFinding(true); setInputError('');
    try { const found = await findMushafPage(kind, number, controller.signal); if (!controller.signal.aborted) go(found); }
    catch { if (!controller.signal.aborted) setInputError('Unable to open this entry. Please try again.'); }
    finally { if (!controller.signal.aborted) setFinding(false); }
  }
  return <div className="mobile-page mushaf-reader">
    <div className="page-title"><button className="icon-button" onClick={onBack} aria-label="Back to Quran"><ArrowLeft size={21}/></button><h1>Mushaf</h1><button className="icon-button" aria-label={bookmarked ? 'Remove page bookmark' : 'Bookmark this page'} aria-pressed={bookmarked} onClick={() => setSaved(previous => previous.includes(page) ? previous.filter(item => item !== page) : [...previous, page])}><BookmarkSimple size={22} weight={bookmarked ? 'fill' : 'regular'}/></button></div>
    <div className="mushaf-tools"><button onClick={() => { setIndex(index === 'surah' ? null : 'surah'); setInputError(''); }} aria-expanded={index === 'surah'}><List size={17}/>Surahs</button><button onClick={() => { setIndex(index === 'juz' ? null : 'juz'); setInputError(''); }} aria-expanded={index === 'juz'}>Juz</button><button onClick={() => { setIndex(index === 'saved' ? null : 'saved'); setInputError(''); }} aria-expanded={index === 'saved'}><BookmarkSimple size={16}/>Saved pages</button></div>
    <form className="mushaf-jump" onSubmit={event => { event.preventDefault(); const value = Number(pageInput); if (!validMushafPage(value)) setInputError('Enter a page from 1 to 604.'); else go(value); }}><label htmlFor="mushaf-page-input">Page</label><input id="mushaf-page-input" type="number" min="1" max={MUSHAF_PAGES} inputMode="numeric" value={pageInput} onChange={event => setPageInput(event.target.value)} aria-invalid={Boolean(inputError)}/><span>of {MUSHAF_PAGES}</span><button type="submit">Go</button></form>
    {inputError && <p className="inline-error" role="alert">{inputError}</p>}
    {index && <section className="mushaf-index" aria-label={`${index} index`}><div className="mushaf-index-heading"><h2>{index === 'surah' ? 'Surah index' : index === 'juz' ? 'Juz index' : 'Saved pages'}</h2><button onClick={() => { lookup.current?.abort(); setFinding(false); setIndex(null); }} aria-label="Close index">Close</button></div>{index === 'surah' && <><input className="mushaf-index-search" aria-label="Search surah index" placeholder="Search surah name or number" value={indexQuery} onChange={event => setIndexQuery(event.target.value)}/>{!surahs.length && <p className="empty-state">The surah index is loading. You can also jump to a page above.</p>}{surahs.filter(surah => `${surah.number} ${surah.englishName} ${surah.name}`.toLowerCase().includes(indexQuery.toLowerCase())).map(surah => <button className="mushaf-index-row" key={surah.number} disabled={finding} onClick={() => void openIndex('surah', surah.number)}><span>{surah.number}. {surah.englishName}</span><span lang="ar" dir="rtl">{surah.name}</span></button>)}</>}{index === 'juz' && <div className="mushaf-juz-grid">{Array.from({ length: 30 }, (_, i) => <button disabled={finding} key={i} onClick={() => void openIndex('juz', i + 1)}>Juz {i + 1}</button>)}</div>}{index === 'saved' && (saved.length ? [...saved].sort((a, b) => a - b).map(number => <button className="mushaf-index-row" key={number} onClick={() => go(number)}><BookOpen size={18}/>Page {number}<CaretRight size={17}/></button>) : <p className="empty-state">Bookmark a page to keep it here.</p>)}{finding && <p role="status" className="loading-state">Finding your page…</p>}</section>}
    {loading && <p className="mushaf-accessible-text" role="status">Opening page {page}…</p>}
    {error && <div className="empty-state" role="alert"><p>{error}</p><button className="outline-button" onClick={() => { setError(''); setRetry(value => value + 1); }}>Try again</button></div>}
    <article ref={paper} className="mushaf-paper" aria-label={`Quran page ${page}`}><header className="mushaf-page-meta"><span>{ayahs[0]?.surah.englishName || 'Al Quran Al Kareem'}</span><span>{ayahs[0] ? `Juz ${ayahs[0].juz}` : `Page ${page}`}</span></header><div className="mushaf-frame"><PrintedMushafPage key={`${page}:${retry}`} page={page} />{ayahs.length > 0 && <div className="mushaf-accessible-text" lang="ar" dir="rtl">{ayahs.map(ayah => <p key={ayah.number}>{ayah.text} ({ayah.numberInSurah})</p>)}</div>}</div><footer>{page.toLocaleString('ar-EG')}</footer></article>
    <nav className="mushaf-pagination" aria-label="Mushaf pages"><button disabled={page === 1} onClick={() => go(page - 1)}><CaretLeft size={18}/>Previous</button><span>{page} / {MUSHAF_PAGES}</span><button disabled={page === MUSHAF_PAGES} onClick={() => go(page + 1)}>Next<CaretRight size={18}/></button></nav>
    {onMarkRead && ayahs.length > 0 && <details className="mushaf-reading-tracker"><summary>Track ayahs read on this page</summary><div>{ayahs.map(ayah => { const read = readToday.includes(`${ayah.surah.number}:${ayah.numberInSurah}`); return <button key={ayah.number} aria-pressed={read} onClick={() => onMarkRead(ayah.surah.number, ayah.numberInSurah)}>{ayah.surah.number}:{ayah.numberInSurah} · {read ? 'Read today' : 'Mark read'}</button>; })}</div></details>}
    <p className="mushaf-credit">Madani Mushaf · <a href="https://quran.islam-db.com/data/pages/quranpages_1024/images/" target="_blank" rel="noreferrer">Page artwork</a></p>
  </div>;
}

function PrintedMushafPage({ page }: { page: number }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  return <div className="mushaf-artwork" aria-busy={status === 'loading'}>
    <svg className="mushaf-page-image" viewBox={page <= 2 ? '40 0 944 840' : '40 0 944 1656'} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Printed Madani Quran, page ${page}`} style={{ opacity: status === 'loaded' ? 1 : 0 }}>
      <title>{`Printed Madani Quran, page ${page}`}</title>
      <image key={attempt} href={printedMushafImageUrl(page)} width={1024} height={1656} onLoad={() => setStatus('loaded')} onError={() => setStatus('error')} />
    </svg>
    {status === 'loading' && <p className="mushaf-image-status" role="status">Opening printed page {page}?</p>}
    {status === 'error' && <div className="mushaf-image-status" role="alert"><p>The printed page could not load.</p><button className="outline-button" onClick={() => { setStatus('loading'); setAttempt(value => value + 1); }}>Try again</button></div>}
  </div>;
}
