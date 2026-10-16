import { PRAYER_ORDER, type PrayerKey } from "./prayerNames";

export type PrayerEvent = PrayerKey | "Jumuah";
export const PRAYER_EVENTS: PrayerEvent[] = [...PRAYER_ORDER, "Jumuah"];
export type CalculationSettings = {
  method: number;
  school: number;
  highLatitude: number;
  ramadanIsha: boolean;
  daylightOffset: number;
  jumuahEnabled: boolean;
  jumuahTime: string;
  adjustments: Record<PrayerKey, number>;
};
export const DEFAULT_CALCULATION: CalculationSettings = {
  method: 3, school: 0, highLatitude: 3, ramadanIsha: false,
  daylightOffset: 0, jumuahEnabled: false, jumuahTime: "13:00",
  adjustments: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
};
export type ReminderRule = { enabled: boolean; offset: number };
export type SilentRule = { enabled: boolean; offset: number; duration: number };
export type SilentSettings = {
  enabled: boolean;
  vibrate: boolean;
  showMessage: boolean;
  prayers: Record<PrayerEvent, SilentRule>;
};
export type LocationPreferences = { method: "gps" | "network"; useInternet: boolean };
export const DEFAULT_REMINDERS = Object.fromEntries(PRAYER_EVENTS.map(p => [p, { enabled: true, offset: 0 }])) as Record<PrayerEvent, ReminderRule>;
export const DEFAULT_SILENT: SilentSettings = {
  enabled: false, vibrate: false, showMessage: true,
  prayers: Object.fromEntries(PRAYER_EVENTS.map(p => [p, { enabled: true, offset: 0, duration: 20 }])) as Record<PrayerEvent, SilentRule>,
};

export function timeMinutes(time: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
export function shiftTime(time: string, minutes: number): string {
  const total = ((timeMinutes(time) + minutes) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function adjustPrayerTimes(raw: Record<PrayerKey, string>, settings: CalculationSettings, ramadan: boolean, friday: boolean) {
  return Object.fromEntries(PRAYER_ORDER.map(prayer => {
    let time = raw[prayer];
    // Umm al-Qura uses a fixed interval after Maghrib. Set the interval explicitly
    // so an upstream Ramadan adjustment cannot be added twice.
    if (prayer === "Isha" && settings.method === 4 && ramadan && settings.ramadanIsha) time = shiftTime(raw.Maghrib, 120);
    if (prayer === "Dhuhr" && friday && settings.jumuahEnabled) return [prayer, settings.jumuahTime];
    return [prayer, shiftTime(time, settings.daylightOffset + settings.adjustments[prayer])];
  })) as Record<PrayerKey, string>;
}

export function validateCalculation(settings: CalculationSettings) {
  if (![1, 2, 3, 4, 5].includes(settings.method) || ![0, 1].includes(settings.school) || ![1, 2, 3].includes(settings.highLatitude)) throw new Error("Choose a valid calculation method.");
  if (![-60, 0, 60].includes(settings.daylightOffset)) throw new Error("Choose a valid daylight saving adjustment.");
  if (!Number.isFinite(timeMinutes(settings.jumuahTime))) throw new Error("Enter a valid Jumuah time.");
  if (PRAYER_ORDER.some(p => !Number.isInteger(settings.adjustments[p]) || Math.abs(settings.adjustments[p]) > 60)) throw new Error("Manual adjustments must be whole minutes between -60 and +60.");
}

export function validateCoordinates(latitude: string, longitude: string) {
  const lat = Number(latitude), lon = Number(longitude);
  if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error("Enter a latitude from -90 to 90 and longitude from -180 to 180.");
  return { lat, lon };
}

export function prayerWallDate(now: Date, timezone?: string): Date {
  if (!timezone) return now;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const value = (name: string) => Number(parts.find(p => p.type === name)?.value);
  return new Date(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
}

// Wall-clock events include adjacent days so offsets and quiet periods can cross midnight.
export function preferenceEvents(timings: Record<PrayerKey, string>, now: Date, calculation: CalculationSettings) {
  const events: { prayer: PrayerEvent; at: Date; key: string; soundPrayer: PrayerKey }[] = [];
  for (const day of [-1, 0, 1]) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    for (const soundPrayer of PRAYER_ORDER) {
      const prayer = soundPrayer === "Dhuhr" && date.getDay() === 5 ? "Jumuah" : soundPrayer;
      const time = prayer === "Jumuah" && calculation.jumuahEnabled ? calculation.jumuahTime : timings[soundPrayer];
      const minutes = timeMinutes(time);
      if (!Number.isFinite(minutes)) continue;
      const at = new Date(date);
      at.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      events.push({ prayer, at, soundPrayer, key: `${at.getFullYear()}-${at.getMonth() + 1}-${at.getDate()}|${prayer}` });
    }
  }
  return events;
}

export function quietPeriodActive(events: ReturnType<typeof preferenceEvents>, now: Date, silent: SilentSettings) {
  if (!silent.enabled) return false;
  return events.some(event => {
    const rule = silent.prayers[event.prayer];
    const start = event.at.getTime() + rule.offset * 60000;
    return rule.enabled && now.getTime() >= start && now.getTime() < start + rule.duration * 60000;
  });
}
