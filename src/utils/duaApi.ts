export const DUA_DATA_URL = 'https://raw.githubusercontent.com/islamicapi/masnun-dua/main/';
export interface DuaTopic { id: number; title: string; urduTitle?: string; category: string; 'dua-ids': number[] }
export interface ApiDua { dua_id: number; title: string; urduTitle?: string; arabic: string; translation: string; urduTranslation?: string; transliteration?: string; reference?: string; introduction?: string }

export async function loadDuaData<T>(path: string, signal: AbortSignal): Promise<T> {
  const key = `salah-dua-api-v1:${path}`;
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached) as T;
  } catch { /* Storage is optional. */ }
  const response = await fetch(`${DUA_DATA_URL}${path}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
  if (!response.ok) throw new Error('Duas could not be loaded. Please try again.');
  const data: unknown = await response.json();
  if (path.startsWith('sub-categories')) {
    if (!Array.isArray(data) || !data.every(item => Number.isInteger(item.id) && typeof item.title === 'string' && typeof item.category === 'string' && Array.isArray(item['dua-ids']) && item['dua-ids'].every(Number.isInteger))) throw new Error('The dua topics are unavailable. Please try again.');
  } else {
    const dua = data as Partial<ApiDua> | null;
    if (!dua || !Number.isInteger(dua.dua_id) || typeof dua.title !== 'string' || typeof dua.arabic !== 'string' || typeof dua.translation !== 'string') throw new Error('This dua is unavailable. Please try again.');
  }
  try { sessionStorage.setItem(key, JSON.stringify(data)); } catch { /* Continue without caching. */ }
  return data as T;
}

export async function loadBilingualTopics(signal: AbortSignal): Promise<DuaTopic[]> {
  const [english, urdu] = await Promise.all([
    loadDuaData<DuaTopic[]>('sub-categories/en.json', signal),
    loadDuaData<DuaTopic[]>('sub-categories/ur.json', signal),
  ]);
  const titles = new Map(urdu.map(topic => [topic.id, topic.title]));
  return english.map(topic => ({ ...topic, urduTitle: titles.get(topic.id) }));
}

export async function loadBilingualDua(id: number, signal: AbortSignal): Promise<ApiDua> {
  const [english, urdu] = await Promise.all([
    loadDuaData<ApiDua>(`translation/en/dua_${id}.json`, signal),
    loadDuaData<ApiDua>(`translation/ur/dua_${id}.json`, signal),
  ]);
  return { ...english, urduTitle: urdu.title, urduTranslation: urdu.translation };
}
