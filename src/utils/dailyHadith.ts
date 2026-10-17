const DAILY_POOL = [1, 8, 10, 12, 13, 15, 16, 24, 52, 69, 71, 114, 6011, 6018, 6024, 6029, 6031, 6114, 6116, 6412, 6464, 6475, 6487, 6502, 6514, 6528, 6540, 6605, 7376, 7405];
export interface DailyHadith {
  number: number; referenceNumber: number; english: string; urdu: string;
  narrator: string; section: string; book: number; bookHadith: number; sourceUrl: string;
}
interface HadithResponse {
  metadata: { section?: Record<string, string> };
  hadiths: { hadithnumber: number; arabicnumber: number; text: string; reference: { book: number; hadith: number } }[];
}
export function hadithDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dailyHadithNumbers(day: string): number[] {
  const serial = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000);
  const offset = ((serial * 2) % DAILY_POOL.length + DAILY_POOL.length) % DAILY_POOL.length;
  return [DAILY_POOL[offset], DAILY_POOL[(offset + 1) % DAILY_POOL.length]];
}
async function fetchHadith(language: 'eng' | 'urd', number: number, signal: AbortSignal): Promise<HadithResponse> {
  const path = `editions/${language}-bukhari/${number}.json`;
  const urls = [`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/${path}`, `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/${path}`];
  for (const url of urls) {
    try {
      signal.throwIfAborted();
      const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
      if (!response.ok) throw new Error('Hadith unavailable');
      const data = await response.json() as HadithResponse;
      const hadith = data?.hadiths?.[0];
      if (!hadith || hadith.hadithnumber !== number || typeof hadith.text !== 'string' || !hadith.text.trim() || !Number.isInteger(hadith.arabicnumber) || !Number.isInteger(hadith.reference?.book) || !Number.isInteger(hadith.reference?.hadith)) throw new Error('Incomplete Hadith response');
      return data;
    } catch { if (signal.aborted) signal.throwIfAborted(); }
  }
  throw new Error('Unable to load today’s Hadiths. Please check your connection and try again.');
}
export async function loadDailyHadith(day: string, signal: AbortSignal): Promise<DailyHadith[]> {
  const numbers = dailyHadithNumbers(day);
  try {
    const cached = JSON.parse(localStorage.getItem('salah-daily-hadith-v1') || 'null');
    if (cached?.day === day && Array.isArray(cached.items) && cached.items.length === 2 && cached.items.every((item: DailyHadith, index: number) => item.number === numbers[index] && typeof item.english === 'string' && typeof item.urdu === 'string' && item.urdu.trim() && Number.isInteger(item.referenceNumber) && item.sourceUrl === `https://sunnah.com/bukhari:${item.referenceNumber}`)) return cached.items;
  } catch { /* Storage is optional. */ }
  const items = await Promise.all(numbers.map(async number => {
    const [english, urdu] = await Promise.all([fetchHadith('eng', number, signal), fetchHadith('urd', number, signal)]);
    const en = english.hadiths[0], ur = urdu.hadiths[0];
    if (en.arabicnumber !== ur.arabicnumber || en.reference.book !== ur.reference.book || en.reference.hadith !== ur.reference.hadith) throw new Error('The translations could not be matched. Please try again.');
    return {
      number, referenceNumber: en.arabicnumber, english: en.text, urdu: ur.text,
      narrator: en.text.match(/^Narrated\s+([^:]+):/i)?.[1]?.trim() || '',
      section: english.metadata?.section?.[String(en.reference.book)] || 'Daily Hadith',
      book: en.reference.book, bookHadith: en.reference.hadith,
      sourceUrl: `https://sunnah.com/bukhari:${en.arabicnumber}`,
    };
  }));
  signal.throwIfAborted();
  try { localStorage.setItem('salah-daily-hadith-v1', JSON.stringify({ day, items })); } catch { /* Keep displaying without storage. */ }
  return items;
}
