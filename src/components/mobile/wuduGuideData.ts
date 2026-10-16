import type { PrayerGuideTopic } from './prayerGuideData';

const bukhari = (number: number) => ({ label: `Sahih al-Bukhari ${number}`, url: `https://sunnah.com/bukhari:${number}` });
const muslim = (number: string) => ({ label: `Sahih Muslim ${number}`, url: `https://sunnah.com/muslim:${number}` });
const abuDawud = (number: number) => ({ label: `Sunan Abi Dawud ${number}`, url: `https://sunnah.com/abudawud:${number}` });
const purificationVerse = { label: 'Quran 5:6', url: 'https://quran.com/5/6' };

export const wuduGuideTopics: PrayerGuideTopic[] = [
  { id: 'preparation', title: 'Before you begin', cards: [
    {
      id: 'wudu-purpose', title: 'Prepare for prayer',
      text: 'Wudu is ritual purification before salah. Quran 5:6 instructs believers to wash the face and arms, wipe the head, and wash the feet. The following steps include practices described in the Sunnah.',
      sources: [purificationVerse, bukhari(159)],
    },
    {
      id: 'wudu-intention', title: 'Begin with intention',
      text: 'Intend in your heart to purify yourself for worship. The Prophet ﷺ taught that deeds are judged by intentions. No spoken intention formula is needed for this guide.',
      sources: [bukhari(1)],
    },
    {
      id: 'wudu-bismillah', title: 'Remember Allah at the start',
      arabic: 'بِسْمِ اللَّهِ', transliteration: 'Bismillah', meaning: 'In the name of Allah.',
      text: 'Begin by mentioning Allah’s name. Scholars differ on whether this is obligatory or recommended; follow the guidance of your school.',
      sources: [abuDawud(101)],
    },
  ] },
  { id: 'washing', title: 'Wudu, step by step', cards: [
    {
      id: 'wudu-hands', title: '1. Wash your hands',
      text: 'Wash both hands to the wrists three times. Let water reach the fingers and the whole hand.',
      sources: [bukhari(159), abuDawud(135)],
    },
    {
      id: 'wudu-mouth', title: '2. Rinse your mouth',
      text: 'Take water into your mouth, rinse, and spit it out. Repeat three times, as described in Abdullah ibn Zaid’s demonstration.',
      sources: [bukhari(185)],
    },
    {
      id: 'wudu-nose', title: '3. Rinse your nose',
      text: 'Gently draw water into your nostrils and expel it. Repeat three times without causing discomfort.',
      sources: [bukhari(185)],
    },
    {
      id: 'wudu-face', title: '4. Wash your face',
      text: 'Wash the whole face three times, from the usual hairline to the chin and across to both sides of the face.',
      sources: [purificationVerse, bukhari(159)],
    },
    {
      id: 'wudu-arms', title: '5. Wash your arms',
      text: 'Wash from the fingertips through the elbows, including the elbows. Begin with the right arm, then the left, washing each three times.',
      sources: [purificationVerse, bukhari(159), bukhari(168)],
    },
    {
      id: 'wudu-head', title: '6. Wipe your head',
      text: 'With wet hands, wipe from the front of your head to the back and return to the front. This is wiping, rather than washing. Schools differ on the minimum area required.',
      sources: [purificationVerse, bukhari(185)],
    },
    {
      id: 'wudu-ears', title: '7. Wipe your ears',
      text: 'Gently wipe the inner surfaces of the ears with your index fingers and the backs with your thumbs. Do not push your fingers deeply into the ear canals.',
      sources: [abuDawud(135)],
    },
    {
      id: 'wudu-feet', title: '8. Wash your feet',
      text: 'Wash each foot through the ankles three times, starting with the right. Include the heels and spaces between the toes; do not leave dry patches.',
      sources: [purificationVerse, bukhari(159), bukhari(163), bukhari(168)],
    },
  ] },
  { id: 'afterwards', title: 'Remembrance after wudu', cards: [
    {
      id: 'wudu-shahadah', title: 'The testimony of faith',
      arabic: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
      transliteration: 'Ashhadu an la ilaha illallahu wahdahu la sharika lah, wa ashhadu anna Muhammadan ‘abduhu wa rasuluh.',
      meaning: 'I bear witness that Allah alone is worthy of worship, without any partner, and that Muhammad is His servant and messenger.',
      text: 'Say this after completing wudu. The linked narrations describe this remembrance and the opening of the eight gates of Paradise.',
      sources: [muslim('234b'), muslim('234a')],
    },
    {
      id: 'wudu-two-rakahs', title: 'Pray two rak‘ahs',
      text: 'When appropriate, offer two voluntary rak‘ahs after wudu with an attentive heart. The Prophet ﷺ described a great reward for careful purification followed by focused prayer.',
      sources: [bukhari(159), muslim('234a')],
    },
  ] },
  { id: 'renewal', title: 'When to renew wudu', cards: [
    {
      id: 'wudu-renew', title: 'After a known loss of purity',
      text: 'Passing urine, stool, or wind means you need to renew wudu before salah. Other cases, including sleep, bleeding, and physical contact, have details that differ between schools; ask your trusted teacher about your situation.',
      sources: [purificationVerse, bukhari(135)],
    },
    {
      id: 'wudu-doubt', title: 'Certainty is not removed by doubt',
      text: 'If you know you made wudu, a mere suspicion that you passed wind is not a reason to repeat it. Renew it when you are certain it has been broken; sound or smell are examples of evidence, not the only ways to be certain.',
      sources: [bukhari(137)],
    },
  ] },
  { id: 'care', title: 'Small details, careful wudu', cards: [
    {
      id: 'wudu-washing-count', title: 'Wash thoroughly without excess',
      text: 'Three washes are described for the washed limbs in this guide. A complete single wash is also reported, so three is not the minimum for validity. Wiping the head is a separate action.',
      sources: [bukhari(157), bukhari(159)],
    },
    {
      id: 'wudu-water', title: 'Use water thoughtfully',
      text: 'Use enough water to wash properly without leaving the tap running unnecessarily. Anas reported that the Prophet ﷺ performed wudu using a small measure of water called a mudd.',
      sources: [bukhari(201)],
    },
    {
      id: 'wudu-tayammum', title: 'When water is unavailable',
      text: 'Quran 5:6 describes tayammum when its conditions apply, including lack of water. Illness and other special circumstances need their own guidance; learn the conditions and method from a trusted teacher.',
      sources: [purificationVerse],
    },
  ] },
];
