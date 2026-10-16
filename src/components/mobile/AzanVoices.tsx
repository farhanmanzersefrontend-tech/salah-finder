import { useEffect, useRef, useState } from "react";
import { Check, Play, Stop } from "phosphor-react";
import { usePrayerStore } from "../../store/usePrayerStore";
import { AZAN_PRESETS, getPlayingId, playAzan, stopAzan, subscribePlaying } from "../../utils/playAzan";
import { PRAYER_ORDER } from "../../utils/prayerNames";
import type { PrayerKey } from "../../utils/prayerNames";
import "./azanVoices.css";

const previewOwner = "azan-voice-preview";

export default function AzanVoices() {
  const { azan, setAzanSettings } = usePrayerStore();
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [target, setTarget] = useState<"all" | PrayerKey>("all");
  const mounted = useRef(true);
  const selected = target === "all" ? azan.audioId : azan.perPrayerAudio[target] || azan.audioId;
  const selectedId = AZAN_PRESETS.some(voice => voice.id === selected) ? selected : "local_full";

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = subscribePlaying(value => {
      setPlaying(value.ownerId === previewOwner ? value.audioId : null);
    });
    return () => {
      mounted.current = false;
      unsubscribe();
      if (getPlayingId() === previewOwner) stopAzan();
    };
  }, []);

  async function preview(id: string) {
    if (playing === id) { stopAzan(); return; }
    setError(""); setLoading(id);
    try {
      await playAzan({ audioId: id, volume: azan.volume, ownerId: previewOwner, throwOnError: true });
      if (!mounted.current && getPlayingId() === previewOwner) stopAzan();
    } catch {
      setError("Could not play this voice. Check your connection and try again.");
    } finally { setLoading(null); }
  }

  function choose(id: string) {
    setAzanSettings(target === "all" ? {
      audioId: id,
      perPrayerAudio: { Fajr: id, Dhuhr: id, Asr: id, Maghrib: id, Isha: id },
    } : { perPrayerAudio: { ...azan.perPrayerAudio, [target]: id } });
  }

  return <section className="azan-voices" aria-labelledby="azan-voices-title">
    <h2 id="azan-voices-title">Choose your azan voice</h2>
    <p>Listen to a preview, then choose your call to prayer.</p>
    <label className="azan-voice-target">Apply voice to
      <select value={target} onChange={event => setTarget(event.target.value as typeof target)}>
        <option value="all">All prayers</option>
        {PRAYER_ORDER.map(prayer => <option key={prayer}>{prayer}</option>)}
      </select>
    </label>
    <div className="azan-voice-list">
      {AZAN_PRESETS.map(voice => <div className={`azan-voice-row${selectedId === voice.id ? " selected" : ""}`} key={voice.id}>
        <label>
          <input type="radio" name="azan-voice" value={voice.id} checked={selectedId === voice.id} onChange={() => choose(voice.id)} />
          <span><strong>{voice.label.trim()}</strong><small>{voice.url.startsWith("https://") ? "AlAdhan · Online recording" : "Available offline"}</small></span>
          {selectedId === voice.id && <Check size={18} aria-hidden="true" />}
        </label>
        <button type="button" className="icon-button" disabled={loading !== null} onClick={() => void preview(voice.id)} aria-label={`${playing === voice.id ? "Stop" : "Preview"} ${voice.label.trim()}`} aria-pressed={playing === voice.id}>
          {loading === voice.id ? <span aria-label="Loading">…</span> : playing === voice.id ? <Stop size={19} weight="fill" /> : <Play size={19} weight="fill" />}
        </button>
      </div>)}
    </div>
    <p className="azan-voice-note" role="status">Voice choices save automatically. Choosing “All prayers” replaces individual prayer voices.</p>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <a href="https://aladhan.com/play" target="_blank" rel="noreferrer">Recordings provided by AlAdhan</a>
  </section>;
}
