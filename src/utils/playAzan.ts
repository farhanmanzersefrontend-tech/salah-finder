// src/utils/playAzan.ts

type PlayAzanOptions = {
  volume?: number; // 0..1
  audioId?: string; // select preset
  ownerId?: string; // optional UI owner id so subscribers can scope which control started playback
  prayer?: string; // optional prayer key when played by scheduler
  throwOnError?: boolean;
};
import fullLocal from "../assets/full-azan.mp3";
import halfLocal from "../assets/half-azan.mp3";

export const AZAN_PRESETS = [
  { id: "local_full", label: " Full Azan", url: fullLocal },
  { id: "local_half", label: " Half Azan", url: halfLocal },
  { id: "alafasy", label: "Mishary Rashid Alafasy", url: "https://cdn.aladhan.com/audio/adhans/a9.mp3" },
  { id: "al_nafees", label: "Ahmad al-Nafees", url: "https://cdn.aladhan.com/audio/adhans/a1.mp3" },
  { id: "mustafa_ozcan", label: "Hafiz Mustafa Özcan", url: "https://cdn.aladhan.com/audio/adhans/a2.mp3" },
  { id: "al_zahrani", label: "Mansour Al-Zahrani", url: "https://cdn.aladhan.com/audio/adhans/a11-mansour-al-zahrani.mp3" },
];

// cache per-audio-id
const cachedObjectUrls: Record<string, string | null> = {};

export const prefetchAzan = async (audioId = "adhan1"): Promise<void> => {
  if (cachedObjectUrls[audioId]) return;
  const preset = AZAN_PRESETS.find((p) => p.id === audioId) || AZAN_PRESETS[0];
  // Stream external recordings directly: the CDN does not expose CORS headers for fetch.
  if (preset.url.startsWith("https://")) {
    cachedObjectUrls[audioId] = preset.url;
    return;
  }
  const response = await fetch(preset.url);
  if (!response.ok) throw new Error("Failed to download Azan audio");
  const audioBlob = await response.blob();
  cachedObjectUrls[audioId] = URL.createObjectURL(audioBlob);
};

// Module-level current audio and play state + subscribers so UI can react
let currentAudio: HTMLAudioElement | null = null;
let currentPlayingOwnerId: string | null = null;
export type PlayingPayload = { ownerId: string | null; audioId: string | null; prayer?: string | null };
const subscribers: Array<(payload: PlayingPayload) => void> = [];

const notifyPlaying = (payload: PlayingPayload) => subscribers.forEach((cb) => cb(payload));

export const subscribePlaying = (cb: (payload: PlayingPayload) => void) => {
  subscribers.push(cb);
  return () => {
    const idx = subscribers.indexOf(cb);
    if (idx >= 0) subscribers.splice(idx, 1);
  };
};

export const getPlayingId = () => currentPlayingOwnerId;

export const isPlaying = () => currentPlayingOwnerId !== null;

export const stopAzan = () => {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  } catch (e) {
    console.debug("stopAzan error", e);
  }
  currentPlayingOwnerId = null;
  notifyPlaying({ ownerId: null, audioId: null, prayer: null });
};

export const playAzan = async (opts: PlayAzanOptions = {}) => {
  try {
    const audioId = opts.audioId || "adhan1";
    if (!cachedObjectUrls[audioId]) {
      await prefetchAzan(audioId);
    }

    const url = cachedObjectUrls[audioId]!;
    // stop any existing audio
    stopAzan();

    const audio = new Audio(url);
    currentAudio = audio;
    audio.volume = typeof opts.volume === "number" ? Math.min(Math.max(opts.volume, 0), 1) : 1;

    // set owner id (either provided by caller or generate one)
    const ownerId = opts.ownerId || `owner_${Math.random().toString(36).slice(2, 9)}`;
    currentPlayingOwnerId = ownerId;
    notifyPlaying({ ownerId, audioId, prayer: opts.prayer || null });

    audio.onended = () => {
      currentAudio = null;
      currentPlayingOwnerId = null;
      notifyPlaying({ ownerId: null, audioId: null, prayer: null });
    };

    // IMPORTANT: many browsers require user gesture before first audio playback.
    await audio.play();

    return;
  } catch (error) {
    console.error("Azan play failed:", error);
    stopAzan();
    if (opts.throwOnError) throw error;
  }
};

/**
 * Call this on a user gesture (e.g., button click) once.
 * It unlocks the audio stack by playing a 1-frame silent audio.
 */
export const unlockAudio = async (): Promise<boolean> => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    await prefetchAzan().catch(() => undefined);
    return true;
  } catch (e) {
    console.warn("Audio unlock failed", e);
    return false;
  }
};
