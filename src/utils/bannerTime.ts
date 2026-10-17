import type { PrayerTimings } from '../store/usePrayerStore';
import { timeMinutes } from './prayerPreferences';

export type BannerPhase = 'dawn' | 'day' | 'afternoon' | 'sunset' | 'night';

// The date is already expressed in the selected prayer location's timezone.
export function bannerPhase(now: Date, timings: PrayerTimings): BannerPhase {
  const minute = now.getHours() * 60 + now.getMinutes();
  const values = [timings.Fajr, timings.Dhuhr, timings.Asr, timings.Maghrib, timings.Isha].map(timeMinutes);
  const valid = values.every(Number.isFinite) && values.every((value, i) => i === 0 || value > values[i - 1]);
  const [fajr, dhuhr, asr, maghrib, isha] = valid ? values : [300, 720, 930, 1080, 1200];
  if (minute < fajr || minute >= isha) return 'night';
  if (minute < Math.min(fajr + 75, dhuhr)) return 'dawn';
  if (minute < asr) return 'day';
  if (minute < maghrib) return 'afternoon';
  return 'sunset';
}
