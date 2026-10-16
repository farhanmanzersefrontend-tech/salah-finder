import { useEffect, useState } from 'react';
import { CaretRight, ArrowLeft } from 'phosphor-react';
import type { SurahMeta } from '../../hooks/useQuranData';
import { useNavigationState } from '../../hooks/useNavigationState';

export default function MobileJuz({ onRead }: { onRead: (surah: SurahMeta, ayah: number) => void }) {
  const [selected, navigateSelected, backSelected] = useNavigationState<number | null>('quranJuz', null);
  const setSelected = (value: number | null) => value === null ? backSelected(null) : navigateSelected(value);
  const [entries, setEntries] = useState<{ surah: SurahMeta; first: number; last: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setBusy(true); setError(''); setEntries([]);
    async function load() {
      try {
        const response = await fetch(`https://api.alquran.cloud/v1/juz/${selected}/quran-uthmani`, { signal: controller.signal });
        if (!response.ok) throw new Error('Unable to load juz');
        const body = await response.json();
        const groups = new Map<number, { surah: SurahMeta; first: number; last: number }>();
        for (const ayah of body.data.ayahs as { surah: SurahMeta; numberInSurah: number }[]) {
          const group = groups.get(ayah.surah.number);
          if (group) group.last = ayah.numberInSurah;
          else groups.set(ayah.surah.number, { surah: ayah.surah, first: ayah.numberInSurah, last: ayah.numberInSurah });
        }
        setEntries([...groups.values()]);
      } catch { if (!controller.signal.aborted) setError('Unable to load this juz. Please try again.'); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }
    void load();
    return () => controller.abort();
  }, [selected, attempt]);
  return <section className="juz-list">{selected ? <><button className="juz-back" onClick={() => setSelected(null)}><ArrowLeft size={16}/> All juz <strong>Juz {selected}</strong></button>{busy && <p className="loading-state" role="status">Loading Juz {selected}…</p>}{error && <div className="empty-state" role="alert"><p>{error}</p><button className="outline-button" onClick={() => setAttempt(v => v + 1)}>Try again</button></div>}<div className="surah-list-mobile">{entries.map(entry => <button key={entry.surah.number} onClick={() => onRead(entry.surah, entry.first)}><span className="surah-number">{entry.surah.number}</span><span><strong>{entry.surah.englishName}</strong><small>Ayah {entry.first}–{entry.last}</small></span><span className="surah-arabic" lang="ar">{entry.surah.name}</span><CaretRight size={14}/></button>)}</div></> : <div className="surah-list-mobile">{Array.from({ length: 30 }, (_, index) => <button key={index} onClick={() => setSelected(index + 1)}><span className="surah-number">{index + 1}</span><span><strong>Juz {index + 1}</strong><small>Explore this part</small></span><CaretRight className="juz-chevron" size={14}/></button>)}</div>}</section>;
}
