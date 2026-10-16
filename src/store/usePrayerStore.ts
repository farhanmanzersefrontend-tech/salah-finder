import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PrayerKey } from "../utils/prayerNames";
import { DEFAULT_CALCULATION, DEFAULT_REMINDERS, DEFAULT_SILENT, PRAYER_EVENTS } from "../utils/prayerPreferences";
import type { CalculationSettings, LocationPreferences, PrayerEvent, ReminderRule, SilentSettings } from "../utils/prayerPreferences";
export type { CalculationSettings } from "../utils/prayerPreferences";

export type PrayerTimings = {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
};

export type PrayerCoords = {
  lat: number | null;
  lon: number | null;
};

// Method IDs follow the AlAdhan prayer-times API.
export const CALCULATION_METHODS = [
  { id: 3, label: "Muslim World League" },
  { id: 1, label: "University of Islamic Sciences, Karachi" },
  { id: 2, label: "Islamic Society of North America" },
  { id: 4, label: "Umm al-Qura University, Makkah" },
  { id: 5, label: "Egyptian General Authority of Survey" },
];

export type AzanSettings = {
  autoAzanEnabled: boolean;
  notificationsEnabled: boolean;
  soundUnlocked: boolean;
  volume: number; // 0..1
  // per-prayer sound enable flags
  perPrayer: Record<PrayerKey, boolean>;
  // per-prayer selected audio preset id
  perPrayerAudio: Record<PrayerKey, string>;
  // per-prayer selected half (short) audio preset id
  perPrayerHalfAudio?: Record<PrayerKey, string>;
  // selected half-audio preset id (fallback)
  halfAudioId?: string;
  // selected audio preset id
  audioId: string;
};

interface PrayerState {
  location: string;
  coords: PrayerCoords;
  timings: PrayerTimings;
  azan: AzanSettings;
  calculation: CalculationSettings;
  reminders: Record<PrayerEvent, ReminderRule>;
  silent: SilentSettings;
  locationPreferences: LocationPreferences;
  timezone: string;
  quietActive: boolean;
  quietMessage: string;

  setLocation: (location: string) => void;
  setCoords: (coords: PrayerCoords) => void;
  setTimings: (timings: PrayerTimings) => void;
  setCalculation: (calculation: CalculationSettings) => void;
  setReminders: (reminders: Record<PrayerEvent, ReminderRule>) => void;
  setSilent: (patch: Partial<SilentSettings>) => void;
  setLocationPreferences: (patch: Partial<LocationPreferences>) => void;
  setTimezone: (timezone: string) => void;
  setQuietStatus: (quietActive: boolean, quietMessage: string) => void;
  resetSettings: () => void;

  setAzanSettings: (patch: Partial<AzanSettings>) => void;
}

export const usePrayerStore = create<PrayerState>()(
  persist(
    (set, _get, api) => ({
      location: "",
      coords: { lat: null, lon: null },
      calculation: DEFAULT_CALCULATION,
      reminders: DEFAULT_REMINDERS,
      silent: DEFAULT_SILENT,
      locationPreferences: { method: "network", useInternet: true },
      timezone: "",
      quietActive: false,
      quietMessage: "",
      timings: {
        Fajr: "",
        Dhuhr: "",
        Asr: "",
        Maghrib: "",
        Isha: "",
      },
      azan: {
        autoAzanEnabled: false,
        notificationsEnabled: false,
        soundUnlocked: false,
        volume: 1,
        perPrayer: {
          Fajr: true,
          Dhuhr: true,
          Asr: true,
          Maghrib: true,
          Isha: true,
        },
        perPrayerAudio: {
          Fajr: "adhan1",
          Dhuhr: "adhan1",
          Asr: "adhan1",
          Maghrib: "adhan1",
          Isha: "adhan1",
        },
        perPrayerHalfAudio: {
          Fajr: "adhan1",
          Dhuhr: "adhan1",
          Asr: "adhan1",
          Maghrib: "adhan1",
          Isha: "adhan1",
        },
        halfAudioId: "local_half",
        audioId: "adhan1",
      },

      setLocation: (location) => set({ location }),
      setCoords: (coords) => set({ coords }),
      setTimings: (timings) => set({ timings }),
      setCalculation: (calculation) => set({ calculation }),
      setReminders: (reminders) => set({ reminders }),
      setSilent: (patch) => set(state => ({ silent: { ...state.silent, ...patch } })),
      setLocationPreferences: (patch) => set(state => ({ locationPreferences: { ...state.locationPreferences, ...patch } })),
      setTimezone: (timezone) => set({ timezone }),
      setQuietStatus: (quietActive, quietMessage) => set({ quietActive, quietMessage }),
      resetSettings: () => {
        const defaults = api.getInitialState();
        set(structuredClone({
          location: defaults.location,
          coords: defaults.coords,
          timings: defaults.timings,
          calculation: defaults.calculation,
          reminders: defaults.reminders,
          silent: defaults.silent,
          locationPreferences: defaults.locationPreferences,
          azan: defaults.azan,
          timezone: defaults.timezone,
          quietActive: defaults.quietActive,
          quietMessage: defaults.quietMessage,
        }));
      },

      setAzanSettings: (patch) =>
        set((state) => ({
          azan: { ...state.azan, ...patch },
        })),
    }),
    {
      name: "prayer-storage",
      version: 2,
      // Merge nested defaults for existing installs without discarding their choices.
      merge: (persisted, current) => {
        const saved = (persisted || {}) as Partial<PrayerState>;
        return {
          ...current, ...saved,
          calculation: { ...current.calculation, ...saved.calculation, adjustments: { ...current.calculation.adjustments, ...saved.calculation?.adjustments } },
          azan: { ...current.azan, ...saved.azan, perPrayer: { ...current.azan.perPrayer, ...saved.azan?.perPrayer } },
          reminders: Object.fromEntries(PRAYER_EVENTS.map(p => [p, { ...current.reminders[p], ...saved.reminders?.[p] }])) as PrayerState["reminders"],
          silent: { ...current.silent, ...saved.silent, prayers: Object.fromEntries(PRAYER_EVENTS.map(p => [p, { ...current.silent.prayers[p], ...saved.silent?.prayers?.[p] }])) as SilentSettings["prayers"] },
          locationPreferences: { ...current.locationPreferences, ...saved.locationPreferences },
        };
      },
      partialize: (state) => ({
        location: state.location,
        coords: state.coords,
        timings: state.timings,
        azan: state.azan,
        calculation: state.calculation,
        reminders: state.reminders,
        silent: state.silent,
        locationPreferences: state.locationPreferences,
        timezone: state.timezone,
      }),
    }
  )
);
