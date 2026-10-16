export interface PrayerGuideCard {
  id: string;
  title: string;
  text: string;
  arabic?: string;
  transliteration?: string;
  meaning?: string;
  excerpt?: boolean;
  rows?: [string, string][];
  sources: { label: string; url: string }[];
}

export interface PrayerGuideTopic {
  id: string;
  title: string;
  cards: PrayerGuideCard[];
}

const bukhari = (number: number) => ({ label: `Sahih al-Bukhari ${number}`, url: `https://sunnah.com/bukhari:${number}` });
const muslim = (number: string) => ({ label: `Sahih Muslim ${number}`, url: `https://sunnah.com/muslim:${number}` });
const quran = (verse: string) => ({ label: `Quran ${verse}`, url: `https://quran.com/${verse.replace(':', '/')}` });
const prayerOverview = { label: 'Islamic Relief · How to pray salah', url: 'https://www.islamic-relief.org.uk/resources/knowledge-base/five-pillars-of-islam/salah/how-to-pray-salah/' };

export const prayerGuideTopics: PrayerGuideTopic[] = [
  { id: 'importance', title: 'Importance of Salah', cards: [
    { id: 'appointed-times', title: 'A daily connection with Allah', text: 'Salah is an obligation with appointed times. Make room for it throughout your day, and remember Allah beyond the moments of prayer too.', sources: [quran('4:103')] },
    { id: 'acceptance', title: 'A dua for acceptance', arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ', transliteration: 'Rabbana taqabbal minna, innaka Antas-Sami‘ul-‘Alim.', meaning: 'Our Lord, accept from us; You hear everything and know everything.', text: 'Ibrahim and Ismail made this dua while raising the foundations of the Ka‘bah. It is a reminder to seek Allah’s acceptance of our worship.', excerpt: true, sources: [quran('2:127')] },
  ] },
  { id: 'reward', title: 'How to get more reward from Salah?', cards: [
    { id: 'intention', title: 'Begin with a sincere intention', text: 'Turn your intention toward Allah. The Prophet ﷺ taught that the value of our actions is tied to our intentions.', sources: [bukhari(1)] },
    { id: 'congregation', title: 'Pray together', text: 'The Prophet ﷺ described congregational prayer as surpassing prayer alone by twenty-seven degrees. Join the congregation when you are able.', sources: [bukhari(645)] },
  ] },
  { id: 'rakahs', title: 'Number of Rak‘ahs in Salah', cards: [
    { id: 'daily-rakahs', title: 'The five daily obligatory prayers', text: 'These are the fard rak‘ahs for a resident. Sunnah and voluntary prayers are additional. Travel and Jumu‘ah have separate rulings.', rows: [['Fajr', '2'], ['Dhuhr', '4'], ['Asr', '4'], ['Maghrib', '3'], ['Isha', '4']], sources: [prayerOverview] },
  ] },
  { id: 'conditions', title: 'Conditions of Salah', cards: [
    { id: 'prepare', title: 'Before you begin', text: 'Check that the prayer time has entered. Be in a state of ritual purity, wear clothing that covers the required parts of the body, and use a clean place to pray.', sources: [quran('4:103'), quran('5:6'), prayerOverview] },
    { id: 'direction', title: 'Face the qibla', text: 'Face the direction of the Sacred Mosque in Makkah, and intend the prayer you are about to offer for Allah.', sources: [quran('2:144'), bukhari(1)] },
  ] },
  { id: 'distractions', title: 'Things that can disturb your Salah', cards: [
    { id: 'attention', title: 'Give prayer your attention', text: 'Avoid looking around unnecessarily. Before starting, silence your phone and put distractions aside so it is easier to stay attentive.', sources: [bukhari(751)] },
    { id: 'unhurried', title: 'Let each posture settle', text: 'Do not rush through the movements. Pause with steadiness in bowing, standing, prostration and sitting.', sources: [bukhari(757)] },
  ] },
  { id: 'qiyam', title: 'Qiyam · Standing', cards: [
    { id: 'standing', title: 'Stand according to your ability', text: 'Stand for obligatory prayer if you are able. If you cannot stand, pray sitting; if sitting is not possible, pray on your side.', sources: [bukhari(1117)] },
  ] },
  { id: 'gaze', title: 'Looking at the place of Sajdah', cards: [
    { id: 'lower-gaze', title: 'Keep your gaze calm', text: 'While standing, direct your gaze toward the place of prostration. Avoid looking upward or letting your attention wander.', sources: [{ label: 'IslamQA · Gaze during prayer', url: 'https://islamqa.info/en/answers/149172' }, bukhari(750)] },
  ] },
  { id: 'takbir', title: 'Takbeer-at-Tahremah', cards: [
    { id: 'opening-takbir', title: 'Begin the prayer', arabic: 'اللَّهُ أَكْبَرُ', transliteration: 'Allahu Akbar', meaning: 'Allah is the Greatest.', text: 'Begin salah with the opening takbir. Say it as you enter the prayer, then proceed to the opening supplication and recitation.', sources: [muslim('498')] },
  ] },
  { id: 'raising-hands', title: 'Raf‘ al-yadayn · Raising hands', cards: [
    { id: 'hands-raised', title: 'Raise your hands at the opening', text: 'Ibn Umar reported that the Prophet ﷺ raised his hands to shoulder level at the beginning of prayer, before bowing and upon rising from bowing. Schools differ on repeating this after the opening; follow the practice you have learned.', sources: [bukhari(735)] },
  ] },
  { id: 'folding-hands', title: 'Right hand on the left', cards: [
    { id: 'hands-resting', title: 'Rest your hands while standing', text: 'Sahl ibn Sa‘d reported placing the right hand over the left forearm in prayer. The precise position, and some practices of leaving the arms at the sides, differ among schools.', sources: [bukhari(740)] },
  ] },
  { id: 'opening-dua', title: 'The Opening Dua', cards: [
    { id: 'opening-supplication', title: 'A moment before recitation', text: 'The Prophet ﷺ made an opening supplication between the takbir and Quran recitation, asking Allah to distance him from sins and cleanse him. Several opening duas are transmitted; learn the complete wording of one from the linked narration or your teacher.', sources: [bukhari(744)] },
  ] },
  { id: 'recitation', title: 'Reciting Al-Fatihah', cards: [
    { id: 'fatihah', title: 'Recite with care', text: 'Recite Al-Fatihah while standing. The Prophet ﷺ emphasized its place in salah. When praying behind an imam, follow your school’s guidance on reciting and listening.', sources: [bukhari(756)] },
    { id: 'additional-recitation', title: 'Continue with Quran', text: 'When praying on your own, follow Al-Fatihah with a surah or verses you know in the first two rak‘ahs.', sources: [prayerOverview] },
  ] },
  { id: 'ruku', title: 'Ruku‘ · Bowing', cards: [
    { id: 'bowing', title: 'Bow with stillness', arabic: 'سُبْحَانَ رَبِّيَ الْعَظِيمِ', transliteration: 'Subhana Rabbiyal-‘Azim', meaning: 'Glory be to my Lord, the Magnificent.', text: 'Bow and allow your posture to settle. Glorify Allah, then rise fully to standing before moving to prostration.', sources: [muslim('772'), bukhari(757)] },
  ] },
  { id: 'sujud', title: 'Sujud · Prostration', cards: [
    { id: 'prostration', title: 'Draw near in prostration', arabic: 'سُبْحَانَ رَبِّيَ الْأَعْلَى', transliteration: 'Subhana Rabbiyal-A‘la', meaning: 'Glory be to my Lord, the Most High.', text: 'Prostrate calmly. Sit upright and pause between the two prostrations, then make the second prostration with the same care.', sources: [muslim('772'), muslim('498')] },
  ] },
  { id: 'tashahhud', title: 'Sitting & Tashahhud', cards: [
    { id: 'sitting', title: 'Sit after two rak‘ahs', text: 'Sit for tashahhud after the second rak‘ah. In a three- or four-rak‘ah prayer, stand again to complete the remaining rak‘ahs, then sit for the final tashahhud.', sources: [muslim('498'), prayerOverview] },
    { id: 'testimony', title: 'Learn the words of tashahhud', text: 'The tashahhud includes praise for Allah, greetings of peace and the testimony of faith. Use the linked narration to learn its complete wording.', sources: [bukhari(831)] },
  ] },
  { id: 'salawat', title: 'Salawat · Sending blessings', cards: [
    { id: 'blessings', title: 'Send blessings upon the Prophet ﷺ', text: 'After the final tashahhud, recite the prayer of blessings upon Muhammad ﷺ and his family. The linked narration gives a transmitted wording of the Ibrahimiyyah prayer.', sources: [muslim('406a')] },
  ] },
  { id: 'taslim', title: 'Taslim · Completing the prayer', cards: [
    { id: 'ending', title: 'Close with peace', text: 'Complete the prayer with taslim. Sa‘d reported seeing the Prophet ﷺ turn to the right and to the left when giving salam.', sources: [muslim('582')] },
  ] },
];
