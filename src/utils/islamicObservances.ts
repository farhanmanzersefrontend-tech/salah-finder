import { hijriParts, shiftDate } from './islamicCalendar';

export type IslamicObservance = { id: string; month: number; day: number; name: string };

let cache: { expires: number; events: IslamicObservance[] } | undefined;

export function isMainIslamicObservance(name: string) {
  const normalized = name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
  return /^(?:1st day of ramadan|first day of ramadan|ramadan begins|start of ramadan|eid (?:ul|al) fitr|eid (?:ul|al) adha|ashura|day of ashura|islamic new year|hijri new year|1st muharram|1st day of muharram|first day of muharram|muharram begins|arafa|arafah|day of arafah|hajj|mawlid birth al nabi|lailat ul miraj|lailat ul bara at|lailat ul qadr)$/.test(normalized);
}

export async function loadIslamicObservances(signal: AbortSignal): Promise<IslamicObservance[]> {
  if (cache && cache.expires > Date.now()) return cache.events;
  const response = await fetch('https://api.aladhan.com/v1/specialDays', { signal });
  if (!response.ok) throw new Error('Islamic dates are unavailable. Please try again.');
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) {
    throw new Error('Could not read Islamic dates. Please try again.');
  }
  const events = new Map<string, IslamicObservance>();
  for (const item of payload.data) {
    if (!item || typeof item !== 'object') continue;
    const { month, day, name } = item;
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 30 || typeof name !== 'string' || !name.trim()) continue;
    if (!isMainIslamicObservance(name)) continue;
    const id = `${month}-${day}-${name.trim()}`;
    const label = /qadr/i.test(name) ? `${name.trim()} · possible night` : name.trim();
    events.set(id, { id, month, day, name: label });
  }
  if (!events.size) throw new Error('No Islamic dates were returned. Please try again.');
  const result = [...events.values()];
  cache = { expires: Date.now() + 3600000, events: result };
  return result;
}

export function islamicObservances(date: Date, offset: number, events: IslamicObservance[]) {
  const { month, day } = hijriParts(date, offset);
  return events.filter(event => event.month === month && event.day === day);
}

export function observancesInRange(start: Date, days: number, offset: number, events: IslamicObservance[]) {
  return Array.from({ length: days }, (_, index) => {
    const date = shiftDate(start, index);
    return islamicObservances(date, offset, events).map(event => ({ ...event, date }));
  }).flat();
}
