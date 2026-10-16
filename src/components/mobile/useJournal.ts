import { useEffect, useState } from 'react';
import type { PrayerKey } from '../../utils/prayerNames';

export const dayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function useSaved<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? initial; } catch { return initial; } });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage may be unavailable in private browsing. */ } }, [key, value]);
  return [value, setValue] as const;
}
export type Journal = Record<string, PrayerKey[]>;
export function getStreak(journal: Journal, today = new Date()) {
  const date = new Date(today);
  if ((journal[dayKey(date)]?.length || 0) < 5) date.setDate(date.getDate() - 1);
  let streak = 0;
  while (journal[dayKey(date)]?.length === 5) { streak++; date.setDate(date.getDate() - 1); }
  return streak;
}
