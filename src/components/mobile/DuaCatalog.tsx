import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CaretRight, CloudSun, Heart, House, Leaf, MagnifyingGlass, AirplaneTilt, HandsClapping, Sun, FirstAid, Users, Star, Sparkle } from 'phosphor-react';
import { useNavigationState } from '../../hooks/useNavigationState';
import { loadBilingualTopics, loadBilingualDua } from '../../utils/duaApi';
import type { ApiDua, DuaTopic } from '../../utils/duaApi';
import { useSaved } from './useJournal';
import './dua-catalog.css';

const categories = [
  { id: 'all', title: 'All Duas', icon: BookOpen, color: 'mint', slugs: [] },
  { id: 'morning', title: 'Morning & Evening', icon: CloudSun, color: 'blue', slugs: ['morning-and-evening', 'sleep'] },
  { id: 'prayer', title: 'Prayer', icon: HandsClapping, color: 'mint', slugs: ['salah', 'witr-and-other', 'adhaan-and-iqamah', 'ablution-and-bath', 'mosque'] },
  { id: 'praise', title: 'Praising Allah', icon: Sparkle, color: 'peach', slugs: ['greatest-name-of-allah', 'duas-excellence', 'duas-importance', 'time-of-dua', 'dua-acceptance'] },
  { id: 'hajj', title: 'Hajj & Umrah', icon: Star, color: 'gold', slugs: ['hajj-and-umrah', 'sacrifice'] },
  { id: 'travel', title: 'Travel', icon: AirplaneTilt, color: 'rose', slugs: ['travel'] },
  { id: 'joy', title: 'Joy & Distress', icon: Heart, color: 'peach', slugs: ['anxiety', 'danger', 'debt', 'forgiveness', 'evil-protection'] },
  { id: 'nature', title: 'Nature', icon: Leaf, color: 'mint', slugs: ['rainnature', 'animals'] },
  { id: 'manners', title: 'Good Etiquette', icon: Sun, color: 'lilac', slugs: ['manners', 'gathering', 'condemnationpraise', 'when-to-say-what'] },
  { id: 'family', title: 'Home & Family', icon: House, color: 'rose', slugs: ['home', 'family', 'marriage', 'cloths', 'toilet'] },
  { id: 'food', title: 'Food & Drink', icon: Users, color: 'gold', slugs: ['food', 'fasting', 'eid'] },
  { id: 'health', title: 'Sickness & Death', icon: FirstAid, color: 'blue', slugs: ['sickness', 'jinndiseases', 'grave-funeral'] },
];

