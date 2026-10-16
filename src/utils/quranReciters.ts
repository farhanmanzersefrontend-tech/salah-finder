// Full-surah editions verified against the provider's catalogue:
// https://cdn.islamic.network/quran/info/by-surah/info.json
// Ayah API edition IDs are different and cannot be substituted here.
export const QURAN_RECITERS = [
  { id: 'ar.alafasy', name: 'Mishary Rashid Alafasy' },
  { id: 'ar.abdulbasitmurattal', name: 'Abdul Basit Abdul Samad · Murattal' },
  { id: 'ar.abdulbasitmujawwad', name: 'Abdul Basit Abdul Samad · Mujawwad' },
  { id: 'ar.muhammadsiddiqalminshawimujawwad', name: 'Mohamed Siddiq Al-Minshawi · Mujawwad' },
  { id: 'ar.saudalshuraim', name: 'Saud Al-Shuraim' },
  { id: 'ar.ahmedalajmi', name: 'Ahmed Al-Ajmi' },
  { id: 'ar.haniarrifai', name: 'Hani Ar-Rifai' },
  { id: 'ar.yasseraldossari', name: 'Yasser Al-Dossari' },
  { id: 'ar.faresabbad', name: 'Fares Abbad' },
  { id: 'ar.muhammadayyub', name: 'Muhammad Ayyoub' },
  { id: 'ar.aliabdurrahmanalhuthaify', name: 'Ali Al-Hudhaify' },
] as const;

export type QuranReciter = typeof QURAN_RECITERS[number];

export function quranSurahAudio(reciter: QuranReciter, surah: number) {
  return `https://cdn.islamic.network/quran/audio-surah/128/${reciter.id}/${surah}.mp3`;
}
