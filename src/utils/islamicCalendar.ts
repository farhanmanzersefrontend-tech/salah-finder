const numericHijri = new Intl.DateTimeFormat('en-GB', {
  calendar: 'islamic-umalqura', day: 'numeric', month: 'numeric', year: 'numeric',
});
const longHijri = new Intl.DateTimeFormat('en-GB', {
  calendar: 'islamic-umalqura', day: 'numeric', month: 'long', year: 'numeric',
});

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
  return longHijri.formatToParts(shiftDate(date, offset))
    .filter(part => part.type === 'month' || part.type === 'year' || (!monthOnly && part.type === 'day'))
    .map(part => part.value).join(' ');
}

export function hijriMonth(date: Date, offset: number) {
  const start = shiftDate(date, 1 - hijriParts(date, offset).day);
  const length = hijriParts(shiftDate(start, 29), offset).day === 1 ? 29 : 30;
  return { start, length };
}