export default function DuaCatalog({ savedOnly = false, onExit }: { savedOnly?: boolean; onExit?: () => void }) {
  const [categoryId, chooseCategory, backCategory] = useNavigationState<string | null>('duaCategory', null);
  const [topicId, chooseTopic, backTopic] = useNavigationState<number | null>('duaTopic', null);
  const [topics, setTopics] = useState<DuaTopic[]>([]);
  const [duas, setDuas] = useState<ApiDua[]>([]);
  const [favorites, setFavorites] = useSaved<ApiDua[]>('salah-api-favorite-duas-v1', []);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const category = categories.find(item => item.id === categoryId);
  const topic = topics.find(item => item.id === topicId);

  useEffect(() => {
    if (savedOnly) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    loadBilingualTopics(controller.signal)
      .then(setTopics)
      .catch(() => { if (!controller.signal.aborted) setError('Unable to load dua topics. Check your connection and try again.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry, savedOnly]);

  useEffect(() => {
    if (!topic || savedOnly) return;
    const controller = new AbortController();
    setDuas([]); setLoading(true); setError('');
    // Limit concurrent requests for large topics.
    async function load() {
      const result: ApiDua[] = [];
      const ids = [...new Set(topic!['dua-ids'])];
      for (let i = 0; i < ids.length; i += 6) {
        result.push(...await Promise.all(ids.slice(i, i + 6).map(id => loadBilingualDua(id, controller.signal))));
      }
      if (!controller.signal.aborted) setDuas(result);
    }
    load().catch(() => { if (!controller.signal.aborted) setError('Unable to load these duas. Check your connection and try again.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [topic, savedOnly, retry]);

  const missingSavedTranslations = savedOnly ? favorites.filter(dua => !dua.urduTranslation).map(dua => dua.dua_id).join(',') : '';
  useEffect(() => {
    if (!missingSavedTranslations) return;
    const controller = new AbortController();
    async function enrichSaved() {
      const ids = missingSavedTranslations.split(',').map(Number);
      const updates = new Map<number, ApiDua>();
      for (let i = 0; i < ids.length; i += 6) {
        const results = await Promise.allSettled(ids.slice(i, i + 6).map(id => loadBilingualDua(id, controller.signal)));
        if (controller.signal.aborted) return;
        for (const result of results) if (result.status === 'fulfilled') updates.set(result.value.dua_id, result.value);
      }
      if (updates.size) setFavorites(previous => previous.map(dua => updates.get(dua.dua_id) || dua));
    }
    void enrichSaved();
    return () => controller.abort();
  }, [missingSavedTranslations, setFavorites]);

  const needle = query.trim().toLowerCase();
  const filteredTopics = topics.filter(item => (!category || category.id === 'all' || category.slugs.includes(item.category)) && `${item.title} ${item.urduTitle || ''} ${item.category}`.toLowerCase().includes(needle));
  const displayed = (savedOnly ? favorites : duas).filter(item => `${item.title} ${item.urduTitle || ''} ${item.arabic} ${item.translation} ${item.urduTranslation || ''} ${item.transliteration || ''}`.toLowerCase().includes(needle));
  const showDuas = savedOnly || Boolean(topic);
  function toggleFavorite(dua: ApiDua) {
    setFavorites(previous => previous.some(item => item.dua_id === dua.dua_id) ? previous.filter(item => item.dua_id !== dua.dua_id) : [...previous, dua]);
  }

  return <section className="dua-catalog" aria-label={savedOnly ? 'Saved duas' : 'Dua collection'}>
    <div className="dua-catalog-heading">
      {!savedOnly && (categoryId !== null || topicId !== null || onExit) && <button className="icon-button" aria-label={topicId !== null ? 'Back to topics' : categoryId !== null ? 'Back to categories' : 'Back to daily duas'} onClick={() => {
        setQuery('');
        if (topicId !== null) backTopic(null);
        else if (categoryId !== null) backCategory(null);
        else onExit?.();
        window.scrollTo({ top: 0 });
      }}><ArrowLeft size={20}/></button>}
      <h2>{savedOnly ? 'Saved duas' : topic?.title || category?.title || 'All Duas'}</h2>
      {!category && !savedOnly && <span className="small-pill">Everyday remembrance</span>}
    </div>
    <label className="search-field"><MagnifyingGlass size={18}/><input aria-label="Search dua collection" placeholder={showDuas ? 'Search these duas' : category ? 'Search topics' : 'Find a dua or topic'} value={query} onChange={event => setQuery(event.target.value)}/></label>
    {!savedOnly && !category && !topic && !needle && <div className="dua-category-grid">{categories.map(item => <button key={item.id} className="dua-category-card" onClick={() => { chooseCategory(item.id); setQuery(''); }}><strong>{item.title}</strong><span className={`dua-illustration ${item.color}`}><item.icon size={32} weight="duotone"/></span></button>)}</div>}
    {!savedOnly && loading && <p className="loading-state" role="status">Loading {topic ? 'duas' : 'dua topics'}…</p>}
    {!savedOnly && error && <div className="empty-state" role="alert"><p>{error}</p><button className="outline-button" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
    {!savedOnly && !loading && !error && !topic && (category || needle) && <div className="dua-list">{filteredTopics.map(item => <button className="dua-row" key={item.id} onClick={() => { chooseTopic(item.id); setQuery(''); }}><span className="dua-illustration mint"><BookOpen size={25} weight="duotone"/></span><span><strong>{item.title}<span className="dua-urdu-name" lang="ur" dir="rtl">{item.urduTitle}</span></strong><small>{item['dua-ids'].length} duas</small></span><CaretRight size={16}/></button>)}{!filteredTopics.length && <p className="empty-state">No topics found. Try another word.</p>}</div>}
    {showDuas && (!loading || savedOnly) && (!error || savedOnly) && <div className="dua-reading-list">{displayed.map(dua => {
      const saved = favorites.some(item => item.dua_id === dua.dua_id);
      return <article className="dua-detail" key={dua.dua_id}><span className="small-pill">Dua {dua.dua_id}</span><h3>{dua.title}<UrduDuaName dua={dua}/></h3>{dua.introduction && <p className="dua-instruction">{dua.introduction}</p>}<p className="arabic-text" lang="ar" dir="rtl">{dua.arabic}</p>{dua.transliteration && <p className="dua-transliteration">{dua.transliteration}</p>}<p className="dua-translation" lang="en">{dua.translation}</p>{dua.urduTranslation && <p className="dua-translation dua-translation-urdu" lang="ur" dir="rtl">{dua.urduTranslation}</p>}{dua.reference && <span className="source-label">{dua.reference}</span>}<button className="outline-button" aria-pressed={saved} onClick={() => toggleFavorite(dua)}><Heart size={18} weight={saved ? 'fill' : 'regular'}/>{saved ? 'Saved to favorites' : 'Save this dua'}</button></article>;
    })}{!displayed.length && <div className="empty-state"><Heart size={28}/><h3>{needle ? 'No matching duas' : 'Keep a dua close'}</h3><p>{needle ? 'Try another word.' : 'Save a dua to read it here, even offline.'}</p></div>}</div>}
    <p className="dua-data-credit">Dua collection · <a href="https://github.com/islamicapi/masnun-dua" target="_blank" rel="noreferrer">IslamicAPI</a></p>
  </section>;
}

function UrduDuaName({ dua }: { dua: ApiDua }) {
  const [title, setTitle] = useState(dua.urduTitle || '');
  useEffect(() => {
    if (dua.urduTitle) return;
    const controller = new AbortController();
    loadBilingualDua(dua.dua_id, controller.signal)
      .then(value => { if (!controller.signal.aborted) setTitle(value.urduTitle || ''); })
      .catch(() => { /* Previously saved duas remain readable offline. */ });
    return () => controller.abort();
  }, [dua.dua_id, dua.urduTitle]);
  return title ? <span className="dua-urdu-name" lang="ur" dir="rtl">{title}</span> : null;
}
