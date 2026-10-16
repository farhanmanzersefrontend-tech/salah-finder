import { useEffect, useState } from "react";
import type { PrayerKey } from "../utils/prayerNames";
import { AZAN_PRESETS } from "../utils/playAzan";
import { usePrayerStore } from "../store/usePrayerStore";
import { closeAzanNotification, showPrayerNotification } from "../utils/notify";
import { preferenceEvents, prayerWallDate, quietPeriodActive } from "../utils/prayerPreferences";

let audioEl: HTMLAudioElement | null = null;
const objectUrlCache: Record<string, string> = {};
let managerInitialized = false;
let currentPrayer: string | null = null;
let currentSoundPrayer: PrayerKey | null = null;
let playbackVersion = 0;
let currentToken: string | null = null;
let subscribers: Array<(prayer: string | null) => void> = [];
const notifyPlaying = (prayer: string | null) => { currentPrayer = prayer; subscribers.forEach(cb => cb(prayer)); };
const stopAudio = () => {
  playbackVersion++;
  if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; }
  if (currentToken) void closeAzanNotification(currentToken);
  currentToken = null;
  currentSoundPrayer = null;
  if ('mediaSession' in navigator && currentPrayer) {
    navigator.mediaSession.playbackState = 'none';
    navigator.mediaSession.metadata = null;
    for (const action of ['pause', 'stop'] as const) {
      try { navigator.mediaSession.setActionHandler(action, null); } catch { /* Unsupported action. */ }
    }
  }
  notifyPlaying(null);
};
async function playPrayer(prayer: PrayerKey, isCurrent = () => true, label: string = prayer) {
  stopAudio();
  const version = playbackVersion;
  const { azan } = usePrayerStore.getState();
  const audioId = azan.perPrayerAudio?.[prayer] || azan.audioId;
  if (!objectUrlCache[audioId]) {
    const preset = AZAN_PRESETS.find(p => p.id === audioId) || AZAN_PRESETS[0];
    if (preset.url.startsWith("https://")) {
      objectUrlCache[audioId] = preset.url;
    } else {
    const response = await fetch(preset.url);
    if (!response.ok) throw new Error("Failed to download azan");
    objectUrlCache[audioId] = URL.createObjectURL(await response.blob());
    }
  }
  const state = usePrayerStore.getState();
  const now = prayerWallDate(new Date(), state.timezone);
  // Recheck preferences after downloading audio.
  if (version !== playbackVersion || !isCurrent() || !state.azan.perPrayer[prayer] || quietPeriodActive(preferenceEvents(state.timings, now, state.calculation), now, state.silent)) return;
  if (!audioEl) audioEl = new Audio();
  audioEl.src = objectUrlCache[audioId];
  audioEl.volume = state.azan.volume;
  audioEl.onended = stopAudio;
  audioEl.onerror = stopAudio;
  await audioEl.play();
  if (version !== playbackVersion || !isCurrent()) { stopAudio(); return; }
  notifyPlaying(label);
  currentSoundPrayer = prayer;
  currentToken = `azan-${Date.now()}-${version}`;
  const token = currentToken;
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: `${label} azan`, artist: 'Awqat Al-Salah', artwork: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] });
      navigator.mediaSession.playbackState = 'playing';
      navigator.mediaSession.setActionHandler('pause', stopAudio);
      navigator.mediaSession.setActionHandler('stop', stopAudio);
    } catch { /* Lock-screen media controls vary by browser. */ }
  }
  if (state.azan.notificationsEnabled) {
    void showPrayerNotification(`${label} · Azan is playing`, 'Mute this azan or tap to open Awqat Al-Salah.', true, token)
      .then(() => { if (currentToken !== token) void closeAzanNotification(token); });
  }
}

export const useAzan = () => {
  const [playingPrayer, setPlayingPrayer] = useState<string | null>(currentPrayer);
  useEffect(() => {
    subscribers.push(setPlayingPrayer);
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'MUTE_AZAN' && event.data.token === currentToken) stopAudio();
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => {
      subscribers = subscribers.filter(cb => cb !== setPlayingPrayer);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, []);

  useEffect(() => {
    if (managerInitialized) return;
    managerInitialized = true;
    let active = true;
    const inFlight = new Set<string>();
    const readHistory = (): string[] => {
      try {
        const saved = JSON.parse(localStorage.getItem("salah-prayer-events") || "[]");
        return Array.isArray(saved) ? saved.filter(key => typeof key === "string").slice(-100) : [];
      } catch { return []; }
    };
    const delivered = new Set(readHistory());
    const remember = (key: string) => {
      delivered.add(key);
      while (delivered.size > 100) delivered.delete(delivered.values().next().value!);
      try { localStorage.setItem("salah-prayer-events", JSON.stringify([...delivered])); } catch { /* In-memory deduplication still works. */ }
    };
    const tick = async () => {
      try {
        const state = usePrayerStore.getState();
        const now = prayerWallDate(new Date(), state.timezone);
        const events = preferenceEvents(state.timings, now, state.calculation);
        const quiet = quietPeriodActive(events, now, state.silent);
        if (currentPrayer && (!state.azan.autoAzanEnabled || quiet || (currentSoundPrayer && !state.azan.perPrayer[currentSoundPrayer]))) stopAudio();
        if (audioEl) audioEl.volume = state.azan.volume;
        if (quiet !== state.quietActive) {
          if (quiet) stopAudio();
          state.setQuietStatus(quiet, state.silent.showMessage ? (quiet ? "Prayer quiet time started. Automatic azan is muted." : "Prayer quiet time ended. Your sound settings are restored.") : "");
          if (state.silent.vibrate && typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(100);
        }
        for (const event of events) {
          const rule = state.reminders[event.prayer];
          const notificationAt = event.at.getTime() + rule.offset * 60000;
          const reminderKey = `notification|${event.key}`;
          if (state.azan.notificationsEnabled && rule.enabled && now.getTime() >= notificationAt && now.getTime() < notificationAt + 60000 && !delivered.has(reminderKey)) {
            const body = rule.offset === 0 ? `It is time for ${event.prayer}.` : `${event.prayer} is at ${event.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`;
            remember(reminderKey);
            void showPrayerNotification(`${event.prayer} prayer`, body, quiet || !state.azan.autoAzanEnabled)
              .then(result => { if (!result) delivered.delete(reminderKey); });
          }
          const soundKey = `audio|${event.key}`;
          if (!state.azan.autoAzanEnabled || !state.azan.perPrayer[event.soundPrayer] || delivered.has(soundKey) || inFlight.has(soundKey)) continue;
          if (now.getTime() < event.at.getTime() || now.getTime() >= event.at.getTime() + 60000) continue;
          if (quiet) { remember(soundKey); continue; }
          inFlight.add(soundKey);
          // Mark before awaiting to prevent overlapping ticks from replaying audio.
          remember(soundKey);
          try { await playPrayer(event.soundPrayer, () => active && usePrayerStore.getState().azan.autoAzanEnabled, event.prayer); }
          catch (error) { console.warn("Auto azan play failed", error); }
          finally { inFlight.delete(soundKey); }
        }
      } catch (error) { console.debug("Prayer scheduler error", error); }
    };
    const timer = window.setInterval(tick, 1000);
    return () => { active = false; window.clearInterval(timer); managerInitialized = false; };
  }, []);

  return {
    playAzan: (prayer: string) => playPrayer(prayer as PrayerKey),
    stopAzan: stopAudio,
    isPlaying: playingPrayer !== null,
    playingPrayer,
  } as const;
};
export default useAzan;
