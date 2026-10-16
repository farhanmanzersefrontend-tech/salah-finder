import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookBookmark, BookmarkSimple, CaretRight, MagnifyingGlass, BookOpen } from 'phosphor-react';
import useQuranData from '../../hooks/useQuranData';
import type { Ayah, SurahMeta } from '../../hooks/useQuranData';
import { useSaved } from './useJournal';
import MobileJuz from './MobileJuz';

type Reading = { surah: number; name: string; ayah: number; total: number };
export default function MobileQuran() {
  const { surahList, loadingList, error, fetchSurah } = useQuranData();
  const [tab, setTab] = useState('Surah');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SurahMeta | null>(null);
  const [data, setData] = useState<{arabic: Ayah[]; translation?: Ayah[]} | null>(null);
  const [busy, setBusy] = useState(false);
  const [readerError, setReaderError] = useState('');
  const [last, setLast] = useSaved<Reading | null>('salah-last-reading', null);
  const [bookmarks, setBookmarks] = useSaved<Reading[]>('salah-quran-bookmarks', []);
  const request = useRef(0);
  const verseRefs = useRef<Record<number, HTMLElement | null>>({});
  useEffect(() => () => { request.current++; }, []);
  async function openSurah(surah: SurahMeta, ayah = 1) {
    const id = ++request.current;
    setSelected(surah); setData(null); setReaderError(''); setBusy(true); window.scrollTo({top:0});
    try {
      const result = await fetchSurah(surah.number);
      if (id !== request.current) return;
      if (!result?.arabic.length) throw new Error('No verses returned');
      setData(result);
      if (ayah > 1) window.setTimeout(() => verseRefs.current[ayah]?.scrollIntoView({block:'center'}), 100);
    } catch { if (id === request.current) setReaderError('The verses could not be loaded. Check your connection and try again.'); }
    finally { if (id === request.current) setBusy(false); }
  }
  function resume(reading: Reading) {
    const surah = surahList.find(item => item.number === reading.surah);
    if (surah) void openSurah(surah, reading.ayah);
  }
  const savedRow = (reading: Reading) => <button className="reading-card" key={`${reading.surah}-${reading.ayah}`} onClick={() => resume(reading)} disabled={loadingList || !!error}><span><strong>{reading.name}</strong><small>Ayah {reading.ayah} of {reading.total}</small></span><ArrowRight size={18}/></button>;
  return <div className="mobile-page quran-page"><div className="page-title">{selected && <button className="icon-button" aria-label="Back to surahs" onClick={() => { request.current++; setSelected(null); setData(null); }}><ArrowLeft size={20}/></button>}<h1>{selected ? selected.englishName : 'Quran'}</h1><div className="title-actions"><button className="icon-button" aria-label="Show bookmarks" onClick={() => { request.current++; setSelected(null); setTab('Saved'); }}><BookmarkSimple size={20}/></button><button className="icon-button" aria-label="Search Quran surahs" onClick={() => { request.current++; setSelected(null); setSearching(v=>!v); setTab('Surah'); }}><MagnifyingGlass size={20}/></button></div></div>
    {selected ? <><div className="surah-reader-heading"><p lang="ar" dir="rtl">{selected.name}</p><span>{selected.numberOfAyahs} verses · Surah {selected.number}</span></div>{busy && <p className="loading-state" role="status">Opening your surah…</p>}{readerError && <div className="empty-state" role="alert"><p>{readerError}</p><button className="outline-button" onClick={() => void openSurah(selected)}>Try again</button></div>}{data?.arabic.map((ayah,index)=>{const reading = {surah:selected.number,name:selected.englishName,ayah:ayah.numberInSurah,total:selected.numberOfAyahs}; const saved = bookmarks.some(b=>b.surah === selected.number && b.ayah === ayah.numberInSurah); return <article className="ayah-block" key={ayah.number} ref={el=>{verseRefs.current[ayah.numberInSurah]=el;}}><div className="ayah-actions"><span>{selected.number}:{ayah.numberInSurah}</span><div><button aria-label={`Bookmark verse ${ayah.numberInSurah}`} aria-pressed={saved} onClick={()=>setBookmarks(previous=>saved ? previous.filter(b=>!(b.surah === reading.surah && b.ayah === reading.ayah)) : [...previous,reading])}><BookmarkSimple size={19} weight={saved ? 'fill' : 'regular'}/></button><button className={last?.surah === reading.surah && last.ayah === reading.ayah ? 'marked-read' : ''} onClick={()=>setLast(reading)}><BookBookmark size={17}/> Last read</button></div></div><p className="arabic-text" lang="ar" dir="rtl">{ayah.text}</p>{data.translation?.[index] ? <p className="verse-translation">{data.translation[index].text}</p> : <p className="verse-translation">Translation unavailable.</p>}</article>;})}{data && <audio className="quran-audio" controls preload="none" aria-label={`${selected.englishName} recitation`} src={`https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${selected.number}.mp3`}/>}</> : <>
      <p className="page-subtitle">Let every verse bring you closer.</p>{last && <section className="continue-reading"><div><BookOpen size={20}/><span>Continue your journey</span></div>{savedRow(last)}<div className="reading-progress"><i style={{width:`${last.ayah / last.total * 100}%`}}/></div></section>}
      <div className="segment-control">{['Surah','Juz','Saved','Progress'].map(t=><button key={t} className={tab === t ? 'active' : ''} aria-pressed={tab === t} onClick={()=>setTab(t)}>{t}</button>)}</div>
      {tab === 'Juz' && <MobileJuz onRead={(surah, ayah) => void openSurah(surah, ayah)}/>}
      {error && <div className="empty-state" role="alert"><p>Unable to load the Quran. Please check your connection.</p><button className="outline-button" onClick={()=>window.location.reload()}>Try again</button></div>}
      {tab === 'Surah' && <>{searching && <label className="search-field"><MagnifyingGlass size={18}/><input autoFocus aria-label="Search surahs" placeholder="Search name or surah number" value={query} onChange={e=>setQuery(e.target.value)}/></label>}{loadingList && <p className="loading-state" role="status">Loading the surahs…</p>}<div className="surah-list-mobile">{surahList.filter(s=>`${s.englishName} ${s.name} ${s.number}`.toLowerCase().includes(query.toLowerCase())).map(s=><button key={s.number} onClick={()=>void openSurah(s)}><span className="surah-number">{s.number}</span><span><strong>{s.englishName}</strong><small>{s.numberOfAyahs} verses</small></span><span className="surah-arabic" lang="ar">{s.name}</span><CaretRight size={14}/></button>)}</div>{!loadingList && !error && !surahList.some(s=>`${s.englishName} ${s.name} ${s.number}`.toLowerCase().includes(query.toLowerCase())) && <p className="empty-state">No surahs found.</p>}</>}
      {tab === 'Saved' && <div className="saved-readings">{bookmarks.length ? bookmarks.map(savedRow) : <div className="empty-state"><BookmarkSimple size={32}/><h2>Your favorite verses</h2><p>Bookmark a verse while reading to keep it here.</p></div>}</div>}
      {tab === 'Progress' && <section className="quran-progress-card"><BookOpen size={36}/><h2>Your reading journey</h2>{last ? <><p>You last marked <strong>{last.name}, ayah {last.ayah}</strong>.</p><div className="large-progress">{Math.round(last.ayah / last.total * 100)}<span>% of this surah</span></div>{savedRow(last)}</> : <p>Open a surah and tap “Last read” on a verse to save your place.</p>}<span className="source-label">Progress is saved on this device</span></section>}
    </>}
  </div>;
}
