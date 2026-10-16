import { useEffect, useRef, useState } from 'react';
import { ArrowClockwise, ArrowCounterClockwise, CircleNotch, Pause, Play, SpeakerHigh, SpeakerSlash } from 'phosphor-react';
import { Landscape } from './Artwork';
import { useSaved } from './useJournal';
import { QURAN_RECITERS, quranSurahAudio } from '../../utils/quranReciters';
import type { QuranReciter } from '../../utils/quranReciters';
import './quran-player.css';

function audioTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

export default function QuranPlayer({ surah, name }: { surah: number; name: string }) {
  const [reciterId, setReciterId] = useSaved('salah-quran-reciter', 'ar.alafasy');
  const reciter = QURAN_RECITERS.find(item => item.id === reciterId) ?? QURAN_RECITERS[0];
  return <QuranAudioPlayer key={`${surah}-${reciter.id}`} surah={surah} name={name} reciter={reciter} onReciterChange={setReciterId} />;
}

function QuranAudioPlayer({ surah, name, reciter, onReciterChange }: {
  surah: number;
  name: string;
  reciter: QuranReciter;
  onReciterChange: (id: string) => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const panel = useRef<HTMLElement>(null);
  const mounted = useRef(false);
  const [height, setHeight] = useState(160);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState('');
  const canSeek = Number.isFinite(duration) && duration > 0;
  const source = quranSurahAudio(reciter, surah);

  useEffect(() => {
    mounted.current = true;
    const media = audio.current;
    // Restore the source if React re-runs the effect after its cleanup in development.
    if (media && !media.getAttribute('src')) media.src = source;
    const element = panel.current;
    const observer = new ResizeObserver(() => {
      if (element) setHeight(element.getBoundingClientRect().height);
    });
    if (element) observer.observe(element);
    return () => {
      mounted.current = false;
      observer.disconnect();
      media?.pause();
      media?.removeAttribute('src');
      media?.load();
    };
  }, [source]);

  async function togglePlay() {
    const media = audio.current;
    if (!media) return;
    if (!media.paused) { media.pause(); return; }
    setError('');
    setLoading(true);
    if (media.error) media.load();
    if (media.ended) media.currentTime = 0;
    try {
      await media.play();
    } catch (failure) {
      if (mounted.current && !(failure instanceof DOMException && failure.name === 'AbortError')) {
        setError('Audio could not play. Check your connection and tap play to retry.');
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  function seek(seconds: number) {
    if (!audio.current || !canSeek) return;
    const time = Math.min(duration, Math.max(0, seconds));
    audio.current.currentTime = time;
    setPosition(time);
  }

  return <>
    <div className="quran-player-space" style={{ height }} aria-hidden="true"/>
    <section className="quran-player" ref={panel} aria-label={`${name} audio player`}>
      <audio
        ref={audio}
        preload="metadata"
        src={source}
        onLoadedMetadata={event => setDuration(event.currentTarget.duration)}
        onDurationChange={event => setDuration(event.currentTarget.duration)}
        onTimeUpdate={event => setPosition(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPlaying={() => { setPlaying(true); setLoading(false); setError(''); }}
        onPause={() => { setPlaying(false); setLoading(false); }}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onEnded={() => { setPlaying(false); setLoading(false); }}
        onError={() => {
          setPlaying(false); setLoading(false);
          setError('Audio is unavailable. Tap play to retry.');
        }}
      />
      <div className="quran-player-heading">
        <Landscape variant={4}/>
        <div className="quran-player-title">
          <strong>{name}</strong>
          <span>Surah {surah}</span>
        </div>
        <button type="button" className="quran-play-button" onClick={() => void togglePlay()} aria-label={`${playing ? 'Pause' : 'Play'} ${name}`}>
          {loading ? <CircleNotch size={24} className="quran-player-spinner"/> : playing ? <Pause size={22} weight="fill"/> : <Play size={22} weight="fill"/>}
        </button>
      </div>
      <label className="quran-reciter-field">
        <span className="quran-reciter-heading"><strong>Choose reciter</strong><small>{QURAN_RECITERS.length} voices available</small></span>
        <select className="quran-reciter-select" title="Choose a Quran reciter" value={reciter.id} onChange={event => onReciterChange(event.target.value)}>
          {QURAN_RECITERS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <input
        className="quran-seek"
        type="range"
        aria-label="Seek recitation"
        aria-valuetext={`${audioTime(position)} of ${audioTime(duration)}`}
        min={0}
        max={canSeek ? duration : 1}
        step={0.1}
        value={canSeek ? Math.min(position, duration) : 0}
        disabled={!canSeek}
        onChange={event => seek(Number(event.target.value))}
        style={{ background: `linear-gradient(to right, var(--teal) ${canSeek ? position / duration * 100 : 0}%, #dce7dc 0)` }}
      />
      <div className="quran-player-controls">
        <span className="quran-player-time">{audioTime(position)} <span>/ {canSeek ? audioTime(duration) : '—:—'}</span></span>
        <div className="quran-player-tools">
          <button type="button" className="quran-skip" onClick={() => seek(position - 10)} disabled={!canSeek} aria-label="Rewind 10 seconds"><ArrowCounterClockwise size={25}/><span>10</span></button>
          <button type="button" className="quran-skip" onClick={() => seek(position + 10)} disabled={!canSeek} aria-label="Forward 10 seconds"><ArrowClockwise size={25}/><span>10</span></button>
          <button type="button" aria-label={muted ? 'Unmute recitation' : 'Mute recitation'} aria-pressed={muted} onClick={() => {
            if (audio.current) { audio.current.muted = !muted; setMuted(!muted); }
          }}>{muted ? <SpeakerSlash size={19}/> : <SpeakerHigh size={19}/>}</button>
          <select aria-label="Playback speed" value={speed} onChange={event => {
            const value = Number(event.target.value);
            if (audio.current) { audio.current.playbackRate = value; setSpeed(value); }
          }}>{[0.75, 1, 1.25, 1.5, 2].map(value => <option key={value} value={value}>{value}×</option>)}</select>
        </div>
      </div>
      {loading && <span className="quran-player-status" role="status">Loading recitation…</span>}
      {error && <p className="quran-player-error" role="alert">{error}</p>}
    </section>
  </>;
}
