import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookmarkSimple, CaretLeft, CaretRight } from 'phosphor-react';
import { prayerGuideTopics } from './prayerGuideData';
import { wuduGuideTopics } from './wuduGuideData';
import { guideUrdu } from './guideUrdu';
import { useSaved } from './useJournal';
import './prayer-guide.css';
import { useNavigationState } from '../../hooks/useNavigationState';

function GuidePattern() {
  return <svg className="prayer-guide-pattern" viewBox="0 0 120 120" fill="none" stroke="currentColor" aria-hidden="true">
    {Array.from({ length: 12 }, (_, index) => <ellipse key={index} cx="60" cy="38" rx="12" ry="30" transform={`rotate(${index * 30} 60 60)`} />)}
    <circle cx="60" cy="60" r="18" /><circle cx="60" cy="60" r="54" />
  </svg>;
}

export default function PrayerGuide({ onBack, kind = 'prayer' }: { onBack: () => void; kind?: 'prayer' | 'wudu' }) {
  const topics = kind === 'wudu' ? wuduGuideTopics : prayerGuideTopics;
  const title = kind === 'wudu' ? 'Wudu Guide' : 'Prayer Guide';
  const note = kind === 'wudu'
    ? 'A short introduction to Sunni wudu with Quran and hadith references. Some details and rulings differ between schools; follow your trusted teacher for those practices.'
    : 'A short introduction to Sunni salah. Some details differ between schools; follow your trusted teacher for those practices.';
  const [selected, navigateSelected, backSelected] = useNavigationState<number | null>(kind === 'wudu' ? 'wuduTopic' : 'guideTopic', null);
  const setSelected = (action: Parameters<typeof navigateSelected>[0]) => {
    const value = typeof action === 'function' ? action(selected) : action;
    if (value === null && selected !== null) backSelected(null);
    else navigateSelected(value);
  };
  const [savedOnly, setSavedOnly] = useState(false);
  const [savedCards, setSavedCards] = useSaved<string[]>(`salah-${kind}-guide-bookmarks`, []);
  const heading = useRef<HTMLHeadingElement>(null);
  const topic = selected === null ? null : topics[selected];
  const visibleTopics = topics.map((item, index) => ({ ...item, index }))
    .filter(item => !savedOnly || item.cards.some(card => savedCards.includes(card.id)));

  useEffect(() => {
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [selected, savedOnly]);

  const toggleSaved = (id: string) => setSavedCards(previous => previous.includes(id)
    ? previous.filter(value => value !== id) : [...previous, id]);
  const goBack = () => {
    if (topic) setSelected(null);
    else if (savedOnly) setSavedOnly(false);
    else onBack();
  };

  return <div className="mobile-page prayer-guide-page">
    <header className="mobile-header prayer-guide-header">
      <button className="icon-button back-button" aria-label={topic ? 'Back to guide topics' : savedOnly ? 'Back to all topics' : 'Back to profile'} onClick={goBack}><ArrowLeft size={19} /></button>
      <h1 ref={heading} tabIndex={-1}>{topic?.title ?? (savedOnly ? 'Saved topics' : title)}</h1>
      <button className="icon-button guide-saved-toggle" aria-label={savedOnly ? 'Show all guide topics' : 'Show saved guide topics'} aria-pressed={savedOnly} onClick={() => { setSelected(null); setSavedOnly(value => !value); }}>
        <BookmarkSimple size={22} weight={savedOnly ? 'fill' : 'regular'} />
      </button>
    </header>

    <div className="prayer-guide-surface">
      {topic ? <>
        <p className="prayer-guide-eyebrow">{title} · Topic {selected! + 1} of {topics.length}</p>
        <div className="prayer-guide-readings">
          {topic.cards.map(card => <article className="prayer-guide-reading" key={card.id}>
            <GuidePattern />
            <button className="guide-card-bookmark" aria-label={`${savedCards.includes(card.id) ? 'Unsave' : 'Save'} ${card.title}`} aria-pressed={savedCards.includes(card.id)} onClick={() => toggleSaved(card.id)}>
              <BookmarkSimple size={20} weight={savedCards.includes(card.id) ? 'fill' : 'regular'} />
            </button>
            <h2>{card.title}</h2>
            {card.arabic && <>
              {card.excerpt && <span className="guide-excerpt-label">Quran excerpt</span>}
              <p className="guide-reading-arabic" lang="ar" dir="rtl">{card.arabic}</p>
              <p className="guide-reading-transliteration">{card.transliteration}</p>
              <p className="guide-reading-meaning">{card.meaning}</p>
              {guideUrdu[card.id]?.meaning && <p className="guide-reading-urdu guide-meaning-urdu" lang="ur" dir="rtl">{guideUrdu[card.id].meaning}</p>}
            </>}
            <p className="guide-reading-copy">{card.text}</p>
            {guideUrdu[card.id] && <p className="guide-reading-urdu" lang="ur" dir="rtl">{guideUrdu[card.id].text}</p>}
            {card.rows && <table className="guide-rakah-table">
              <caption>Fard rak‘ahs for a resident</caption>
              <thead><tr><th scope="col">Prayer</th><th scope="col">Rak‘ahs</th></tr></thead>
              <tbody>{card.rows.map(([name, count]) => <tr key={name}><th scope="row">{name}</th><td>{count}</td></tr>)}</tbody>
            </table>}
            <div className="guide-reading-sources">{card.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}<ArrowUpRight size={12} aria-hidden="true" /></a>)}</div>
          </article>)}
        </div>
      </> : <>
        <p className="prayer-guide-eyebrow">{savedOnly ? 'Keep your reminders close' : 'Learn at your own pace'}</p>
        <ol className="prayer-guide-topics">
          {visibleTopics.map(item => <li key={item.id}>
            <button onClick={() => setSelected(item.index)}>
              <span className="guide-topic-number">{item.index + 1}.</span><span>{item.title}</span>
              {item.cards.some(card => savedCards.includes(card.id)) ? <BookmarkSimple size={16} weight="fill" aria-label="Contains saved cards" /> : <CaretRight size={16} aria-hidden="true" />}
            </button>
          </li>)}
        </ol>
        {savedOnly && visibleTopics.length === 0 && <div className="guide-empty">
          <BookmarkSimple size={32} /><h2>Your saved topics will appear here</h2><p>Open a topic and tap a card’s bookmark to save it.</p>
          <button className="outline-button" onClick={() => setSavedOnly(false)}>Explore the guide</button>
        </div>}
        {!savedOnly && <p className="prayer-guide-note">{note}</p>}
      </>}
    </div>

    {(topic || visibleTopics.length > 0) && <nav className="prayer-guide-footer" aria-label="Guide navigation">
      {topic ? <>
        <button className="guide-previous" disabled={selected === 0} aria-label="Previous topic" onClick={() => setSelected(value => Math.max(0, (value ?? 0) - 1))}><CaretLeft size={20} /></button>
        <button className="guide-next" onClick={() => {
          if (selected === topics.length - 1) { setSelected(null); setSavedOnly(false); }
          else setSelected(value => (value ?? 0) + 1);
        }}>
          <span><small>{selected === topics.length - 1 ? 'You’ve reached the end' : 'Up next'}</small>{selected === topics.length - 1 ? 'Back to all topics' : topics[selected! + 1].title}</span>
          <CaretRight size={20} />
        </button>
      </> : <button className="guide-start" onClick={() => setSelected(visibleTopics[0].index)}>Get started <CaretRight size={20} /></button>}
    </nav>}
  </div>;
}
