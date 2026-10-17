export const MUSHAF_PAGES = 604;
export interface MushafAyah {
  number: number;
  text: string;
  numberInSurah: number;
  page: number;
  juz: number;
  hizbQuarter: number;
  surah: { number: number; name: string; englishName: string };
}
const cache = new Map<number, MushafAyah[]>();
export function validMushafPage(page: number): boolean {
  return Number.isInteger(page) && page >= 1 && page <= MUSHAF_PAGES;
}
function isAyah(value: unknown): value is MushafAyah {
  const ayah = value as Partial<MushafAyah> | null;
  return Boolean(ayah && typeof ayah.text === 'string' && Number.isInteger(ayah.number)
    && Number.isInteger(ayah.numberInSurah) && Number.isInteger(ayah.juz)
    && validMushafPage(ayah.page ?? 0) && ayah.surah && Number.isInteger(ayah.surah.number)
    && typeof ayah.surah.name === 'string' && typeof ayah.surah.englishName === 'string');
}
async function request(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`https://api.alquran.cloud/v1/${path}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
  if (!response.ok) throw new Error('The Quran could not be loaded. Please try again.');
  const payload = await response.json();
  if (payload.code !== 200 || !payload.data) throw new Error('The Quran response was incomplete. Please try again.');
  return payload.data;
}
export async function fetchMushafPage(page: number, signal: AbortSignal): Promise<MushafAyah[]> {
  if (!validMushafPage(page)) throw new Error('Choose a page from 1 to 604.');
  const saved = cache.get(page);
  if (saved) return saved;
  const data = await request(`page/${page}/quran-uthmani`, signal) as { ayahs?: unknown[] };
  if (!Array.isArray(data.ayahs) || !data.ayahs.length || !data.ayahs.every(isAyah) || data.ayahs.some(ayah => ayah.page !== page)) throw new Error('This page is unavailable. Please try again.');
  if (cache.size >= 12) cache.delete(cache.keys().next().value!);
  cache.set(page, data.ayahs);
  return data.ayahs;
}

export async function findMushafPage(kind: 'surah' | 'juz', number: number, signal: AbortSignal): Promise<number> {
  if (!Number.isInteger(number) || number < 1 || number > (kind === 'surah' ? 114 : 30)) throw new Error('Choose a valid index entry.');
  const data = await request(kind === 'surah' ? `ayah/${number}:1/quran-uthmani` : `juz/${number}/quran-uthmani`, signal);
  const ayah = kind === 'surah' ? data : (data as { ayahs?: unknown[] }).ayahs?.[0];
  if (!isAyah(ayah)) throw new Error('The page could not be found. Please try again.');
  return ayah.page;
}

export function printedMushafImageUrl(page: number): string {
  if (!validMushafPage(page)) throw new Error('Choose a page from 1 to 604.');
  return `https://quran.islam-db.com/data/pages/quranpages_1024/images/page${String(page).padStart(3, '0')}.png`;
}
