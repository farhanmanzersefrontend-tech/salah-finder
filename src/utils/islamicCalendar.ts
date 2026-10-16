const numericHijri = new Intl.DateTimeFormat('en-GB', {
  calendar: 'islamic-umalqura', numberingSystem: 'latn', day: 'numeric', month: 'numeric', year: 'numeric',
});

// Use the Hijri month number: some browser locale data returns Gregorian
// names for Islamic months (for example, "May" for Hijri month 5).
const hijriMonthNames = [
  'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul Qa'dah", 'Dhul Hijjah',
];

export function shiftDate(date: Date, days: number) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() + days);
  return result;
}

export function hijriParts(date: Date, offset: number) {
  const parts = numericHijri.formatToParts(shiftDate(date, offset));
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(item => item.type === type)?.value);
  return { day: part('day'), month: part('month'), year: part('year') };
}

export function formatHijri(date: Date, offset: number, monthOnly = false) {
  const { day, month, year } = hijriParts(date, offset);
  const monthAndYear = `${hijriMonthNames[month - 1]} ${year}`;
  return monthOnly ? monthAndYear : `${day} ${monthAndYear}`;
}

export function hijriMonth(date: Date, offset: number) {
  const start = shiftDate(date, 1 - hijriParts(date, offset).day);
  const length = hijriParts(shiftDate(start, 29), offset).day === 1 ? 29 : 30;
  return { start, length };
}
