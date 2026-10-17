import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookBookmark, BookmarkSimple, CaretRight, MagnifyingGlass, BookOpen } from 'phosphor-react';
import useQuranData from '../../hooks/useQuranData';
import type { Ayah, SurahMeta } from '../../hooks/useQuranData';
import { useSaved } from './useJournal';
import MobileJuz from './MobileJuz';
import QuranPlayer from './QuranPlayer';
import MushafReader from './MushafReader';
import { validMushafPage } from '../../utils/mushafApi';
import { useNavigationState } from '../../hooks/useNavigationState';

type Reading = { surah: number; name: string; ayah: number; total: number };
export default function MobileQuran({ readToday = [], onMarkRead }: { readToday?: string[]; onMarkRead?: (surah: number, ayah: number) => void }) {
  const { surahList, loadingList, error, fetchSurah } = useQuranData();
  const [mushafPage, openMushaf, backMushaf] = useNavigationState<number | null>('quranMushafPage', null);
  const [lastMushafPage, setLastMushafPage] = useSaved('salah-mushaf-last-page', 1);
  const [tab, setTab] = useNavigationState('quranTab', 'Surah');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [reading, navigateReading, backReading] = useNavigationState<{ surah: SurahMeta; ayah: number } | null>('quranReading', null);
  const selected = reading?.surah ?? null;
  const setSelected = (value: SurahMeta | null) => value === null ? navigateReading(null, true) : navigateReading({ surah: value, ayah: 1 });
  const [data, setData] = useState<{arabic: Ayah[]; translation?: Ayah[]} | null>(null);
  const [busy, setBusy] = useState(false);
  const [readerError, setReaderError] = useState('');
  const [last, setLast] = useSaved<Reading | null>('salah-last-reading', null);
  const [bookmarks, setBookmarks] = useSaved<Reading[]>('salah-quran-bookmarks', []);
  const request = useRef(0);
  const verseRefs = useRef<Record<number, HTMLElement | null>>({});
  const [attempt, setAttempt] = useState(0);
  function openSurah(surah: SurahMeta, ayah = 1) {
    if (reading?.surah.number === surah.number && reading.ayah === ayah) setAttempt(value => value + 1);
    else navigateReading({ surah, ayah });
  }
  useEffect(() => {
    if (!reading) return;
    const { surah, ayah } = reading;
    let cancelled = false;
    const id = ++request.current;
    setData(null); setReaderError(''); setBusy(true); window.scrollTo({top:0});
    async function load() {
      try {
        const result = await fetchSurah(surah.number);
        if (cancelled || id !== request.current) return;
        if (!result?.arabic.length) throw new Error('No verses returned');
        setData(result);
        if (ayah > 1) window.setTimeout(() => {
          if (!cancelled) verseRefs.current[ayah]?.scrollIntoView({block:'center'});
        }, 100);
      } catch { if (!cancelled && id === request.current) setReaderError('The verses could not be loaded. Check your connection and try again.'); }
      finally { if (!cancelled && id === request.current) setBusy(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [reading, fetchSurah, attempt]);
  function resume(reading: Reading) {
    const surah = surahList.find(item => item.number === reading.surah);
    if (surah) void openSurah(surah, reading.ayah);
  }
  const savedRow = (reading: Reading) => <button className="reading-card" key={`${reading.surah}-${reading.ayah}`} onClick={() => resume(reading)} disabled={loadingList || !!error}><span><strong>{reading.name}</strong><small>Ayah {reading.ayah} of {reading.total}</small></span><ArrowRight size={18}/></button>;
  if (mushafPage !== null) return <MushafReader onLoaded={setLastMushafPage} page={mushafPage} onPage={page => openMushaf(page, true)} onBack={() => backMushaf(null)} surahs={surahList} readToday={readToday} onMarkRead={onMarkRead}/>;
  return <div className={`mobile-page quran-page ${selected ? 'has-player' : ''}`}>{selected && <QuranPlayer key={selected.number} surah={selected.number} name={selected.englishName}/>}<div className="page-title">{selected && <button className="icon-button" aria-label="Back to surahs" onClick={() => { request.current++; backReading(null); setData(null); }}><ArrowLeft size={20}/></button>}<h1>{selected ? selected.englishName : 'Quran'}</h1><div className="title-actions"><button className="icon-button" aria-label="Show bookmarks" onClick={() => { request.current++; setSelected(null); setTab('Saved'); }}><BookmarkSimple size={20}/></button><button className="icon-button" aria-label="Search Quran surahs" onClick={() => { request.current++; setSelected(null); setSearching(v=>!v); setTab('Surah'); }}><MagnifyingGlass size={20}/></button></div></div>
    {selected ? <><div className="surah-reader-heading"><p lang="ar" dir="rtl">{selected.name}</p><span>{selected.numberOfAyahs} verses · Surah {selected.number}</span></div>{busy && <p className="loading-state" role="status">Opening your surah…</p>}{readerError && <div className="empty-state" role="alert"><p>{readerError}</p><button className="outline-button" onClick={() => void openSurah(selected)}>Try again</button></div>}{data?.arabic.map((ayah,index)=>{const reading = {surah:selected.number,name:selected.englishName,ayah:ayah.numberInSurah,total:selected.numberOfAyahs}; const saved = bookmarks.some(b=>b.surah === selected.number && b.ayah === ayah.numberInSurah); return <article className="ayah-block" key={ayah.number} ref={el=>{verseRefs.current[ayah.numberInSurah]=el;}}><div className="ayah-actions"><span>{selected.number}:{ayah.numberInSurah}</span><div><button aria-label={`Bookmark verse ${ayah.numberInSurah}`} aria-pressed={saved} onClick={()=>setBookmarks(previous=>saved ? previous.filter(b=>!(b.surah === reading.surah && b.ayah === reading.ayah)) : [...previous,reading])}><BookmarkSimple size={19} weight={saved ? 'fill' : 'regular'}/></button>{onMarkRead && <button className={readToday.includes(`${reading.surah}:${reading.ayah}`) ? 'marked-read' : ''} aria-pressed={readToday.includes(`${reading.surah}:${reading.ayah}`)} onClick={() => { onMarkRead(reading.surah, reading.ayah); setLast(reading); }}><BookOpen size={17}/>{readToday.includes(`${reading.surah}:${reading.ayah}`) ? 'Read today' : 'Mark read'}</button>}<button className={last?.surah === reading.surah && last.ayah === reading.ayah ? 'marked-read' : ''} onClick={()=>setLast(reading)}><BookBookmark size={17}/> Last read</button></div></div><p className="arabic-text" lang="ar" dir="rtl">{ayah.text}</p>{data.translation?.[index] ? <p className="verse-translation">{data.translation[index].text}</p> : <p className="verse-translation">Translation unavailable.</p>}</article>;})}</> : <>
      <p className="page-subtitle">Let every verse bring you closer.</p>{last && <section className="continue-reading"><div><BookOpen size={20}/><span>Continue your journey</span></div>{savedRow(last)}<div className="reading-progress"><i style={{width:`${last.ayah / last.total * 100}%`}}/></div></section>}
      <button className="mushaf-open-button" onClick={() => openMushaf(validMushafPage(lastMushafPage) ? lastMushafPage : 1)}><span><BookOpen size={25} weight="duotone"/></span><span><strong>Open Mushaf</strong><small>Read Quran by page ? Continue at page {validMushafPage(lastMushafPage) ? lastMushafPage : 1}</small></span><CaretRight size={18}/></button>
      <div className="segment-control">{['Surah','Juz','Saved','Progress'].map(t=><button key={t} className={tab === t ? 'active' : ''} aria-pressed={tab === t} onClick={()=>setTab(t)}>{t}</button>)}</div>
      {tab === 'Juz' && <MobileJuz onRead={(surah, ayah) => void openSurah(surah, ayah)}/>}
      {error && <div className="empty-state" role="alert"><p>Unable to load the Quran. Please check your connection.</p><button className="outline-button" onClick={()=>window.location.reload()}>Try again</button></div>}
      {tab === 'Surah' && <>{searching && <label className="search-field"><MagnifyingGlass size={18}/><input autoFocus aria-label="Search surahs" placeholder="Search name or surah number" value={query} onChange={e=>setQuery(e.target.value)}/></label>}{loadingList && <p className="loading-state" role="status">Loading the surahs…</p>}<div className="surah-list-mobile">{surahList.filter(s=>`${s.englishName} ${s.name} ${s.number}`.toLowerCase().includes(query.toLowerCase())).map(s=><button key={s.number} onClick={()=>void openSurah(s)}><span className="surah-number">{s.number}</span><span><strong>{s.englishName}</strong><small>{s.numberOfAyahs} verses</small></span><span className="surah-arabic" lang="ar">{s.name}</span><CaretRight size={14}/></button>)}</div>{!loadingList && !error && !surahList.some(s=>`${s.englishName} ${s.name} ${s.number}`.toLowerCase().includes(query.toLowerCase())) && <p className="empty-state">No surahs found.</p>}</>}
      {tab === 'Saved' && <div className="saved-readings">{bookmarks.length ? bookmarks.map(savedRow) : <div className="empty-state"><BookmarkSimple size={32}/><h2>Your favorite verses</h2><p>Bookmark a verse while reading to keep it here.</p></div>}</div>}
      {tab === 'Progress' && <section className="quran-progress-card"><BookOpen size={36}/><h2>Your reading journey</h2>{last ? <><p>You last marked <strong>{last.name}, ayah {last.ayah}</strong>.</p><div className="large-progress">{Math.round(last.ayah / last.total * 100)}<span>% of this surah</span></div>{savedRow(last)}</> : <p>Open a surah and tap “Last read” on a verse to save your place.</p>}<span className="source-label">Progress is saved on this device</span></section>}
    </>}
  </div>;
}
