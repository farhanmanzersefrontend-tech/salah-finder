import { useEffect, useState } from "react";
import type { PrayerKey } from "../utils/prayerNames";
import { AZAN_PRESETS } from "../utils/playAzan";
import { usePrayerStore } from "../store/usePrayerStore";
import { showPrayerNotification } from "../utils/notify";
import { preferenceEvents, prayerWallDate, quietPeriodActive } from "../utils/prayerPreferences";

let audioEl: HTMLAudioElement | null = null;
const objectUrlCache: Record<string, string> = {};
let managerInitialized = false;
let subscribers: Array<(playing: boolean) => void> = [];
const notifyPlaying = (playing: boolean) => subscribers.forEach(cb => cb(playing));
const stopAudio = () => {
  if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; }
  notifyPlaying(false);
};
async function playPrayer(prayer: PrayerKey, isCurrent = () => true) {
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
  if (!isCurrent() || !state.azan.perPrayer[prayer] || quietPeriodActive(preferenceEvents(state.timings, now, state.calculation), now, state.silent)) return;
  if (!audioEl) audioEl = new Audio();
  audioEl.src = objectUrlCache[audioId];
  audioEl.volume = state.azan.volume;
  await audioEl.play();
  notifyPlaying(true);
  audioEl.onended = () => notifyPlaying(false);
}

export const useAzan = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  useEffect(() => {
    subscribers.push(setIsPlaying);
    return () => { subscribers = subscribers.filter(cb => cb !== setIsPlaying); };
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
            if (showPrayerNotification(`${event.prayer} prayer`, body, quiet || !state.azan.autoAzanEnabled)) remember(reminderKey);
          }
          const soundKey = `audio|${event.key}`;
          if (!state.azan.autoAzanEnabled || !state.azan.perPrayer[event.soundPrayer] || delivered.has(soundKey) || inFlight.has(soundKey)) continue;
          if (now.getTime() < event.at.getTime() || now.getTime() >= event.at.getTime() + 60000) continue;
          if (quiet) { remember(soundKey); continue; }
          inFlight.add(soundKey);
          // Mark before awaiting to prevent overlapping ticks from replaying audio.
          remember(soundKey);
          try { await playPrayer(event.soundPrayer, () => active && usePrayerStore.getState().azan.autoAzanEnabled); }
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
    isPlaying,
  } as const;
};
export default useAzan;
